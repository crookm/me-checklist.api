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
    public static class Read
    {
        [FunctionName("Read")]
        public static async Task<IActionResult> RunAsync(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "read/{game}/{link}")]HttpRequest req,
            [Table("checkdata")] CloudTable checkDataTable,
            string game, string link,
            TraceWriter log)
        {
            if (!Validation.GameVersion(game)) return new BadRequestObjectResult("Specified game is invalid.");
            
            Dictionary<int, CheckDataView> storedCheckData = new Dictionary<int, CheckDataView>();

            TableContinuationToken continuationToken = null;
            TableQuery<CheckDataEntity> query = new TableQuery<CheckDataEntity>().Where(
                TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal,
                    $"{Crypto.SHA1($"{link}:-{game}")}::{game}"));

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

            return new OkObjectResult(storedCheckData);
        }
    }
}
