using Microsoft.WindowsAzure.Storage.Table;
using System;

namespace mechecklist.api
{
    public class CheckDataEntity : TableEntity
    {
        public CheckDataEntity(string PKey, string RKey)
        {
            this.PartitionKey = PKey;
            this.RowKey = RKey;
        }

        public CheckDataEntity() { }

        public DateTime datetime { get; set; }
        public bool done { get; set; }
        public string game { get; set; }
    }
}
