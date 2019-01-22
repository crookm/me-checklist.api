const micro = require("micro");
const sjcl = require("sjcl");
const { parse } = require("url");

require("dotenv").config({ path: "../.env" });

const mongo = require("mongodb").MongoClient;
const client = new mongo(process.env.mongo, { useNewUrlParser: true });
let db, coll;

(async () => {
  await client.connect();
  db = client.db("checkdata");
  coll = db.collection("progress");

  console.info("connected to database");
})();

module.exports = async (req, res) => {
  if (!coll) return micro.send(res, 503, "still connecting to db");

  let query, body;

  try {
    query = parse(req.url, true).query;
    body = await micro.json(req, { limit: "512KB", encoding: "utf8" });
  } catch (ex) {
    console.error(ex);
    return micro.send(res, 400, "malformed body or query");
  }

  if (body.hasOwnProperty("passphrase")) {
    let passphrase_hash = sjcl.hash.sha256.hash(body.passphrase);
    let passphrase = sjcl.codec.hex.fromBits(passphrase_hash);

    let resp = await coll.findOne({ passphrase });
    if (resp) {
      delete resp["passphrase"];
      delete resp["analytics"];
      micro.send(res, 200, resp); // send data to client

      // update analytics in the bg
      coll.updateOne(
        { _id: resp._id },
        {
          $set: { "analytics.read_last": new Date() },
          $inc: { "analytics.read": 1 }
        }
      );
    } else return micro.send(res, 404, "not found");
  } else {
    return micro.send(res, 401, "missing pass");
  }
};
