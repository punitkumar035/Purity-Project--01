const assert = require('assert');
const { JSDOM } = require('jsdom');

async function main(){
  const dom = await JSDOM.fromFile('index.html', {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });

  await new Promise((resolve, reject)=>{
    dom.window.addEventListener('load', resolve, {once:true});
    dom.window.addEventListener('error', event=>reject(event.error || new Error(event.message)), {once:true});
  });

  const api = dom.window.__APP_TEST_API__;
  assert(api, 'Application test API did not initialize');
  api.createNode('injectionHeater');

  const project = api.snapshot();
  const heater = project.nodes.find(node=>node.type==='injectionHeater');
  assert(heater, 'Injection Heater stencil was not created');

  const components = (water, sucrose, ns1, steamVapour='0')=>({
    water:String(water), ethanolL:'0', sucrose:String(sucrose), invert:'0', ash:'0',
    ns1:String(ns1), ns2:'0', crystals:'0', caco3:'0', cao:'0', fiber:'0',
    steamVapour, ethanolG:'0', co2:'0', ammonia:'0'
  });

  const connector = (source, target, label, mediumClass, mediumRole, props, parts, quantityMode, pressureMode)=>({
    id:`test-${label.toLowerCase().replace(/\s+/g,'-')}`,
    source,
    target,
    manual_segment_offsets:[],
    routing_mode:'AUTO',
    route_points:[],
    properties:{medium_class:mediumClass,medium_role:mediumRole,label,color:null,boundary_intent:'EXTERNAL'},
    props,
    components:parts,
    solubility:{basis:'Cane Values (Typical)',a:'0.04',b:'0.71',c:'-2.1'},
    quantityMode,
    pressureMode,
    solveStatus:'UNSOLVED',
    solverMessage:'',
    requiredPath:[],
    pressurePath:[]
  });

  project.connectors.push(
    connector(
      {type:'point',x:100,y:100},
      {type:'port',station_id:heater.id,port_id:'juice'},
      'Juice Feed','material','Juice',
      {flow:'100000',temperature:'60',pressureAbs:'101.325',brix:'15',purity:'85',purityBasis:'TRUE'},
      components(85,12.75,2.25),'KNOWN','SPECIFIED'
    ),
    connector(
      {type:'point',x:100,y:200},
      {type:'port',station_id:heater.id,port_id:'steam'},
      'Injection Steam','thermal','Steam',
      {flow:'25000',temperature:'143.61',pressureAbs:'400',drynessFraction:'1',steamStateMode:'SATURATED'},
      components(0,0,0,'100'),'KNOWN','SPECIFIED'
    ),
    connector(
      {type:'port',station_id:heater.id,port_id:'juiceOut'},
      {type:'point',x:500,y:150},
      'Heated Juice','material','Heated Juice',
      {flow:'',temperature:'',pressureAbs:'',brix:'',purity:'',purityBasis:'TRUE'},
      components('', '', ''),'CALCULATED','CALCULATED'
    )
  );
  project.pages[0].connectors = project.connectors;

  api.restore(project);
  api.solveNetwork();

  const solved = api.getState();
  const solvedHeater = solved.nodes.find(node=>node.id===heater.id);
  const outlet = solved.connectors.find(stream=>stream.source?.station_id===heater.id && stream.source?.port_id==='juiceOut');

  assert.strictEqual(solvedHeater.solveStatus, 'SOLVED', `Unexpected station status: ${solvedHeater.solveStatus}`);
  assert.strictEqual(outlet.solveStatus, 'CALCULATED');
  assert(Number(outlet.props.flow)>100000, 'Outlet flow should include injected steam');
  assert.strictEqual(Number(outlet.props.temperature), 85);

  console.log('Injection Heater network solve and outlet propagation passed.');
  dom.window.close();
}

main().catch(error=>{
  console.error(error);
  process.exitCode = 1;
});