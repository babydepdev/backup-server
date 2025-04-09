const express = require("express");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 8000;
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const { exec } = require("child_process");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*" }));

app.get("/backup", (req, res) => {
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const backupPath = `/tmp/${dayOfWeek}.tar`;

  const dumpCommand = `mongodump --host localhost --port 27017 --archive=${backupPath}.tar`;

  exec(dumpCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("mongodump error:", stderr);
      return res.status(500).json({ error: "Failed to create MongoDB backup" });
    }

    fs.access(backupPath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ error: "Backup file not found" });
      }

      res.download(backupPath, `${dayOfWeek}.tar.gz`, (err) => {
        if (err) {
          console.error("Download error:", err);
          return res.status(500).json({ error: "Failed to download the file" });
        }
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});