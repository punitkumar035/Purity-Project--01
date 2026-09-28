const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const regex = /data-type="([^"]+)"/g;
let match;
const types = [];
while ((match = regex.exec(content)) !== null) {
  types.push(match[1]);
}
console.log('Palette data types found in index.html:', types);
