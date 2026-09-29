/**
 * diagram/routing.js — Orthogonal routing with manual bend/segment handling.
 *
 * Pure functions for connector route computation, bend/segment drag, and
 * auto-route reset. No DOM dependencies.
 */

export function wirePath(a, b) {
  // Fallback straight line between two points
  return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
}

export function segmentOf(vertices, i) {
  // Return the i-th segment as { from, to }
  if (i < 0 || i >= vertices.length - 1) return null;
  return { from: vertices[i], to: vertices[i + 1] };
}

export function orthogonalIntersection(sa, sb) {
  // sa and sb are { from: {x,y}, to: {x,y} } — check if routes cross
  const a1 = sa.from, a2 = sa.to;
  const b1 = sb.from, b2 = sb.to;
  // Simple AABB intersection test on the bounding boxes
  const axMin = Math.min(a1.x, a2.x), axMax = Math.max(a1.x, a2.x);
  const ayMin = Math.min(a1.y, a2.y), ayMax = Math.max(a1.y, a2.y);
  const bxMin = Math.min(b1.x, b2.x), bxMax = Math.max(b1.x, b2.x);
  const byMin = Math.min(b1.y, b2.y), byMax = Math.max(b1.y, b2.y);
  const overlapX = Math.max(0, Math.min(axMax, bxMax) - Math.max(axMin, bxMin));
  const overlapY = Math.max(0, Math.min(ayMax, byMax) - Math.max(ayMin, byMin));
  return overlapX > 0 && overlapY > 0;
}

export function computeConnectorJumps(routeRecords, r = 6) {
  // Given an array of route records, insert jump vertices at crossings
  // each record: { vertices: [...] }
  if (!Array.isArray(routeRecords)) return [];
  return routeRecords.map(rec => {
    const vertices = (rec && rec.vertices) ? [...rec.vertices] : [];
    if (vertices.length < 2) return rec;
    // Simple pass: add jump markers at each vertex (placeholder logic)
    // Real implementation would detect inter-connector crossings
    return rec;
  });
}

export function pathWithJumps(vertices, jumps, r = 6) {
  // Build a path string with optional jump markers at specified indices
  if (!vertices || vertices.length === 0) return '';
  const points = vertices.map((v, i) => `${v.x},${v.y}`);
  if (!jumps || jumps.length === 0) return points.join(' ');
  // Mark segments where jumps exist
  const marked = [];
  for (let i = 0; i < points.length - 1; i++) {
    const hasJump = jumps.some(j => j.fromIdx === i || j.toIdx === i);
    marked.push(hasJump ? `${points[i]} (j)` : points[i]);
  }
  return marked.join(' ');
}

// --- Bend / Segment drag helpers (pure data) ---------------------------

/**
 * Move a bend point at the given index by delta.
 * vertices: array of {x, y} — the connector's route vertices
 * index: which bend point to move (0 = first endpoint, last = other endpoint)
 * dx, dy: displacement
 */
export function moveBendPoint(vertices, index, dx, dy) {
  if (index < 0 || index >= vertices.length) return vertices;
  const v = { ...vertices[index] };
  vertices[index] = { x: v.x + dx, y: v.y + dy };
  return vertices;
}

/**
 * Move a segment point (non-bend vertex) at the given index.
 * In the current Sugar implementation, segment indices skip endpoint indices.
 */
export function moveSegmentPerpendicular(vertices, index, baseIdx, delta) {
  // Move the segment point perpendicular to the segment direction
  if (index < 0 || index >= vertices.length) return vertices;
  const v = vertices[index];
  const bv = vertices[baseIdx];
  const prevV = vertices[index - 1];
  const nextV = vertices[index + 1];
  if (!prevV || !nextV) return vertices;

  // Determine direction vector of the segment
  const dx = nextV.x - prevV.x;
  const dy = nextV.y - prevV.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return vertices;

  // Perpendicular unit vector
  const px = -dy / len;  // perpendicular x
  const py = dx / len;   // perpendicular y

  // Clamp delta to avoid overshoot
  const clampedDelta = Math.max(-200, Math.min(200, delta));
  vertices[index] = { x: v.x + px * clampedDelta, y: v.y + py * clampedDelta };
  return vertices;
}

/**
 * Reset a connector's route to auto-orthogonal path.
 * c: connector object with fromNodePos, toNodePos, params
 */
export function resetConnectorAutoRoute(c) {
  const { fromNodePos, toNodePos } = c.params || {};
  if (!fromNodePos || !toNodePos) return wirePath(fromNodePos, toNodePos);
  return orthogonalBase(fromNodePos.x, fromNodePos.y, toNodePos.x, toNodePos.y, 40);
}

export function orthogonalBase(sx, sy, ex, ey, gap = 40) {
  const dx = ex - sx;
  const dy = ey - sy;
  const midX = sx + dx / 2;
  const midY = sy + dy / 2;
  const offsetX = (dx > 0 ? 1 : dx < 0 ? -1 : 0) * gap;
  const offsetY = (dy > 0 ? 1 : dy < 0 ? -1 : 0) * gap;
  return [
    { x: sx, y: sy },
    { x: midX + offsetX, y: sy },
    { x: midX + offsetX, y: midY + offsetY },
    { x: midX, y: midY + offsetY },
    { x: ex, y: ey }
  ];
}

// --- Manual vertex override helpers ------------------------------

/**
 * Set connector manual vertices entirely.
 * called when user drags bends/segments to new positions.
 * vertices: array of {x, y} representing the full route
 */
export function setConnectorManualVertices(c, vertices) {
  c.params = c.params || {};
  c.params.manualVertices = [...vertices];
}

// Returns whether the connector has a manual (user-overridden) route
export function connectorHasManualRoute(c) {
  return !!(c.params && c.params.manualVertices && c.params.manualVertices.length > 0);
}

// Reset all manual vertices and return to auto-orthogonal
export function resetConnectorManualVertices(c) {
  c.params = c.params || {};
  delete c.params.manualVertices;
}