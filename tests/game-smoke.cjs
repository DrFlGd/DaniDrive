const fs=require('fs'),vm=require('vm'),assert=require('assert');
let html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');let src=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('  resetRun();\n  requestAnimationFrame(frame);','  globalThis.test={state,keys,update,render,start,pause,resetRun,roadY,roadHalf,carW,depthScale,findSafeRoute,project,worldDepth,approachRate,getSlices:()=>roadSlices};\n  resetRun();');
const gradient={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
const elements={};const el=id=>elements[id]??=( {width:1100,height:680,value:'2',style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},getContext:()=>ctx});
const box={document:{getElementById:el,addEventListener(){},querySelectorAll:()=>[]},window:{addEventListener(){}},localStorage:{getItem(){},setItem(){}},requestAnimationFrame(){},setTimeout(){},Math,console};vm.createContext(box);vm.runInContext(src,box);const t=box.test;
for(let z=.01;z<=1;z+=.01){assert(Math.abs(t.carW(z)/(t.roadHalf(z)*2/5)-1.8/3)<1e-10);assert(Number.isFinite(t.roadY(z)));}t.render();t.start();t.keys.ArrowUp=true;t.keys.ArrowDown=true;let speed=t.state.speed;t.update(1/60);assert(t.state.speed<speed);t.keys.ArrowDown=false;
t.state.spawnIn=100;t.state.traffic=[];for(let i=0;i<500;i++){t.update(1/60);t.render();assert(Number.isFinite(t.state.score));}t.pause();const d=t.state.distance;t.update(.05);assert.equal(t.state.distance,d);t.start();
// Controlled pass and collision fixtures, with spawns disabled.
t.resetRun();t.state.mode='playing';t.state.spawnIn=100;t.state.traffic=[{lane:0,z:.7775,speed:100,style:'sedan',close:false,passed:false}];t.update(.016);assert.equal(t.state.combo,1);assert.equal(t.state.passed,1);
t.state.traffic=[{lane:2,z:.765,speed:100,style:'sedan',close:false,passed:false}];t.update(.016);assert.equal(t.state.armor,2);assert.equal(t.state.combo,0);t.state.traffic[0].z=.7775;t.update(.016);assert.equal(t.state.passed,1);
t.resetRun();assert.equal(t.state.combo,0);assert.equal(t.state.armor,3);t.state.mode='playing';t.state.distance=4.9999;t.state.traffic=[];t.update(.05);assert.equal(t.state.mode,'won');assert.equal(t.state.distance,5);console.log('PASS: projection ratios, rendering smoke, braking priority, pause/resume, clean-pass combo, collision reset, damaged-car exclusion, restart, finish');

// Reciprocal-distance projection and physically correct relative traffic motion.
assert.equal(t.project(40).scale*2,t.project(20).scale);
assert.equal(t.approachRate(100,100),0);
assert(t.approachRate(70,120)<0);
assert(t.approachRate(240,120)>0);
assert(Math.abs(t.approachRate(240,120)*600-120/3.6)<1e-10);
let foundCrest=false,left=false,right=false;
for(let m=0;m<=5000;m+=25){
  t.state.distance=m/1000;t.state.visualLane=2;t.render();
  for(const d of [3,12,30,80,160,300,590]){
    const p=t.project(d);assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.scale>0);
  }
  const player=t.project(12);assert(player.y>500&&player.y<640,'player stays grounded in foreground');
  const bend=t.project(160).x-550;left ||= bend < -40;right ||= bend > 40;
  const slices=t.getSlices();assert(slices.length>=299);
  for(let i=1;i<slices.length;i++)assert(slices[i].clip<=slices[i-1].clip,'hill clip is monotonic');
  foundCrest ||= slices.some(s=>t.project(s.far).y>s.clip+5);
}
assert(foundCrest,'route has occluding crests');assert(left&&right,'route bends in both directions');
t.resetRun();t.state.mode='playing';t.state.spawnIn=100;t.state.traffic=[];
for(const dt of [1/30,1/60,1/144]){
  t.state.speed=200;t.state.traffic=[{lane:0,z:.6,speed:120,style:'sedan',passed:false,close:false}];
  const z=t.state.traffic[0].z;t.update(dt);
  assert(Math.abs(t.state.traffic[0].z-z-t.approachRate(t.state.speed,120)*dt)<1e-12);
}
console.log('PASS: reciprocal depth, relative speed, 5 km geometry sweep, both curve directions, hill occlusion, 30/60/144 Hz traffic motion');
