// Runs the REAL Code.gs inside Node with in-memory Google service stubs.
// usage: node gas_sim.js            → self-test
//        node gas_sim.js serve 8790 → local /exec endpoint backed by Code.gs (for browser tests)
const fs=require('fs'),vm=require('vm'),http=require('http'),crypto=require('crypto');
function colToN(s){let n=0;for(const c of s)n=n*26+c.charCodeAt(0)-64;return n}
function a1(s,sh){const m=/^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(s);const c1=colToN(m[1]),r1=+(m[2]||1),c2=m[3]?colToN(m[3]):c1,r2=m[4]?+m[4]:(m[3]?1000:r1);return[r1,c1,r2-r1+1,c2-c1+1]}
function mkSheet(name){const d=[];const sh={name,data:d,
 getLastRow(){let l=d.length;while(l>0&&(d[l-1]||[]).every(v=>v===''||v==null))l--;return l},
 getLastColumn(){return d.reduce((m,r)=>Math.max(m,(r||[]).length),0)},
 getRange(r,c,nr=1,nc=1){if(typeof r==='string'){[r,c,nr,nc]=a1(r,sh)}
  const rg={getValues(){const out=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++)row.push(((d[r-1+i]||[])[c-1+j])??'');out.push(row)}return out},
   getValue(){return(((d[r-1]||[])[c-1])??'')},
   setValue(v){(d[r-1]=d[r-1]||[])[c-1]=v;return rg},
   setValues(vs){vs.forEach((row,i)=>row.forEach((v,j)=>{(d[r-1+i]=d[r-1+i]||[])[c-1+j]=v}));return rg},
   setFormula(f){return rg.setValue(f)},setFormulas(fs){return rg.setValues(fs)}};
  ['setFontWeight','setBackground','setFontSize','setNumberFormat'].forEach(k=>rg[k]=()=>rg);return rg},
 appendRow(row){d.push(row)},setFrozenRows(){},clear(){d.length=0},clearConditionalFormatRules(){},setConditionalFormatRules(){},autoResizeColumns(){}};return sh}
const sheets={};const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=mkSheet(n)),getId:()=>'sim',getUrl:()=>'sim://sheet',toast(){}};
const props={OPENAI_API_KEY:'sk-sim',TEACHER_TOKEN:'tt'};const cache={};
const ctx={console:{log:console.log,warn(){},error(){}},Date,Math,JSON,String,Number,Array,Object,isFinite,parseFloat,Buffer,
 SpreadsheetApp:{getActiveSpreadsheet:()=>ss,getUi(){throw new Error('no ui')},create:()=>ss,openById:()=>ss,InterpolationType:{NUMBER:1},
  newConditionalFormatRule(){const o={};['setGradientMaxpointWithValue','setGradientMinpointWithValue','setRanges'].forEach(k=>o[k]=()=>o);o.build=()=>({});return o}},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v}})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=v}})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Utilities:{getUuid:()=>crypto.randomUUID(),base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:(b,t,n)=>({b,t,n})},
 UrlFetchApp:{fetch:(u,o)=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({text:ctx.__HEARD||'pizza'})})},
 ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({s,setMimeType(){return this},getContent:()=>s})},
 HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this},addMetaTag(){return this},setXFrameOptionsMode(){return this}}),XFrameOptionsMode:{ALLOWALL:1}},
 DriveApp:{}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../Code.gs','utf8'),ctx);
const post=o=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(o)}}).getContent());
const get=p=>JSON.parse(ctx.doGet({parameter:p}).getContent());
if(process.argv[2]==='serve'){
 ctx.setup();
 http.createServer((q,r)=>{const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};if(q.method==='OPTIONS'){r.writeHead(204,{...cors,'Access-Control-Allow-Headers':'*'});return r.end()}
  if(q.method==='GET'){const u=new URL(q.url,'http://x');r.writeHead(200,cors);return r.end(ctx.doGet({parameter:Object.fromEntries(u.searchParams)}).getContent())}
  let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{const j=JSON.parse(b);if(j.__heard!==undefined)ctx.__HEARD=j.__heard;const out=ctx.doPost({postData:{contents:b}}).getContent();r.writeHead(200,cors);r.end(out)}catch(e){r.writeHead(200,cors);r.end(JSON.stringify({ok:false,error:String(e)}))}});
 }).listen(+process.argv[3]||8790,()=>console.log('Code.gs sim on '+(process.argv[3]||8790)));
 setInterval(()=>{},1e9);
 http.createServer((q,r)=>{r.writeHead(200,{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'});r.end(JSON.stringify({L:sheets.Learners.data,E:sheets.Events.data,M:sheets.Mastery.data}))}).listen(8791);
} else {
 let pass=0,fail=0;const t=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
 ctx.setup();
 t('tabs created',['Learners','Events','Mastery','Words','Dashboard'].every(n=>sheets[n]));
 const i1=post({action:'init',id:'abc12345',code:'pizza-taxi-bus',cls:'TEENS',ua:'test'});t('init ok + keeps client code',i1.ok&&i1.code==='pizza-taxi-bus');
 const i2=post({action:'init',id:'zzz99999',code:'pizza-taxi-bus'});t('code collision fixed',i2.ok&&i2.code!=='pizza-taxi-bus');
 const i3=post({action:'init',id:'abc12345',code:'x'});t('init idempotent',i3.ok&&i3.existing&&i3.code==='pizza-taxi-bus');
 const sy=post({action:'sync',id:'abc12345',events:[{ts:Date.now(),type:'tap',word:'pizza',correct:1,misses:0,ms:1200,lesson:1,session:'s1'},{type:'tap',word:'pizza',correct:0},{type:'say',word:'taxi',correct:1,engine:'sr',heard:'taxi',score:1}],state:{xp:40,stars:{1:3,2:2},learned:['pizza','taxi'],streak:2,mic:{label:'USB Mic'}}});
 t('sync ok',sy.ok&&sy.saved===3);t('events appended',sheets.Events.getLastRow()===4);
 const lr=sheets.Learners.data[1];t('learner row updated (xp/stars/words)',lr[6]===40&&lr[7]===5&&lr[8]===2&&lr[9]===2);
 t('mic label saved',lr[13]==='USB Mic');t('mastery rows',sheets.Mastery.getLastRow()===3);
 const rs=post({action:'restore',code:'pizza-taxi-bus'});t('restore returns state',rs.ok&&rs.id==='abc12345'&&rs.state.learned.length===2);
 t('restore wrong code',post({action:'restore',code:'bus-bus-bus'}).error==='not_found');
 t('restore invalid code',post({action:'restore',code:'hack'}).error==='bad_code');
 const aud=Buffer.alloc(4000,1).toString('base64');
 for(const [w,heard,exp] of [['pizza','Pizza.',true],['pizza','pitsa',true],['taxi','tacksi',true],['coffee','kofi',true],['banana','banana banana',true],['hotel','hotel',true],['pizza','bus',false],['robot','',false],['water','car',false],['pizza','pasta',false]]){
  ctx.__HEARD=heard;const r=post({action:'speak',id:'abc12345',word:w,audio:aud,mime:'audio/webm;codecs=opus'});
  t(`speak "${w}" heard "${heard}" → ${exp?'pass':'fail'} (score ${r.score})`,r.ok&&(r.silent?false:r.pass===exp)||(!exp&&r.ok&&!r.pass))}
 t('speak bad word rejected',post({action:'speak',id:'abc12345',word:'hack',audio:aud}).error==='bad_word');
 t('speak oversized rejected',post({action:'speak',id:'abc12345',word:'pizza',audio:Buffer.alloc(800*1024,1).toString('base64')}).error==='too_big');
 t('tiny audio = silent',post({action:'speak',id:'abc12345',word:'pizza',audio:Buffer.alloc(100,1).toString('base64')}).silent===true);
 ctx.__HEARD='pizza';
 const alias=post({action:'speak',id:'alias1',word:'pizza',audioBase64:aud,mimeType:'audio/webm'});
 t('speak accepts audioBase64 and mimeType',alias.ok&&alias.pass===true&&alias.heard==='pizza');
 props.OPENAI_API_KEY='';t('no key handled',post({action:'speak',id:'abc12345',word:'pizza',audio:aud}).error==='no_key');props.OPENAI_API_KEY='sk-sim';
 t('stats needs token',get({action:'stats'}).error==='forbidden');const st=get({action:'stats',token:'tt'});t('stats with token',st.ok&&st.learners.length===2);
 t('ping',get({action:'ping'}).ok);
 let limited=false;for(let i=0;i<20;i++){const r=post({action:'speak',id:'rl1',word:'pizza',audio:aud});if(r.error==='slow_down')limited=true}t('speak rate limit',limited);
 console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
}
