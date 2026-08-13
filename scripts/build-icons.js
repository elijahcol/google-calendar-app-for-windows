// Regenerates the static icon assets (used for the Store tile / .ico / the
// window's default icon before the first daily-icon capture completes) from
// iconTemplate.js. Run with: node scripts/build-icons.js [day]
//
// This does NOT run automatically in CI — it's a one-off you run locally
// whenever you want to change the placeholder day shown on the static
// Store listing icon. Requires the optional "sharp" and "png-to-ico"
// packages (npm install --no-save sharp png-to-ico).

const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = typeof pngToIcoModule === 'function' ? pngToIcoModule : pngToIcoModule.default;
const { renderIconSVG } = require('../iconTemplate');

const day = parseInt(process.argv[2], 10) || new Date().getDate();
const root = path.join(__dirname, '..');

async function main() {
  const svg = renderIconSVG(day);

  // 1024x1024 source PNG — electron-builder generates all Store tile sizes from this.
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(root, 'icon1024.png'));

  // Multi-resolution .ico for the window/taskbar default icon.
  // png-to-ico reads from disk paths, so render a temp 256x256 PNG and let
  // it derive the 48/32/16 sizes internally.
  const tmpPng = path.join(os.tmpdir(), `gcal-icon-${Date.now()}.png`);
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(tmpPng);
  const icoBuffer = await pngToIco(tmpPng);
  fs.writeFileSync(path.join(root, 'icon.ico'), icoBuffer);
  fs.unlinkSync(tmpPng);

  console.log(`Regenerated icon1024.png and icon.ico for day ${day}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
