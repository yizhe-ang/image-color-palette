const fs = require("fs");

const IMG_DIR = "public/imgs/min.snaps_";
const OUTPUT_DIR = "src/components";

// Get all image file paths
const files = fs.readdirSync(IMG_DIR);
const imgFiles = files
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => `imgs/min.snaps_/${f}`);

// Save to JSON
fs.writeFileSync(`${OUTPUT_DIR}/data.json`, JSON.stringify(imgFiles));
