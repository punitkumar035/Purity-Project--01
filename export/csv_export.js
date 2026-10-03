/**
 * export/csv_export.js — CSV export for engineering reports.
 *
 * Generates comprehensive CSV reports for mass/energy balance and equipment status.
 * Pure functions on plain objects. No DOM dependencies.
 */

export function generateMassBalanceCSV(state) {
  const streams = state.connectors.map(c => {
    const flow = parseFloat(c.properties?.flow || 0);
    const sucrose = parseFloat(c.components?.sucrose || 0) / 100;
    const water = parseFloat(c.components?.water || 0) / 100;
    const dissolvedSolids = parseFloat(c.components?.invert || 0) / 100
      + parseFloat(c.components?.ash || 0) / 100
      + parseFloat(c.components?.ns1 || 0) / 100
      + parseFloat(c.components?.ns2 || 0) / 100;
    const crystals = parseFloat(c.components?.crystals || 0) / 100;

    return {
      streamId: c.id,
      name: c.name || c.id,
      role: connectorRole(c),
      from: c.fromNodeId || c.source?.station_id || '',
      to: c.toNodeId || c.target?.station_id || '',
      flow,
      sucroseMass: flow * sucrose,
      waterMass: flow * water,
      dissolvedSolidsMass: flow * dissolvedSolids,
      crystalsMass: flow * crystals,
      purity: c.properties?.purity || '',
      temperature: c.properties?.temperature || '',
      pressure: c.properties?.pressureAbs || '',
      solveStatus: c.solveStatus || 'UNSOLVED'
    };
  });

  let csv = 'StreamID,Name,Role,From,To,Flow(kg/h),SucroseMass(kg/h),WaterMass(kg/h),DissolvedSolidsMass(kg/h),CrystalsMass(kg/h),Purity(%),Temperature(°C),Pressure(kPa),Status\n';
  for (const s of streams) {
    csv += `${s.streamId},${escapeCsv(s.name)},${s.role},${s.from},${s.to},${s.flow.toFixed(2)},${s.sucroseMass.toFixed(2)},${s.waterMass.toFixed(2)},${s.dissolvedSolidsMass.toFixed(2)},${s.crystalsMass.toFixed(2)},${s.purity},${s.temperature},${s.pressure},${s.solveStatus}\n`;
  }
  return csv;
}

export function generateEquipmentStatusCSV(state) {
  const nodes = state.nodes.map(n => {
    const params = n.params || {};
    return {
      id: n.id,
      equipmentTag: n.equipmentTag || '—',
      label: n.label || n.type || '—',
      type: n.type,
      stationNumber: n.stationNumber || '—',
      solveStatus: n.solveStatus || 'UNSOLVED',
      parameters: Object.keys(params).length,
      parametersSummary: Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(' | ')
    };
  });

  let csv = 'ID,EquipmentTag,Label,Type,StationNumber,Status,ParameterCount,ParametersSummary\n';
  for (const n of nodes) {
    csv += `${n.id},${n.equipmentTag},${n.label},${n.type},${n.stationNumber},${n.solveStatus},${n.parameters},${n.parametersSummary}\n`;
  }
  return csv;
}

function connectorRole(c) {
  if (!c) return 'UNKNOWN';
  const src = c.source || {};
  const tgt = c.target || {};
  const hasSrcPort = src.type === 'port' && src.station_id && src.port_id;
  const hasTgtPort = tgt.type === 'port' && tgt.station_id && tgt.port_id;
  if (!hasSrcPort && !hasTgtPort) return 'UNCONNECTED';
  if (hasSrcPort && !hasTgtPort) return 'INVALID_TOPOLOGY';
  return 'INTERNAL_FLOW';
}

export { generateMassBalanceCSV, generateEquipmentStatusCSV };