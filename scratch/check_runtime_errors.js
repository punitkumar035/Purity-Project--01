const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file:///C:/Users/punit/OneDrive/Documents/Purity_Sugar/Purity%20Project/index.html',
  beforeParse(window) {
    window.addEventListener('error', (event) => {
      errors.push({ message: event.message, error: event.error });
    });
  }
});

setTimeout(() => {
  console.log('Script error check completed.');
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  } else {
    console.log('Zero runtime errors during page initialization!');
    process.exit(0);
  }
}, 1000);
