//! This route is for testing purposes only
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const tempDir = path.join(__dirname, "../temp");

router.get("/", (req, res) => {
  fs.readdir(tempDir, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.status(500).send("Error reading directory");
    }
    const fileList = files.map((file) => ({
      name: file.name,
      isDirectory: file.isDirectory(),
    }));

    res.render("temp", { files: fileList });
  });
});

module.exports = router;
