const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const mainJs = fs.readFileSync('js/main.js', 'utf8');

const regex = /data-type="([^"]+)"/g;
const dataTypes = [];
let match;
while ((match = regex.exec(indexHtml)) !== null) {
  dataTypes.push(match[1]);
}

console.log('Total palette data-types:', dataTypes.length);
console.log('Palette data-types:', dataTypes);

// Check nodeDefs keys
const defsMatch = mainJs.match(/const nodeDefs\s*=\s*\{([\s\S]*?)\n  \};/);
if (!defsMatch) {
  console.log('Could not find nodeDefs in js/main.js');
} else {
  const defsBody = defsMatch[1];
  const missing = [];
  dataTypes.forEach(t => {
    if (t === 'universalFlow') return;
    const hasKey = new RegExp('^\\s*' + t + '\\s*:', 'm').test(defsBody);
    if (!hasKey) missing.push(t);
  });
  console.log('Missing data-types from nodeDefs:', missing);
}
