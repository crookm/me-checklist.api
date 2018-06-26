
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs.Host;
using Newtonsoft.Json;
using Microsoft.WindowsAzure.Storage.Table;
using System.Collections.Generic;

namespace mechecklist.api
{
    public static class Function1
    {
        [FunctionName("Function1")]
        public static async System.Threading.Tasks.Task<IActionResult> RunAsync([HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)]HttpRequest req, [Table("checkdata")] CloudTable cdata, TraceWriter log)
        {
            log.Info("C# HTTP trigger function processed a request.");

            var querySegment = await cdata.ExecuteQuerySegmentedAsync(new TableQuery<CheckDataEntity>(), null);

            List<CheckDataEntity> entities = new List<CheckDataEntity>();

            foreach (CheckDataEntity item in querySegment.Results)

            {
                entities.Add(item);
            }

            return new OkObjectResult(entities);
        }
    }
}
