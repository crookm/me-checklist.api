using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs.Host;
using Newtonsoft.Json;
using Microsoft.WindowsAzure.Storage.Table;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using mechecklist.api.utility;

namespace mechecklist.api
{
    public static class Write
    {
        [FunctionName("WriteMerge")]
        public static async Task<IActionResult> RunAsync(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "write/merge/{game}/{link}")]HttpRequest req,
            [Table("checkdata")] CloudTable checkDataTable,
            string game, string link,
            TraceWriter log)
        {
            if (!Validation.GameVersion(game)) return new BadRequestObjectResult("Specified game is invalid.");
            string rawBody = await new StreamReader(req.Body).ReadToEndAsync();

            Dictionary<int, CheckDataView> reqCheckData = JsonConvert.DeserializeObject<Dictionary<int, CheckDataView>>(rawBody as string);
            Dictionary<int, CheckDataView> storedCheckData = new Dictionary<int, CheckDataView>();
            Dictionary<int, CheckDataEntity> changedCheckData = new Dictionary<int, CheckDataEntity>();

            string PKey = $"{Crypto.SHA1($"{link}:-{game}")}::{game}";

            TableContinuationToken continuationToken = null;
            TableQuery<CheckDataEntity> query = new TableQuery<CheckDataEntity>().Where(
                TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, PKey));

            do
            {
                TableQuerySegment<CheckDataEntity> segQueryRes = await checkDataTable.ExecuteQuerySegmentedAsync(query, continuationToken);
                continuationToken = segQueryRes.ContinuationToken;

                if (segQueryRes.Results != null)
                {
                    foreach (CheckDataEntity entity in segQueryRes.Results)
                    {
                        storedCheckData.Add(Int32.Parse(entity.RowKey), new CheckDataView { datetime = entity.datetime, done = entity.done });
                    }
                }
            } while (continuationToken != null);

            int updated = 0;
            int inserted = 0;

            TableBatchOperation batchOp = new TableBatchOperation();
            foreach (KeyValuePair<int, CheckDataView> item in reqCheckData)
            {
                if (storedCheckData.ContainsKey(item.Key))
                {
                    if (storedCheckData[item.Key].datetime < item.Value.datetime)
                    {
                        CheckDataEntity entity = new CheckDataEntity(PKey, item.Key.ToString()) {
                            datetime = item.Value.datetime, done = item.Value.done };
                        batchOp.Insert(entity);

                        updated++;
                    }
                }
                else
                {
                    if (item.Key > 512) {
                        return new BadRequestObjectResult("Key is beyond safe range.");
                    }

                    CheckDataEntity entity = new CheckDataEntity(PKey, item.Key.ToString()) {
                        datetime = item.Value.datetime, done = item.Value.done };
                    batchOp.Insert(entity);

                    inserted++;
                }
            }

            await checkDataTable.ExecuteBatchAsync(batchOp);
            return new OkObjectResult(new { updated = updated, inserted = inserted });
        }
    }
}
