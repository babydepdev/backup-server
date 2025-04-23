const express = require("express");
const fs = require("fs");
const path = require("path");
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
  const backupDir = `/var/tmp/${dayOfWeek}`;
  const archivePath = `/var/tmp/${dayOfWeek}.tar.gz`;

  const dumpCommand = `mongodump --host localhost --port 27017 --out=${backupDir}`;

  exec(dumpCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("mongodump error:", stderr);
      return res.status(500).json({ error: "Failed to create MongoDB backup" });
    }

    const tarCommand = `tar -czf ${archivePath} -C /var/tmp ${dayOfWeek}`;

    exec(tarCommand, (tarError, tarStdout, tarStderr) => {
      if (tarError) {
        console.error("Compression error:", tarStderr);
        return res.status(500).json({ error: "Failed to compress backup" });
      }

      fs.access(archivePath, fs.constants.F_OK, (err) => {
        if (err) {
          return res.status(404).json({ error: "Backup archive not found" });
        }

        res.download(archivePath, `${dayOfWeek}.tar.gz`, (downloadErr) => {
          if (downloadErr) {
            console.error("Download error:", downloadErr);
            return res.status(500).json({ error: "Failed to download the file" });
          }

        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});