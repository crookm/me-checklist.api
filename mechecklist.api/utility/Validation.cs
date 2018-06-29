using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Linq;

namespace mechecklist.api.utility
{
    public static class Validation
    {
        public static bool GameVersion(string input)
        {
            string[] validGames = { "1", "2", "3" };
            
            if (!validGames.Contains(input)) return false;
            return true;
        }
    }
}
