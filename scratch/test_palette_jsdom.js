const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');

// Set up virtual DOM environment
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file:///C:/Users/punit/OneDrive/Documents/Purity_Sugar/Purity%20Project/index.html'
});

const { window } = dom;
const { document } = window;

// Polyfill missing canvas / SVG methods in JSDOM if needed
window.Element.prototype.getBoundingClientRect = function() {
  return { left: 0, top: 0, right: 1920, bottom: 940, width: 1920, height: 940, x: 0, y: 0 };
};

// Wait for scripts to execute
setTimeout(() => {
  try {
    console.log('Document loaded. Page Title:', document.title);

    const panItem = document.querySelector('.palette-item[data-type="pan"]');
    const evapItem = document.querySelector('.palette-item[data-type="evaporator"]');
    const viewport = document.getElementById('viewport');

    console.log('Pan item found:', !!panItem);
    console.log('Evaporator item found:', !!evapItem);
    console.log('Viewport found:', !!viewport);

    // Test 1: Double-click to place Massecuite Pan
    console.log('\n--- Test 1: Double Click to Add Pan ---');
    const dblClickEv = new window.MouseEvent('dblclick', { bubbles: true, cancelable: true });
    panItem.dispatchEvent(dblClickEv);

    const nodesAfterDblClick = document.querySelectorAll('#nodes .node');
    console.log('Nodes count after dblclick:', nodesAfterDblClick.length);
    if (nodesAfterDblClick.length > 0) {
      console.log('Node 1 title:', nodesAfterDblClick[0].querySelector('.node-title')?.textContent);
    }

    // Test 2: Drag and drop to place Evaporator
    console.log('\n--- Test 2: Drag & Drop to Add Evaporator ---');
    const dragData = {};
    const mockDataTransfer = {
      setData: (k, v) => { dragData[k] = v; },
      getData: (k) => dragData[k] || '',
      effectAllowed: 'copy',
      dropEffect: 'copy'
    };

    const dragStartEv = new window.Event('dragstart', { bubbles: true, cancelable: true });
    dragStartEv.dataTransfer = mockDataTransfer;
    evapItem.dispatchEvent(dragStartEv);
    console.log('Dragstart fired. DataTransfer text:', mockDataTransfer.getData('text/plain'));

    const dropEv = new window.Event('drop', { bubbles: true, cancelable: true });
    dropEv.dataTransfer = mockDataTransfer;
    dropEv.clientX = 500;
    dropEv.clientY = 350;
    viewport.dispatchEvent(dropEv);

    const nodesAfterDrop = document.querySelectorAll('#nodes .node');
    console.log('Nodes count after drag & drop:', nodesAfterDrop.length);
    if (nodesAfterDrop.length > 1) {
      console.log('Node 2 title:', nodesAfterDrop[1].querySelector('.node-title')?.textContent);
    }

    // Test 3: Drop using in-memory fallback (when dataTransfer.getData is empty)
    console.log('\n--- Test 3: In-Memory Fallback Drop (sandboxed browser) ---');
    const crystallizerItem = document.querySelector('.palette-item[data-type="crystallizer"]');
    const emptyDataTransfer = {
      setData: () => {},
      getData: () => '', // Empty! Simulating restrictive file:// browser sandbox
      effectAllowed: 'copy',
      dropEffect: 'copy'
    };

    const dragStartEv2 = new window.Event('dragstart', { bubbles: true, cancelable: true });
    dragStartEv2.dataTransfer = emptyDataTransfer;
    crystallizerItem.dispatchEvent(dragStartEv2);

    const dropEv2 = new window.Event('drop', { bubbles: true, cancelable: true });
    dropEv2.dataTransfer = emptyDataTransfer;
    dropEv2.clientX = 700;
    dropEv2.clientY = 400;
    viewport.dispatchEvent(dropEv2);

    const nodesAfterFallback = document.querySelectorAll('#nodes .node');
    console.log('Nodes count after fallback drop:', nodesAfterFallback.length);
    if (nodesAfterFallback.length > 2) {
      console.log('Node 3 title:', nodesAfterFallback[2].querySelector('.node-title')?.textContent);
    }

    if (nodesAfterFallback.length === 3) {
      console.log('\n[SUCCESS] ALL 3 STATION PLACEMENT MODES VERIFIED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('\n[FAILURE] Station placement count mismatch.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  }
}, 500);
