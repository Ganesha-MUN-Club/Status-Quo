const fs = require('fs');
const path = require('path');
const https = require('https');

const dataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const targetPath = path.join(dataDir, 'countries-110m.json');
const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

console.log('Fetching world topology JSON from jsDelivr CDN...');
https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: Status ${res.statusCode}`);
    return;
  }
  const fileStream = fs.createWriteStream(targetPath);
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    fileStream.close();
    const size = fs.statSync(targetPath).size;
    console.log(`Saved public/data/countries-110m.json (${size} bytes)`);
  });
}).on('error', (err) => {
  console.error('Error fetching countries-110m.json:', err.message);
});
