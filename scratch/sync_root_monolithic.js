const fs = require('fs');

const filePath = 'C:/Users/punit/OneDrive/Documents/Purity_Sugar/massecuite_phase4_8_9_1_centrifugal_solver.html';
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

  [viewport, worldWrap, world, nodesEl, wireLayer].filter(Boolean).forEach(el=>{
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

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  let updated = normalizedContent.replace(normalizedTarget, replacement);

  const oldCss = `.palette-item{
    background:#fff;border:1px solid #dbe7ec;border-radius:10px;padding:9px 10px;
    display:flex;align-items:center;gap:9px;margin-bottom:7px;cursor:grab;box-shadow:0 2px 6px rgba(20,50,70,.025)
  }
  .palette-item:active{cursor:grabbing}`;

  const newCss = `.palette-item{
    background:#fff;border:1px solid #dbe7ec;border-radius:10px;padding:9px 10px;
    display:flex;align-items:center;gap:9px;margin-bottom:7px;cursor:grab;box-shadow:0 2px 6px rgba(20,50,70,.025);
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: element;
    transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  }
  .palette-item:hover{
    border-color: #0284c7;
    background: #f0f9ff;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(2, 132, 199, 0.14);
  }
  .palette-item:active{cursor:grabbing; transform: scale(0.98);}
  .palette-item * {
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none;
  }`;

  updated = updated.replace(oldCss, newCss);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated root massecuite_phase4_8_9_1_centrifugal_solver.html!');
} else {
  console.error('Target not found in root massecuite_phase4_8_9_1_centrifugal_solver.html');
}
