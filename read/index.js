const mongo = require("mongodb").MongoClient;
const client = new mongo(process.env.mongo, { useNewUrlParser: true });

let db, progress;

exports.read = async (req, res) => {
  res.header("Content-Type", "application/json");

  if (!client.isConnected())
    await client.connect().catch(err => console.error(err));

  db = db || client.db("checkdata");
  progress = progress || db.collection("progress");

  console.log(req.query.test);

  res.send(await progress.findOne({ hi: "there" }));
};
