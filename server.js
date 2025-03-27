const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*" }));

const BASE_DIR = "/";

app.get("/backup", (req, res) => {
  let { pathSource } = req.query;
  if (!pathSource) {
    return res.status(400).json({ error: "File path is required" });
  }

  pathSource = path.join(BASE_DIR, pathSource);

  fs.access(pathSource, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(pathSource, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to send file" });
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});