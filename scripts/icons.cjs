// One-off: renders public/icons/*.png from scripts/icon-source.svg.
// Run with a sharp install on NODE_PATH, e.g. NODE_PATH=../evaru-ra/node_modules node scripts/icons.cjs
const sharp = require('sharp');
const fs = require('node:fs');
const svg = fs.readFileSync('scripts/icon-source.svg');
// "any" icons get rounded corners; the maskable one stays square for the launcher to crop.
const rounded = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#fff"/></svg>`);
(async () => {
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).composite([{ input: rounded(size), blend: 'dest-in' }]).png().toFile(`public/icons/icon-${size}.png`);
  }
  await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png');
  await sharp(svg).resize(180, 180).png().toFile('src/app/apple-icon.png');
})();
