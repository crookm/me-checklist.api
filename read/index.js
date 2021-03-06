const sjcl = require("sjcl");

const mongo = require("mongodb").MongoClient;
const client = new mongo(process.env.mongo, { useNewUrlParser: true });

const valid_games = ["1", "2", "3"];

let db, progress;

exports.read = async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // handle CORS preflight
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "600");
    res.status(204).send("");
  } else {
    res.header("Content-Type", "application/json");
    
    if (!client.isConnected())
      await client.connect().catch(err => {
        console.error(err);
        res.status(500).send({ error: "server" });
      });

    // require passphrase in body
    if (
      !req.body["passphrase"] ||
      !req.query["game"] ||
      !valid_games.includes(req.query["game"])
    )
      return res.status(400).send({ error: "client" });

    db = db || client.db("checkdata");
    progress = progress || db.collection("progress");

    let passphrase = sjcl.codec.hex.fromBits(
      sjcl.hash.sha256.hash(req.body["passphrase"])
    );

    let doc = await progress.findOne(
      { passphrase },
      { project: { [`data.${req.query["game"]}`]: 1 } }
    );

    if (!doc) return res.status(404).send({ error: "not found" });

    res.send(doc["data"][req.query["game"]]); // return the doc

    await progress.updateOne(
      { _id: doc._id },
      {
        $set: { "analytics.read_last": new Date() },
        $inc: { "analytics.read": 1 }
      }
    );
  }
};
