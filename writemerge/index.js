const sjcl = require("sjcl");

const mongo = require("mongodb").MongoClient;
const client = new mongo(process.env.mongo, { useNewUrlParser: true });

const valid_games = ["1", "2", "3"];

let db, progress, list, listdata;

exports.writemerge = async (req, res) => {
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
      !req.body["data"] ||
      !req.query["game"] ||
      !valid_games.includes(req.query["game"])
    )
      return res.status(400).send({ error: "client" });

    db = db || client.db("checkdata");
    progress = progress || db.collection("progress");
    list = list || db.collection("list");

    if (!listdata) listdata = [];
    if (!listdata[req.query["game"]])
      listdata[req.query["game"]] = await list.findOne({ game: req.query["game"] });

    let passphrase = sjcl.codec.hex.fromBits(
      sjcl.hash.sha256.hash(req.body["passphrase"])
    );

    let doc = await progress.findOne(
      { passphrase },
      { project: { [`data.${req.query["game"]}`]: 1 } }
    );

    if (!doc) doc = { passphrase, analytics: {}, data: {} }

    let body = JSON.parse(req.body["data"]);
    let data = doc.data[req.query["game"]] || {};
    let updated = data;

    Object.entries(body).map(([key, entry]) => {
      if (entry["datetime"]) {
        if (!listdata[req.query["game"]]["list"][key]) return; // make sure the key exists for this game
        if (new Date(entry["datetime"]).getTime() === new Date(0).getTime()) return; // only work with initialised dates
        
        if (data[key]) {
          if (new Date(entry["datetime"]) > new Date(data[key]["datetime"])) {
            updated[key] = {
              done: entry["done"],
              datetime: new Date(entry["datetime"])
            };
          } else {
            updated[key] = {
              done: data[key]["done"],
              datetime: new Date(data[key]["datetime"])
            };
          }
        } else {
          updated[key] = {
            done: entry["done"],
            datetime: new Date(entry["datetime"])
          };
        }
      }
    });

    res.send(updated);

    await progress.updateOne(
      { passphrase },
      {
        $set: {
          passphrase,
          [`data.${req.query["game"]}`]: updated,
          "analytics.write_last": new Date()
        },
        $inc: { "analytics.write": 1 }
      },
      { upsert: true }
    );
  }
};
