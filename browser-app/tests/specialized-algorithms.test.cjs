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
