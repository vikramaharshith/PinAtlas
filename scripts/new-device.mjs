import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './validate.mjs';
const id=process.argv[2];
if(!id||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)){console.error('Usage: node scripts/new-device.mjs model-package\nExample: node scripts/new-device.mjs my-mcu-pdip8');process.exit(1);}
const template={schemaVersion:1,id,name:'REPLACE: exact model',manufacturer:'REPLACE: manufacturer',kind:'chip',family:'REPLACE: family',processor:'REPLACE: processor',description:'REPLACE: concise description',layout:{style:'dip',variant:'REPLACE: package or board revision',accent:'#485369',orientation:'Top view. REPLACE: orientation and pin 1 position.'},specs:{core:'REPLACE',clock:'REPLACE',flash:'REPLACE',sram:'REPLACE',logic:'REPLACE'},pins:[{id:'1',label:'REPLACE',type:'gpio',gpio:null,side:'left',position:0,functions:[],notes:''}],notes:['REPLACE: configuration limitations and package notes'],sources:[{title:'REPLACE: manufacturer reference',url:'https://example.com/replace-with-manufacturer-reference'}],reviewed:new Date().toISOString().slice(0,10),coverage:'REPLACE: precisely describe which pins and functions were verified.'};
const filename=path.join(root,'data/devices',id+'.json');
await writeFile(filename,JSON.stringify(template,null,2)+'\n',{flag:'wx'});
console.log(`Created ${filename}. Replace all placeholder values and verify the physical pin map before building.`);
