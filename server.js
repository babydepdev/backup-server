const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 8000;
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const { exec } = require("child_process");
const multer = require("multer");



const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage })

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

app.post("/restore", upload.single("file"), (req, res) => {
  if (!req.file) {
    console.error("No file uploaded");
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  const uploadedFilePath = file.path;
  const restoreDir = path.join(__dirname, "uploads", "restore");

  fs.rm(restoreDir, { recursive: true, force: true }, (rmErr) => {
    if (rmErr) {
      console.error("Failed to clean restore directory:", rmErr);
      return res.status(500).json({ error: "Failed to clean restore directory" });
    }

    fs.mkdir(restoreDir, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        console.error("Failed to create restore directory:", mkdirErr);
        return res.status(500).json({ error: "Failed to create restore directory" });
      }

      const extractCommand = `tar -xzf "${uploadedFilePath}" -C "${restoreDir}"`;
      console.log("Running:", extractCommand);

      exec(extractCommand, (extractErr, stdout, stderr) => {
        if (extractErr) {
          console.error("Extract error:", stderr);
          return res.status(500).json({ error: "Failed to extract archive" });
        }

        console.log("Extracted to:", restoreDir);

        const extractedFolder = path.join(restoreDir, "dump");

        const restoreCommand = `mongorestore --host localhost --port 27017 --dir="${extractedFolder}" --drop`;
        console.log("Running:", restoreCommand);

        exec(restoreCommand, (restoreErr, restoreOut, restoreStderr) => {
          if (restoreErr) {
            console.error("Mongo restore error:", restoreStderr);
            return res.status(500).json({ error: "Failed to restore MongoDB data" });
          }

          console.log("MongoDB restored:", restoreOut);
          return res.json({
            message: "MongoDB data restored successfully",
            extractedTo: restoreDir
          });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});