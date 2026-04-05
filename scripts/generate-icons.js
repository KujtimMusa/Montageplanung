const sharp = require("sharp");
const fs = require("fs");

if (!fs.existsSync("public/icons")) fs.mkdirSync("public/icons", { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#01696f"/>
  <text x="256" y="340" font-family="Arial Black" font-size="300"
        font-weight="900" text-anchor="middle" fill="white">V</text>
</svg>`;

const buf = Buffer.from(svg);

void (async () => {
  await sharp(buf).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(buf).resize(512, 512).png().toFile("public/icons/icon-512.png");
  console.log("Icons erstellt ✅");
})();
