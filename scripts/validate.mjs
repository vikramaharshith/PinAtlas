import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateDevice,pinGeometry} from '../lib.js';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function loadCatalog(){
 const config=JSON.parse(await readFile(path.join(root,'data/config.json'),'utf8'));
 const files=(await readdir(path.join(root,'data/devices'))).filter(f=>f.endsWith('.json')).sort();
 const devices=await Promise.all(files.map(async f=>{
  const d=JSON.parse(await readFile(path.join(root,'data/devices',f),'utf8'));
  const errors=validateDevice(d,config.protocols);
  if(JSON.stringify(d).includes('REPLACE'))errors.push('Unfilled template placeholders');
  if(d.sources?.some(s=>/^https:\/\/(?:example\.com|manufacturer\.example)(?:\/|$)/.test(s.url)))errors.push('Placeholder source URL');
  if(f!==d.id+'.json')errors.push('Filename must match device id');
  const geom=pinGeometry(d);
  for(const p of geom.pins)if(p.x<5||p.x>geom.width-5||p.y<5||p.y>geom.height-5)errors.push(`Pin ${p.id} outside diagram`);
  if(d.layout.style!=='qfp'&&d.pins.some(p=>!['left','right'].includes(p.side)))errors.push('Board / DIP layout supports left and right pins only');
  if(errors.length)throw new Error(`${f}:\n${errors.join('\n')}`);
  return d;
 }));
 if(new Set(devices.map(d=>d.id)).size!==devices.length)throw new Error('Duplicate device ids');
 if(!devices.some(d=>d.id===config.featuredDevice))throw new Error('Featured device missing from catalog');
 for(const [id,p] of Object.entries(config.protocols))if(!/^[A-Z0-9]+$/.test(id)||!/^#[0-9a-f]{6}$/i.test(p.color)||!p.name||!p.description)throw new Error(`Invalid protocol config ${id}`);
 if(!['light','dark','system'].includes(config.defaultTheme)||!['teal','blue','violet'].includes(config.defaultAccent))throw new Error('Invalid default appearance');
 return {config,devices};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {devices}=await loadCatalog();console.log(`Valid: ${devices.length} devices, ${devices.reduce((n,d)=>n+d.pins.length,0)} physical connections.`);}
