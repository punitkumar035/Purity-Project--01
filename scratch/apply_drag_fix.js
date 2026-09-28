const fs = require('fs');

const filePath = 'js/main.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  // Drag from palette to canvas
  document.querySelectorAll('.palette-item').forEach(item=>{
    item.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',item.dataset.type);
      e.dataTransfer.effectAllowed='copy';
    });
  });
  viewport.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
  viewport.addEventListener('drop',e=>{
    e.preventDefault();
    const type=e.dataTransfer.getData('text/plain');
    const rect=world.getBoundingClientRect();
    const x=(e.clientX-rect.left)/zoom;
    const y=(e.clientY-rect.top)/zoom;
    if(type==='universalFlow')createUniversalFlowStencil(x,y);
    else createNode(type,x-95,y-45);
  });`;

const replacement = `  // Robust Drag and Drop + Quick-Placement from Palette to Canvas
  let activeDraggedStencil = null;

  function placeStencilOnCanvas(type, clientX, clientY){
    if(!type) return;
    const rect = world.getBoundingClientRect();
    let x, y;
    if(Number.isFinite(clientX) && Number.isFinite(clientY)){
      x = (clientX - rect.left) / zoom;
      y = (clientY - rect.top) / zoom;
    } else {
      // Place near visible center of viewport
      const vpRect = viewport.getBoundingClientRect();
      const rawX = ((vpRect.width / 2) + viewport.scrollLeft - (rect.left - vpRect.left + viewport.scrollLeft)) / zoom;
      const rawY = ((vpRect.height / 2) + viewport.scrollTop - (rect.top - vpRect.top + viewport.scrollTop)) / zoom;
      const stagger = ((state.nodes.length + 1) % 7) * 26;
      x = (Number.isFinite(rawX) && rawX > 60 && rawX < WORLD_W - 100) ? rawX + stagger : (420 + stagger);
      y = (Number.isFinite(rawY) && rawY > 60 && rawY < WORLD_H - 100) ? rawY + stagger : (260 + stagger);
    }
    if(type === 'universalFlow') createUniversalFlowStencil(x, y);
    else createNode(type, x - 95, y - 45);
  }

  document.querySelectorAll('.palette-item').forEach(item=>{
    item.addEventListener('dragstart',e=>{
      activeDraggedStencil = item.dataset.type;
      try {
        e.dataTransfer.setData('application/x-sugar-stencil', item.dataset.type);
        e.dataTransfer.setData('text/plain', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      } catch(_) {}
    });

    item.addEventListener('dragend', ()=>{
      activeDraggedStencil = null;
    });

    // Double-click to instantly insert at canvas center
    item.addEventListener('dblclick', e=>{
      e.preventDefault();
      placeStencilOnCanvas(item.dataset.type);
    });

    const palName = item.querySelector('.pal-name')?.textContent || 'Station';
    item.title = \`Drag to canvas or double-click to add \${palName}\`;
  });

  function handleCanvasDrag(e){
    e.preventDefault();
    if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  function handleCanvasDrop(e){
    e.preventDefault();
    e.stopPropagation();
    let type = null;
    try {
      type = e.dataTransfer?.getData('application/x-sugar-stencil') ||
             e.dataTransfer?.getData('text/plain') ||
             e.dataTransfer?.getData('text');
    } catch(_) {}
    if(!type) type = activeDraggedStencil;
    if(!type) return;

    placeStencilOnCanvas(type, e.clientX, e.clientY);
    activeDraggedStencil = null;
  }

  [viewport, worldWrap, world, nodesEl, wiresEl].forEach(el=>{
    if(!el) return;
    el.addEventListener('dragenter', handleCanvasDrag);
    el.addEventListener('dragover', handleCanvasDrag);
    el.addEventListener('drop', handleCanvasDrop);
  });

  document.addEventListener('dragover', e=>{
    if(activeDraggedStencil && viewport && viewport.contains(e.target)){
      e.preventDefault();
      if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    }
  });

  document.addEventListener('drop', e=>{
    if(activeDraggedStencil && viewport && viewport.contains(e.target)){
      handleCanvasDrop(e);
    }
  });`;

// Normalize line endings for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const updated = normalizedContent.replace(normalizedTarget, replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated js/main.js with enhanced drag-and-drop & double-click placement!');
} else {
  console.error('Target not found in js/main.js');
}
