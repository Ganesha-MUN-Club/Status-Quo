const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimize() {
  const root = path.join(__dirname, '..');
  const logoPath = path.join(root, 'public', 'gmunc-logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found');
    return;
  }

  console.log('Original gmunc-logo.png size:', fs.statSync(logoPath).size, 'bytes');

  // 1. Optimize gmunc-logo.png keeping 566x566 sharp quality with PNG compression level 9
  const optimizedLogoBuffer = await sharp(logoPath)
    .png({ compressionLevel: 9, quality: 100, palette: true })
    .toBuffer();

  console.log('Optimized gmunc-logo.png size:', optimizedLogoBuffer.length, 'bytes');
  fs.writeFileSync(logoPath, optimizedLogoBuffer);

  // 2. Create sharp favicon icons (64x64 and 128x128)
  const icon128Buffer = await sharp(logoPath)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  const icon64Buffer = await sharp(logoPath)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  fs.writeFileSync(path.join(root, 'src', 'app', 'icon.png'), icon128Buffer);
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icon64Buffer);
  fs.writeFileSync(path.join(root, 'src', 'app', 'favicon.ico'), icon64Buffer);

  console.log('src/app/icon.png size:', icon128Buffer.length, 'bytes');
  console.log('public/favicon.ico size:', icon64Buffer.length, 'bytes');
  console.log('src/app/favicon.ico size:', icon64Buffer.length, 'bytes');
}

optimize().catch(err => console.error(err));
