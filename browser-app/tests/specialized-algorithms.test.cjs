const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = { self: {}, importScripts() {}, console, Math, Uint8Array, Uint32Array, Uint8ClampedArray, Float32Array, Int32Array, Set };
context.self.postMessage = (message) => { context.lastMessage = message; };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'processor-worker.js'), 'utf8').replace("importScripts('./specialized-algorithms.js');", ''), context);
vm.runInContext(fs.readFileSync(path.join(root, 'specialized-algorithms.js'), 'utf8'), context);
const api = vm.runInContext('({ otsu, makeStencilMask, makeSketchTone, edgeAwareSmooth, multiScaleEdges, workspaceProcess, detectEdges })', context);

function fixture(width=48,height=48) {
  const data = new Uint8Array(width*height);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    data[y*width+x] = x < width/2 ? 35 : 220;
    if (x>12 && x<35 && y>12 && y<35) data[y*width+x] = 110;
  }
  return {data,width,height};
}

test('Otsu threshold separates a bimodal grayscale fixture', () => {
  const {data}=fixture();
  const t=api.otsu(data);
  assert.ok(t>35 && t<220, 'threshold should fall between dark and light populations');
});

test('stencil segmentation returns a binary mask with both classes', () => {
  const f=fixture(), mask=api.makeStencilMask(f.data,f.width,f.height,0);
  const values=new Set(mask);
  assert.ok(values.has(0) && values.has(255));
  assert.equal(mask.length,f.width*f.height);
});

test('pencil and crosshatch sketch modes return finite grayscale data', () => {
  const f=fixture();
  for(const variant of ['pencil','charcoal','crosshatch']) {
    const tone=api.makeSketchTone(f.data,f.width,f.height,variant);
    assert.equal(tone.length,f.data.length);
    assert.ok(tone.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
  }
});

test('edge-aware denoising preserves image dimensions and intensity bounds', () => {
  const f=fixture(), out=api.edgeAwareSmooth(f.data,f.width,f.height);
  assert.equal(out.length,f.data.length);
  assert.ok(out.every(v=>v>=0&&v<=255));
});

test('multi-scale detector and each specialised workspace produce correctly sized masks', () => {
  const f=fixture(), settings={low:25,high:70,edgeMethod:'canny',edgeThickness:2,sketchVariant:'pencil',stencilOffset:0};
  const multi=api.multiScaleEdges(f.data,f.width,f.height,settings);
  assert.equal(multi.length,f.data.length);
  for(const mode of ['clean-outline','detailed-outline','bold-outline','sketch','technical-drawing','blueprint','stencil']) {
    const result=api.workspaceProcess(f.data,f.width,f.height,{...settings,workspaceMode:mode});
    assert.ok(ArrayBuffer.isView(result.edge), mode+' must return an edge mask');
    assert.equal(result.edge.length,f.data.length);
    assert.ok(result.tone===f.data || result.tone.length===f.data.length);
  }
});

test('standard edge methods continue to produce correctly sized masks', () => {
  const f=fixture(), settings={low:20,high:65};
  for(const edgeMethod of ['sobel','canny','laplacian']) {
    const out=api.detectEdges(f.data,f.width,f.height,{...settings,edgeMethod});
    assert.equal(out.length,f.data.length);
  }
});

test('worker returns complete synchronized grayscale, edge and output buffers for every preset',()=>{const width=48,height=48,pixels=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=x<24?35:220;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}for(const workspaceMode of ['clean-outline','detailed-outline','bold-outline','stencil','blueprint','technical-drawing','sketch']){context.self.onmessage({data:{id:7,pixels:pixels.buffer.slice(0),width,height,settings:{workspaceMode,style:'outline',edgeMethod:'canny',low:28,high:78,cleanup:1,edgeThickness:2,color:'#38e0bf',contrast:12,brightness:0,stencilOffset:0,autoNormalize:false,invert:false,transparent:false,blueprintGrid:workspaceMode==='blueprint',gridSpacing:32,morphology:'close',sketchVariant:'pencil'}}});const result=context.lastMessage;assert.equal(result.width,width);assert.equal(result.height,height);assert.equal(result.gray.length,width*height);assert.equal(result.edge.length,width*height);assert.equal(result.output.length,width*height*4);}});

test('live edge-map output uses a dark field and adjustable soft edge halo',()=>{
 const width=48,height=48,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=x<24?25:230;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 const run=edgeSoftness=>{context.self.onmessage({data:{id:99,pixels:pixels.buffer.slice(0),width,height,sentAt:123,settings:{workspaceMode:'clean-outline',style:'edge-map',livePreview:true,edgeMethod:'canny',low:18,high:45,cleanup:0,edgeThickness:1,edgeSoftness,color:'#e8eeee',contrast:12,brightness:0,autoNormalize:false,invert:false,transparent:false,blueprintGrid:false}}});return context.lastMessage;};
 const crisp=run(0),soft=run(2);
 assert.equal(crisp.sentAt,123);
 assert.equal(crisp.output.length,width*height*4);
 assert.notDeepEqual(Array.from(crisp.output),Array.from(soft.output));
});

test('live preview bypasses expensive multi-scale still-image algorithms',()=>{
 const width=96,height=128,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=((x>>3)+(y>>3))%2?220:30;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 const original=context.workspaceProcess;
 context.workspaceProcess=()=>{throw new Error('still-image specialised pipeline should not run in live preview');};
 try {
  context.self.onmessage({data:{id:101,pixels:pixels.buffer,width,height,sentAt:456,settings:{workspaceMode:'blueprint',style:'edge-map',livePreview:true,edgeMethod:'canny',low:20,high:60,cleanup:1,edgeThickness:1,edgeSoftness:1,color:'#e8eeee',contrast:10,brightness:0,autoNormalize:false,invert:false,transparent:false,blueprintGrid:false}}});
  const result=context.lastMessage;
  assert.equal(result.sentAt,456);
  assert.equal(result.output.length,width*height*4);
  assert.equal(result.gray.length,width*height);
 } finally { context.workspaceProcess=original; }
});

test('blueprint live preset receives the same anti-aliased edge rendering',()=>{
 const width=40,height=40,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=x<20?15:240;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 const run=edgeSoftness=>{context.self.onmessage({data:{id:102,pixels:pixels.buffer.slice(0),width,height,settings:{workspaceMode:'blueprint',style:'edge-map',livePreview:true,edgeMethod:'canny',low:12,high:30,cleanup:0,edgeThickness:1,edgeSoftness,color:'#e8eeee',contrast:0,brightness:0,autoNormalize:false,invert:false,transparent:false,blueprintGrid:false}}});return context.lastMessage.output;};
 assert.notDeepEqual(Array.from(run(0)),Array.from(run(2)));
});


test('live output is strictly white edges on a pure black background for every preset',()=>{
 const width=64,height=64,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=x<32?18:238;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 for(const workspaceMode of ['clean-outline','detailed-outline','bold-outline','stencil','blueprint','technical-drawing']){
  context.self.onmessage({data:{id:211,pixels:pixels.buffer.slice(0),width,height,settings:{workspaceMode,style:'edge-map',livePreview:true,edgeMethod:'canny',low:12,high:35,cleanup:0,edgeThickness:1,edgeSoftness:0,contrast:0,brightness:0,autoNormalize:false,edgeLinking:70,gapClosing:0,minContourLength:1,color:'#ffffff',transparent:false,invert:false,blueprintGrid:false}}});
  const out=context.lastMessage.output;
  for(let i=0;i<out.length;i+=4){const r=out[i],g=out[i+1],b=out[i+2];assert.ok((r===0&&g===0&&b===0)||(r===255&&g===255&&b===255),workspaceMode+' output must be monochrome');assert.equal(out[i+3],255);}
 }
});

test('Scharr operator produces a linked, correctly sized live edge mask',()=>{
 const width=48,height=48,gray=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)gray[y*width+x]=x<24?20:230;
 const out=context.detectEdges(gray,width,height,{edgeMethod:'scharr',low:8,high:24});
 assert.equal(out.length,width*height);assert.ok(out.some(v=>v===255));
});

test('live contour cleanup applies minimum contour length and gap closing',()=>{
 const width=24,height=24,edge=new Uint8Array(width*height);edge[5*width+5]=255;edge[10*width+5]=255;edge[10*width+6]=255;edge[10*width+7]=255;
 const cleaned=context.liveContourCleanup(edge,width,height,1,3);
 assert.equal(cleaned[5*width+5],0,'isolated point should be removed');
 assert.equal(cleaned.length,width*height);
});


test('low and high thresholds operate independently in connected edge detection',()=>{
 const width=8,height=8,thin=new Uint8Array(width*height);
 thin[3*width+3]=100;
 thin[3*width+4]=40;
 thin[3*width+5]=40;
 const weakLinked=context.hysteresis(thin,width,height,20,80);
 const weakRejected=context.hysteresis(thin,width,height,50,80);
 assert.notDeepEqual(Array.from(weakLinked),Array.from(weakRejected),'changing low threshold alone should include or reject connected weak edges');
 const strongAccepted=context.hysteresis(thin,width,height,20,80);
 const strongRejected=context.hysteresis(thin,width,height,20,120);
 assert.notDeepEqual(Array.from(strongAccepted),Array.from(strongRejected),'changing high threshold alone should change which edges seed the connection');
});
test('Image Studio applies image-specific parameter analysis for each preset',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/function autoTuneForImage\(mode = settings\.workspaceMode\)/);
 for(const mode of ['clean-outline','detailed-outline','bold-outline','sketch','technical-drawing','stencil']) assert.ok(app.includes("'"+mode+"'"),mode+' should have its own tuning profile');
 assert.match(app,/settings\.low = Math\.max\(4,/);
 assert.match(app,/settings\.high = Math\.max\(settings\.low \+ 1,/);
 assert.match(app,/autoTuneForImage\(settings\.workspaceMode\)/);
});

test('Sobel strong-boundary mode and connected Canny mode are distinct',()=>{
 const width=64,height=64,gray=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const base=x<32?35:210;
  gray[y*width+x]=Math.max(0,Math.min(255,base+((x+y)%5===0?18:0)));
 }
 const sobel=api.detectEdges(gray,width,height,{edgeMethod:'sobel',low:24,high:65,autoLinkThresholds:true});
 const canny=api.detectEdges(gray,width,height,{edgeMethod:'canny',low:24,high:65,autoLinkThresholds:true});
 assert.notDeepEqual(Array.from(sobel),Array.from(canny),'Sobel should show direct strong gradients while Canny links weak neighbours');
});

test('adaptive stencil segmentation retains a dark object against a brighter uneven background',()=>{
 const width=80,height=64,gray=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const background=150+Math.round(70*x/(width-1));
  gray[y*width+x]=x>=25&&x<56&&y>=14&&y<51?35:background;
 }
 const mask=api.makeStencilMask(gray,width,height,0);
 let inside=0,outside=0;
 for(let y=20;y<45;y++)for(let x=30;x<50;x++)inside+=mask[y*width+x]===255?1:0;
 for(let y=5;y<10;y++)for(let x=5;x<20;x++)outside+=mask[y*width+x]===255?1:0;
 assert.ok(inside>350,'dark object should be retained as the foreground mask');
 assert.ok(outside<40,'bright background should not become foreground');
});

test('still-image edge-map presets render opaque black backgrounds and white detected edges',()=>{
 const width=64,height=64,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,v=x<32?25:225;
  pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
 }
 for(const workspaceMode of ['clean-outline','detailed-outline','bold-outline','stencil','technical-drawing']){
  context.self.onmessage({data:{id:301,pixels:pixels.buffer.slice(0),width,height,settings:{workspaceMode,style:'edge-map',edgeMethod:'canny',low:12,high:35,cleanup:0,edgeThickness:1,color:'#ffffff',contrast:0,brightness:0,autoNormalize:false,invert:false,transparent:false,blueprintGrid:false,morphology:'off',stencilOffset:0}}});
  const result=context.lastMessage;
  assert.ok(result.edge.some(v=>v===255),workspaceMode+' should detect boundaries');
  for(let i=0;i<result.output.length;i+=4){
   const rgb=[result.output[i],result.output[i+1],result.output[i+2]];
   assert.ok((rgb[0]===0&&rgb[1]===0&&rgb[2]===0)||(rgb[0]===255&&rgb[1]===255&&rgb[2]===255),workspaceMode+' must render monochrome edges');
   assert.equal(result.output[i+3],255,'background must remain opaque');
  }
 }
});


test('mobile Image Studio has one full-width swipe viewer and responsive control tabs',()=>{
 const html=fs.readFileSync(path.join(root,'studio.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(html,/id="frameGrid"/);
 assert.equal((html.match(/data-frame-index=/g)||[]).length,3);
 assert.match(html,/data-control-tab="simple"/);
 assert.match(html,/data-control-tab="medium"/);
 assert.match(html,/data-control-tab="advanced"/);
 assert.match(css,/@media \(max-width:850px\)/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/touch-action:pan-x pan-y/);
 assert.match(css,/\.frames-section\{position:sticky/);
 assert.match(css,/\.quick-presets\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(app,/matchMedia\('\(max-width: 850px\)'\)/);
 assert.match(app,/createImageBitmap\(file/);
});


test('mobile control tabs initialize as a collection and hero copy is removed',()=>{
 const html=fs.readFileSync(path.join(root,'studio.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/const controlTabs = \$\$\('\[data-control-tab\]'\)/);
 assert.match(app,/controlTabs\.forEach\(\(tab\) => tab\.addEventListener\('click'/);
 assert.match(app,/\$\('#file'\)\.addEventListener\('change'/);
 assert.doesNotMatch(html,/IMAGE PROCESSING WORKSPACE|Make boundaries|Compare your original, grayscale, and processed image side by side/);
});


test('Image Studio initializes all frame controls before attaching image upload',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.equal((app.match(/\$\$\('\[data-frame-index\]'\)\.forEach/g)||[]).length,2);
 assert.doesNotMatch(app,/(^|[^$])\$\('\[data-frame-index\]'\)\.forEach/m);
 assert.match(app,/async function loadFile/);
 assert.match(app,/supportedExtension/);
 assert.match(app,/readAsDataURL/);
 assert.match(app,/\$\('#file'\)\.addEventListener\('change'/);
});
test('Live Studio removes obsolete notes and auto-tunes preset thresholds from camera frames',()=>{
 const html=fs.readFileSync(path.join(root,'live.html'),'utf8');
 const live=fs.readFileSync(path.join(root,'live-studio.js'),'utf8');
 const worker=fs.readFileSync(path.join(root,'processor-worker.js'),'utf8');
 assert.doesNotMatch(html,/AR note|<strong>Tip<\/strong>/);
 assert.match(live,/function tunePresetFromFrame/);
 assert.match(live,/autoTunePending/);
 assert.match(live,/percentiles:\[0\.20,0\.64\]/);
 assert.match(worker,/requestedLow/);
});
