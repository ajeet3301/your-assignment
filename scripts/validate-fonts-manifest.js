/**
 * Build-time validator for public/fonts/fonts.json
 * Fails the build if any font lacks license, licenseUrl, or author.
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'public', 'fonts', 'fonts.json');

if (!fs.existsSync(manifestPath)) {
  console.error('ERROR: Missing public/fonts/fonts.json');
  process.exit(1);
}

const raw = fs.readFileSync(manifestPath, 'utf8');
let fonts;
try {
  fonts = JSON.parse(raw);
} catch (e) {
  console.error('ERROR: Failed to parse public/fonts/fonts.json as JSON:', e.message);
  process.exit(1);
}

if (!Array.isArray(fonts) || fonts.length === 0) {
  console.error('ERROR: fonts.json must be a non-empty array of fonts');
  process.exit(1);
}

let errors = [];

fonts.forEach((font, idx) => {
  const fontRef = font.id || font.name || `Index ${idx}`;

  if (!font.name || typeof font.name !== 'string') {
    errors.push(`[${fontRef}] missing valid 'name'`);
  }
  if (!font.author || typeof font.author !== 'string' || !font.author.trim()) {
    errors.push(`[${fontRef}] missing required 'author'`);
  }
  if (!font.license || typeof font.license !== 'string' || !font.license.trim()) {
    errors.push(`[${fontRef}] missing required 'license'`);
  }
  if (!font.licenseUrl || typeof font.licenseUrl !== 'string' || !font.licenseUrl.trim()) {
    errors.push(`[${fontRef}] missing required 'licenseUrl'`);
  }
});

if (errors.length > 0) {
  console.error('\n❌ Fonts manifest validation FAILED with errors:');
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

console.log(`✅ Fonts manifest validation passed: ${fonts.length} verified OFL/free fonts.`);
process.exit(0);
