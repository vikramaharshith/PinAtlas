export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));

export function protocolsFor(device) {
  return [...new Set(device.pins.flatMap(p => p.functions.map(f => f.protocol)))];
}

export function matchingFunctions(pin, selected = [], instance = '', defaultsOnly = false) {
  return pin.functions.filter(f => (!selected.length || selected.includes(f.protocol)) && (!instance || f.instance === instance) && (!defaultsOnly || f.mapping !== 'routable'));
}

export function filterDevices(devices, {query='', kind='', manufacturer='', protocol=''}={}) {
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return devices.filter(d => (!kind || d.kind===kind) && (!manufacturer || d.manufacturer===manufacturer) && (!protocol || protocolsFor(d).includes(protocol)) && words.every(w => [d.name,d.manufacturer,d.processor,d.family,d.description,d.layout.variant,...protocolsFor(d)].join(' ').toLowerCase().includes(w)));
}

export function pinGeometry(device) {
  const qfp = device.layout.style === 'qfp';
  const counts = Object.fromEntries(['left','right','top','bottom'].map(s => [s, Math.max(0,...device.pins.filter(p=>p.side===s).map(p=>p.position+1))]));
  const width = qfp ? 700 : 620;
  const height = qfp ? 700 : Math.max(400,Math.max(counts.left,counts.right)*27+145);
  const body = qfp ? {x:200,y:200,w:300,h:300} : {x:230,y:58,w:160,h:height-116};
  const gap=qfp?23:27;
  const pins=device.pins.map(p=>{
    let x,y;
    if(p.side==='left'||p.side==='right') {x=p.side==='left'?body.x:body.x+body.w;y=(qfp?223:91)+p.position*gap;}
    else {x=223+p.position*gap;y=p.side==='top'?body.y:body.y+body.h;}
    return {...p,x,y};
  });
  return {width,height,body,pins};
}

export function validateDevice(d, protocols) {
  const errors=[];
  for(const key of ['id','name','manufacturer','kind','family','processor','description','coverage','reviewed']) if(typeof d[key]!=='string'||!d[key].trim()) errors.push(`Missing ${key}`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.id))errors.push('Invalid device id');
  if(d.schemaVersion!==1)errors.push('Unsupported schemaVersion');
  if(!['board','chip'].includes(d.kind))errors.push('Invalid kind');
  if(!['board','dip','qfp'].includes(d.layout?.style))errors.push('Invalid layout style');
  for(const k of ['variant','orientation','accent']) if(!d.layout?.[k]) errors.push(`Missing layout.${k}`);
  if(!/^#[0-9a-f]{6}$/i.test(d.layout?.accent||'')) errors.push('Invalid board accent');
  if(!d.specs||typeof d.specs!=='object'||!Object.keys(d.specs).length) errors.push('Missing specs');
  if(!Array.isArray(d.notes))errors.push('Missing notes');
  if(!Array.isArray(d.pins)||!d.pins.length) return [...errors,'No pins'];
  const ids=new Set(),positions=new Set();
  for(const p of d.pins) {
    if(typeof p.id!=='string'||!p.id||ids.has(p.id))errors.push(`Missing or duplicate pin id ${p.id}`);ids.add(p.id);
    if(typeof p.label!=='string'||!p.label)errors.push(`Pin ${p.id} missing label`);
    if(!['gpio','input','analog','ground','power','control','reserved','nc'].includes(p.type)) errors.push(`Pin ${p.id} invalid type`);
    if(!['left','right','top','bottom'].includes(p.side)||!Number.isInteger(p.position)||p.position<0)errors.push(`Pin ${p.id} invalid position`);
    const key=p.side+':'+p.position;if(positions.has(key)) errors.push(`Overlapping pin ${p.id}`);positions.add(key);
    if(!Array.isArray(p.functions)) {errors.push(`Pin ${p.id} missing functions`);continue;}
    for(const f of p.functions) {
      if(!Object.hasOwn(protocols,f.protocol)) errors.push(`Unknown protocol ${f.protocol}`);
      if(typeof f.signal!=='string'||!f.signal||typeof f.instance!=='string'||!f.instance)errors.push(`Pin ${p.id} invalid function`);
      if(!['fixed','alternate','default','routable','usi'].includes(f.mapping))errors.push(`Pin ${p.id} invalid mapping`);
    }
  }
  if(!Array.isArray(d.sources)||!d.sources.length)errors.push('Missing manufacturer sources');
  else for(const s of d.sources)if(!s.title||!/^https:\/\//.test(s.url))errors.push('Invalid source');
  return errors;
}
