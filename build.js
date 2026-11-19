// node build.js → writes Index.html (single self-contained file; assets stay in ./v3/)
const fs=require('fs');const t=fs.readFileSync(__dirname+'/src/template.html','utf8');
const css=fs.readFileSync(__dirname+'/src/style.css','utf8');
const js=fs.readFileSync(__dirname+'/src/engine.js','utf8')+'\n'+fs.readFileSync(__dirname+'/src/app.js','utf8');
fs.writeFileSync(__dirname+'/Index.html',t.replace('/*__CSS__*/',()=>css).replace('/*__JS__*/',()=>js.replace(/<\/script>/g,'<\\/script>')));
console.log('Index.html',(fs.statSync(__dirname+'/Index.html').size/1024).toFixed(0)+' KB');
