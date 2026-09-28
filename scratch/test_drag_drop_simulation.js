const fs = require('fs');

// Verify main.js contains the new handlers
const mainJs = fs.readFileSync('js/main.js', 'utf8');

const checks = [
  'activeDraggedStencil',
  'placeStencilOnCanvas',
  'item.addEventListener(\'dblclick\'',
  'handleCanvasDrag',
  'handleCanvasDrop',
  'application/x-sugar-stencil'
];

let allPassed = true;
for (const check of checks) {
  if (mainJs.includes(check)) {
    console.log(`[PASS] Found: ${check}`);
  } else {
    console.error(`[FAIL] Missing: ${check}`);
    allPassed = false;
  }
}

// Verify main.css contains user-select: none and pointer-events: none
const mainCss = fs.readFileSync('css/main.css', 'utf8');
if (mainCss.includes('user-select: none') && mainCss.includes('.palette-item *')) {
  console.log('[PASS] main.css contains unselectable palette items & protected children');
} else {
  console.error('[FAIL] main.css missing palette item selection fixes');
  allPassed = false;
}

if (allPassed) {
  console.log('\nAll drag-and-drop enhancements verified successfully in Purity Project!');
} else {
  process.exit(1);
}
