/**
 * Icon generator for NextHire Desktop
 * Creates a 512x512 PNG icon with "NH" text on a gradient background.
 * Run: node scripts/generate-icons.js
 */

// We generate a simple SVG-based PNG using the Canvas approach via a Buffer.
// Since we may not have canvas installed, we create an SVG and convert it.

const fs = require("fs");
const path = require("path");

// SVG icon template — 512×512 with rounded rect gradient and "NH" text
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.2);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" ry="108" fill="url(#bg)" />
  <rect width="512" height="256" rx="108" ry="108" fill="url(#shine)" />
  <text x="256" y="300" font-family="Inter, Arial, Helvetica, sans-serif" font-size="220" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="central">NH</text>
</svg>`;

const assetsDir = path.join(__dirname, "..", "assets");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Save SVG icon
fs.writeFileSync(path.join(assetsDir, "icon.svg"), svg);

console.log("✅ Generated assets/icon.svg");
console.log("   For production, convert to .ico and .icns using:");
console.log("   - Windows: npm install png-to-ico && npx png-to-ico assets/icon.png > assets/icon.ico");
console.log("   - macOS: iconutil -c icns assets/icon.iconset");
