const { createCanvas } = require("canvas");
const fs = require("node:fs");
const canvas = createCanvas(960, 960);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, 960, 960);
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("test-image.png", buffer);
console.log("Created 960x960 PNG");
