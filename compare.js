import {escapeHtml as e, protocolsFor} from './lib.js';

const STORAGE_KEY='pinatlas:comparison';
const main=document.querySelector('#main');
let catalog=[], selected=[], cache=new Map(), loaded=false;
const labels={core:'CPU / architecture',clock:'Clock frequency',flash:'Flash memory',sram:'SRAM',eeprom:'EEPROM',logic:'Logic / supply voltage',gpio:'GPIO',adc:'ADC',connectivity:'Interfaces',wireless:'Wireless',usb:'USB',programming:'Programming'};
const safe=(value)=>e(value==null||value===''?'—':typeof value==='object'?JSON.stringify(value):value);
const ids=()=>new Set(catalog.map(d=>d.id));
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(selected));}catch{}}
function notify(message){document.querySelector('.compare-message')?.remove();const el=document.createElement('div');el.className='compare-message';el.setAttribute('role','status');el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),2600);}
function toggle(id){
 if(!ids().has(id))return;
 selected=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];
 save();decorate();
 if(location.hash==='#/compare')renderCompare();
}
function countText(){return selected.length+' selected';}
function decorate(){
 const path=location.hash.slice(1)||'/';
 if(path==='/compare')return;
 document.querySelectorAll('#device-results .device-card').forEach(card=>{
   if(card.parentElement.classList.contains('compare-card-wrap'))return;
   const id=decodeURIComponent((card.getAttribute('href')||'').split('/device/')[1]||'');
   if(!ids().has(id))return;
   const wrapper=document.createElement('div');
   wrapper.className='compare-card-wrap';
   card.replaceWith(wrapper);wrapper.append(card);
   const button=document.createElement('button');
   button.type='button';button.className='compare-add';button.dataset.compareId=id;
   wrapper.append(button);
 });
 document.querySelectorAll('[data-compare-id]').forEach(button=>{
   const active=selected.includes(button.dataset.compareId);
   button.textContent=active?'✓ Added to compare':'+ Add to compare';
   button.classList.toggle('is-selected',active);
   button.setAttribute('aria-pressed',String(active));
   button.setAttribute('aria-label',(active?'Remove from':'Add to')+' comparison');
 });
 const actions=document.querySelector('.detail-actions');
 if(actions && !actions.querySelector('.detail-compare')){
   const id=(location.hash.split('/device/')[1]||'');
   if(ids().has(id)){
     const button=document.createElement('button');button.type='button';button.className='button-link detail-compare';button.dataset.compareId=id;actions.prepend(button);
   }
 }
 const old=document.querySelector('#comparison-tray');
 if(!selected.length){old?.remove();return;}
 const tray=old||document.createElement('div');
 tray.id='comparison-tray';tray.className='comparison-tray';tray.setAttribute('role','region');tray.setAttribute('aria-label','Comparison selection');
 tray.innerHTML='<span><strong>'+countText()+'</strong> for comparison</span><div><button id="clear-comparison" type="button">Clear</button><a class="compare-open" href="#/compare">Compare now →</a></div>';
 if(!old)document.body.append(tray);
}
async function getDevice(id){
 if(cache.has(id))return cache.get(id);
 const response=await fetch('./data/devices/'+encodeURIComponent(id)+'.json');
 if(!response.ok)throw new Error('Cannot load '+id);
 const data=await response.json();cache.set(id,data);return data;
}
function heading(id){
 const record=catalog.find(d=>d.id===id);
 return record?.name||id;
}
async function renderCompare(){
 if(location.hash!=='#/compare')return;
 document.title='Compare devices — Pin Atlas';
 main.innerHTML='<section class="compare-page"><div class="eyebrow">SIDE-BY-SIDE DEVICE COMPARISON</div><h1>Compare microcontrollers</h1><p>Choose any catalog entries to compare specifications, interfaces, and pin capabilities. Scroll horizontally to see more devices.</p><div class="compare-toolbar"><label for="compare-picker">Add a device</label><select id="compare-picker"><option value="">Choose a catalog entry…</option>'+catalog.filter(d=>!selected.includes(d.id)).map(d=>'<option value="'+e(d.id)+'">'+e(d.name)+'</option>').join('')+'</select><button type="button" id="compare-clear-all" class="button-link">Clear all</button><a class="button-link" href="#/">← Browse catalog</a></div><div id="compare-content" aria-live="polite">Loading comparison…</div></section>';
 const picker=main.querySelector('#compare-picker');
 picker.addEventListener('change',()=>{if(picker.value)toggle(picker.value);});
 main.querySelector('#compare-clear-all').addEventListener('click',()=>{selected=[];save();renderCompare();});
 document.querySelector('#comparison-tray')?.remove();
 const slot=main.querySelector('#compare-content');
 if(!selected.length){slot.innerHTML='<div class="compare-empty"><h2>No devices selected yet</h2><p>Add any board or MCU from the dropdown above, or select devices from the catalog.</p><a class="button-link primary" href="#/">Explore devices →</a></div>';return;}
 try{
   const devices=await Promise.all(selected.map(getDevice));
   if(location.hash!=='#/compare')return;
   const keys=[...new Set(devices.flatMap(d=>Object.keys(d.specs||{})))];
   const common=['core','clock','flash','sram','eeprom','logic','gpio','adc','connectivity','wireless','usb','programming'];
   keys.sort((a,b)=>(common.indexOf(a)<0?999:common.indexOf(a))-(common.indexOf(b)<0?999:common.indexOf(b))||a.localeCompare(b));
   const protocols=[...new Set(devices.flatMap(protocolsFor))].sort();
   const fields=[
     ['General','Manufacturer',d=>d.manufacturer],
     ['General','Type',d=>d.kind==='board'?'Development board':'Microcontroller chip'],
     ['General','Family',d=>d.family],
     ['General','Processor',d=>d.processor],
     ['General','Variant / package',d=>d.layout?.variant],
     ['General','Connections / pins',d=>d.pins?.length],
     ...keys.map(key=>['Technical specifications',labels[key]||key,d=>d.specs?.[key]]),
     ...protocols.map(p=>['Supported protocols',p,d=>{const n=d.pins.filter(pin=>pin.functions.some(f=>f.protocol===p)).length;return n?n+' pins':'—';}])
   ];
   let last='';
   const rows=fields.map(([section,label,read])=>{
     let divider='';if(section!==last){last=section;divider='<tr class="compare-section-row"><th colspan="'+(devices.length+1)+'" scope="colgroup">'+e(section)+'</th></tr>';}
     return divider+'<tr><th scope="row">'+e(label)+'</th>'+devices.map(d=>'<td>'+safe(read(d))+'</td>').join('')+'</tr>';
   }).join('');
   slot.innerHTML='<p class="compare-summary">'+devices.length+' '+(devices.length===1?'device':'devices')+' selected · Pin function counts represent catalog mappings, not guaranteed simultaneous use.</p><div class="compare-scroll" tabindex="0" aria-label="Scrollable device comparison"><table class="compare-table"><thead><tr><th scope="col">Specification</th>'+devices.map(d=>'<th scope="col"><div class="compare-column-heading"><a href="#/device/'+e(d.id)+'">'+e(d.name)+'</a><small>'+e(d.manufacturer)+'</small><button type="button" class="compare-remove" data-remove-id="'+e(d.id)+'" aria-label="Remove '+e(d.name)+' from comparison">Remove ×</button></div></th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
   slot.querySelectorAll('[data-remove-id]').forEach(b=>b.addEventListener('click',()=>toggle(b.dataset.removeId)));
 }catch(error){slot.innerHTML='<div class="compare-empty"><h2>Could not load comparison</h2><p>'+e(error.message)+'</p><button class="button-link" id="compare-retry">Try again</button></div>';slot.querySelector('#compare-retry').addEventListener('click',renderCompare);}
}
function sync(){
 if(!loaded)return;
 if(location.hash==='#/compare'){
   if(!main.querySelector('.compare-page'))renderCompare();
 }else decorate();
}
document.addEventListener('click',event=>{
 const add=event.target.closest('[data-compare-id]');
 if(add){event.preventDefault();toggle(add.dataset.compareId);return;}
 if(event.target.closest('#clear-comparison')){selected=[];save();decorate();}
});
const observer=new MutationObserver(()=>sync());
observer.observe(main,{childList:true,subtree:true});
window.addEventListener('hashchange',()=>queueMicrotask(sync));
(async()=>{
 try{
   const res=await fetch('./data/catalog.json');if(!res.ok)throw new Error('Catalog unavailable');
   const index=await res.json();catalog=index.devices||[];
   try{const persisted=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(persisted))selected=[...new Set(persisted.filter(x=>typeof x==='string'&&ids().has(x)))];}catch{}
   loaded=true;sync();
 }catch(error){console.warn('Compare feature unavailable:',error);}
})();
