const sjcl = require("sjcl");

const mongo = require("mongodb").MongoClient;
const client = new mongo(process.env.mongo, { useNewUrlParser: true });

const valid_games = ["1", "2", "3"];

let db, progress;

exports.writemerge = async (req, res) => {
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

  let passphrase = sjcl.codec.hex.fromBits(
    sjcl.hash.sha256.hash(req.body["passphrase"])
  );

  let doc = await progress.findOne(
    { passphrase },
    { project: { [`data.${req.query["game"]}`]: 1 } }
  );

  if (!doc) return res.status(404).send({ error: "not found" });

  let data = doc.data[req.query["game"]];
  let updated = {};

  Object.entries(req.body["data"]).map(([key, entry]) => {
    if (data[key]) { // do we have something stored with this key already?
      if (entry["datetime"] && data[key]["datetime"]) {
        if (new Date(entry["datetime"]) > new Date(data[key]["datetime"])) {
          // user data newer than db, take its value
          updated[key] = {
            done: entry["done"],
            datetime: entry["datetime"]
          };
        } else {
          // db data still relevant otherwise
          updated[key] = {
            done: data[key]["done"],
            datetime: data[key]["datetime"]
          };
        }
      } else if (!entry["datetime"] && data[key]["datetime"]) {
        // user data doesn't have a date (not toggled yet), but the db has data
        updated[key] = {
          done: data[key]["done"],
          datetime: data[key]["datetime"]
        };
      }
    } else { // db doesn't know about this key, store it
      updated[key] = {
        done: entry["done"] || false,
        datetime: entry["datetime"] || new Date(0)
      };
    }
  });

  res.send(updated);

  await progress.updateOne(
    { _id: doc._id },
    {
      $set: {
        [`data.${req.query["game"]}`]: updated,
        "analytics.write_last": new Date()
      },
      $inc: { "analytics.write": 1 }
    }
  );
};
