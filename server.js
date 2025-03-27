const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 8000;
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*" }));

const BASE_DIR = path.join(__dirname);

app.post("/backup", (req, res) => {
  let { path: filePath, moveTo } = req.body;

  if (!filePath || !moveTo) {
    return res.status(400).json({ error: "Both path and moveTo are required" });
  }

  filePath = path.join(BASE_DIR, filePath);
  const dirPath = path.dirname(filePath);

  const moveToPath = path.join(BASE_DIR, moveTo);
  const moveToDir = path.dirname(moveToPath);

  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to create directory" });
    }

    // สร้างไฟล์
    fs.writeFile(filePath, "Analogysads", (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create file" });
      }

      fs.mkdir(moveToDir, { recursive: true }, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Failed to create move-to directory" });
        }

        fs.rename(filePath, moveToPath, (err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to move file" });
          }
          res.json({
            message: "File moved successfully",
            from: filePath,
            to: moveToPath,
          });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
