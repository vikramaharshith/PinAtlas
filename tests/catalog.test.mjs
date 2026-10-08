import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadCatalog} from '../scripts/validate.mjs';
import {filterDevices,matchingFunctions,pinGeometry,validateDevice,escapeHtml} from '../lib.js';
const {config,devices}=await loadCatalog();
const device=id=>devices.find(d=>d.id===id);
test('every catalog file validates and all advertised pins have unique positions',()=>{for(const d of devices)assert.deepEqual(validateDevice(d,config.protocols),[],d.id);});
test('search combines words with type, manufacturer and interface filters',()=>{
 assert.deepEqual(filterDevices(devices,{query:'pico rp2040',manufacturer:'Raspberry Pi',kind:'board',protocol:'UART'}).map(d=>d.id).sort(),['raspberry-pi-pico','raspberry-pi-pico-w']);
 assert.equal(filterDevices(devices,{kind:'chip',query:'uno'}).length,1); // UNO is mentioned in the bare-chip description.
 assert.equal(filterDevices(devices,{protocol:'UART',query:'ATtiny'}).length,0);
 assert.equal(filterDevices(devices,{query:'not-a-real-device'}).length,0);
});
test('UNO UART, SPI, I2C are highlighted correctly, including duplicate I2C headers',()=>{
 const uno=device('arduino-uno-r3');
 const labels=p=>uno.pins.filter(pin=>matchingFunctions(pin,[p]).length).map(p=>p.label).sort();
 assert.deepEqual(labels('UART'),['D0','D1']);assert.deepEqual(labels('SPI'),['D10','D11','D12','D13']);assert.deepEqual(labels('I2C'),['A4','A5','SCL','SDA']);
});
test('Nano A6/A7 do not advertise digital GPIO or I2C',()=>{for(const l of ['A6','A7']){const p=device('arduino-nano-classic').pins.find(p=>p.label===l);assert.equal(p.type,'analog');assert.deepEqual(p.functions.map(f=>f.protocol),['ADC']);}});
test('Pico physical numbering is not confused with GPIO numbering',()=>{
 const pico=device('raspberry-pi-pico');
 assert.equal(pico.pins.find(p=>p.id==='1').label,'GP0');assert.equal(pico.pins.find(p=>p.id==='31').label,'GP26');assert.equal(pico.pins.find(p=>p.id==='40').label,'VBUS');
 const uart0=pico.pins.filter(p=>matchingFunctions(p,['UART'],'UART0').length).map(p=>p.label);
 assert.ok(uart0.includes('GP0'));assert.ok(uart0.includes('GP1'));assert.ok(!uart0.includes('GP4'));
 const geom=pinGeometry(pico);assert.equal(geom.pins.find(p=>p.id==='40').y,geom.pins.find(p=>p.id==='1').y);assert.ok(geom.pins.find(p=>p.id==='21').y>geom.pins.find(p=>p.id==='40').y);
});
test('ESP32 default-only highlighting excludes routable candidates and flash pins',()=>{
 const esp=device('esp32-devkitc-v4-wroom32');
 assert.deepEqual(esp.pins.filter(p=>matchingFunctions(p,['SPI'],'',true).length).map(p=>p.label).sort(),['GPIO18','GPIO19','GPIO23','GPIO5']);
 for(const g of [6,7,8,9,10,11]){const p=esp.pins.find(p=>p.label==='GPIO'+g);assert.equal(p.type,'reserved');assert.equal(matchingFunctions(p,['SPI']).length,0);}
 assert.equal(matchingFunctions(esp.pins.find(p=>p.label==='GPIO21'),['I2C'],'',true)[0].signal,'SDA');
});
test('USI mode is explicit and tinyAVR does not claim hardware UART',()=>{for(const d of devices.filter(d=>d.family==='tinyAVR')){assert.equal(d.pins.flatMap(p=>matchingFunctions(p,['UART'])).length,0);assert.ok(d.pins.flatMap(p=>matchingFunctions(p,['I2C'])).every(f=>f.mapping==='usi'));}});
test('STM32 QFP numbering follows top-view counterclockwise convention',()=>{
 const d=device('stm32f103c8t6-lqfp48'),g=pinGeometry(d),p=id=>g.pins.find(p=>p.id===id);
 assert.equal(p('1').label,'VBAT');assert.equal(p('48').label,'VDD');assert.equal(p('1').side,'left');assert.equal(p('13').side,'bottom');assert.equal(p('25').side,'right');assert.equal(p('37').side,'top');assert.ok(p('1').y<p('12').y);assert.ok(p('25').y>p('36').y);assert.ok(p('37').x>p('48').x);
 assert.deepEqual(d.pins.filter(p=>matchingFunctions(p,['UART'],'USART1').length).map(p=>p.label),['PA9','PA10']);
});
test('validation rejects duplicate pins, overlapping positions and unknown functions',()=>{
 const d=structuredClone(device('attiny85-pdip8'));d.pins[1].id=d.pins[0].id;d.pins[1].position=d.pins[0].position;d.pins[1].functions.push({protocol:'UNVERIFIED',signal:'?',instance:'?',mapping:'fixed'});
 const errors=validateDevice(d,config.protocols);assert.ok(errors.some(e=>e.includes('duplicate')));assert.ok(errors.some(e=>e.includes('Overlapping')));assert.ok(errors.some(e=>e.includes('Unknown protocol')));
});
test('text fields are escaped before HTML rendering',()=>assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;'));
test('all catalog links and imports are relative for GitHub project subpaths',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(!/\b(?:src|href)="\/(?!\/)/.test(html));
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');assert.ok(app.includes("read('./data/config.json')"));assert.ok(app.includes('#/device/'));
});
