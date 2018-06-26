using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace mechecklist.api.utility
{
    public static class Crypto
    {
        public static string SHA1(string input)
        {
            using (SHA1Managed sha1 = new SHA1Managed())
            {
                var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
                var sb = new StringBuilder(hash.Length * 2);

                foreach (byte b in hash)
                {
                    // "X2": uppercase, "x2": lowercase
                    sb.Append(b.ToString("x2"));
                }

                return sb.ToString();
            }
        }
    }
}
