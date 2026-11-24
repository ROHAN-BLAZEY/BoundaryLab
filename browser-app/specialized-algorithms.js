function edgeAwareSmooth(gray, width, height) {
  const out = new Uint8Array(gray.length);
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=y*width+x, center=gray[i]; let sum=0, weights=0;
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
      const xx=Math.max(0,Math.min(width-1,x+dx)), yy=Math.max(0,Math.min(height-1,y+dy));
      const v=gray[yy*width+xx], w=Math.exp(-(dx*dx+dy*dy)/4)*Math.exp(-((v-center)*(v-center))/800);
      sum+=v*w; weights+=w;
    }
    out[i]=Math.round(sum/weights);
  }
  return out;
}
function multiScaleEdges(gray,width,height,settings) {
  const fine=detectEdges(gray,width,height,{...settings,edgeMethod:'canny',low:Math.max(4,settings.low*.65),high:Math.max(12,settings.high*.72)});
  const coarse=detectEdges(smooth(gray,width,height,2),width,height,{...settings,edgeMethod:'sobel',low:Math.max(8,settings.low*1.15)});
  const out=new Uint8Array(fine.length);
  for(let i=0;i<out.length;i++) if(fine[i]||coarse[i]) out[i]=255;
  return out;
}
function cleanSpecks(edge,width,height,minNeighbors=3) {
  const out=edge.slice();
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
    const i=y*width+x; let n=0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(edge[i+dy*width+dx]) n++;
    if(edge[i]&&n<minNeighbors) out[i]=0;
  }
  return out;
}
function otsu(gray) {
  const hist=new Uint32Array(256); for(const v of gray) hist[v]++;
  let total=gray.length,sum=0; for(let i=0;i<256;i++) sum+=i*hist[i];
  let sumB=0,weightB=0,best=-1,tBest=128;
  for(let t=0;t<256;t++) {
    weightB+=hist[t]; if(!weightB) continue;
    const weightF=total-weightB; if(!weightF) break;
    sumB+=t*hist[t];
    const variance=weightB*weightF*(sumB/weightB-(sum-sumB)/weightF)**2;
    if(variance>best) {best=variance;tBest=t;}
  }
  return tBest;
}
function makeStencilMask(gray,width,height,offset=0) {
  const threshold=Math.max(0,Math.min(255,otsu(gray)+offset)), mask=new Uint8Array(gray.length);
  let dark=0,light=0; for(const v of gray) {if(v<threshold) dark++; else light++;}
  const darkForeground=dark<=light;
  for(let i=0;i<mask.length;i++) if(darkForeground?gray[i]<threshold:gray[i]>=threshold) mask[i]=255;
  const seen=new Uint8Array(mask.length), queue=new Int32Array(mask.length), minArea=Math.max(3,Math.round(mask.length*.00008));
  for(let start=0;start<mask.length;start++) {
    if(!mask[start]||seen[start]) continue;
    let head=0,tail=0; queue[tail++]=start; seen[start]=1;
    while(head<tail) {
      const i=queue[head++],x=i%width,y=(i-x)/width;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
        const xx=x+dx,yy=y+dy; if(xx<0||xx>=width||yy<0||yy>=height||(!dx&&!dy)) continue;
        const j=yy*width+xx; if(mask[j]&&!seen[j]) {seen[j]=1;queue[tail++]=j;}
      }
    }
    if(tail<minArea) for(let j=0;j<tail;j++) mask[queue[j]]=0;
  }
  return mask;
}
function makeSketchTone(gray,width,height,variant='pencil') {
  const inverted=new Uint8Array(gray.length);
  for(let i=0;i<gray.length;i++) inverted[i]=255-gray[i];
  const blur=smooth(inverted,width,height,3), tone=new Uint8Array(gray.length);
  for(let i=0;i<tone.length;i++) {
    const dodge=Math.min(255,Math.round(gray[i]*255/Math.max(1,255-blur[i])));
    let v=variant==='charcoal'?Math.round(dodge*.72+gray[i]*.28):dodge;
    const x=i%width,y=(i-x)/width;
    if(variant==='crosshatch'&&((x+y)%9<2||(x-y+width)%11<2)&&gray[i]<205) v=Math.min(v,45);
    tone[i]=v;
  }
  return tone;
}
function workspaceProcess(gray,width,height,settings) {
  const mode=settings.workspaceMode||'standard'; let edge=null,tone=gray;
  if(mode==='clean-outline') {
    edge=detectEdges(edgeAwareSmooth(gray,width,height),width,height,{...settings,edgeMethod:'canny',low:Math.max(10,settings.low),high:Math.max(settings.low+18,settings.high)});
    edge=refineEdges(edge,width,height,'close',2);
  } else if(mode==='detailed-outline') {
    edge=multiScaleEdges(gray,width,height,settings);
    const textureSensitivity=Math.max(0,Math.min(100,Number(settings.textureSensitivity)||0));
    if(textureSensitivity>0) {
      const texture=detectEdges(gray,width,height,{...settings,edgeMethod:'laplacian',low:Math.max(2,Math.round(34-textureSensitivity*.3)),high:255});
      for(let i=0;i<edge.length;i++) if(texture[i]) edge[i]=255;
    }
    edge=cleanSpecks(refineEdges(edge,width,height,'close',1),width,height,textureSensitivity>65?2:3);
  }
  else if(mode==='bold-outline') edge=thickenEdges(cleanSpecks(refineEdges(detectEdges(smooth(gray,width,height,1),width,height,{...settings,edgeMethod:'canny'}),width,height,'close',2),width,height,2),width,height,Math.max(2,settings.edgeThickness));
  else if(mode==='sketch') {tone=makeSketchTone(gray,width,height,settings.sketchVariant||'pencil');edge=detectEdges(gray,width,height,{...settings,edgeMethod:'sobel'});}
  else if(mode==='technical-drawing'||mode==='blueprint') edge=cleanSpecks(refineEdges(multiScaleEdges(gray,width,height,settings),width,height,'close',2),width,height,2);
  else if(mode==='stencil') {
    tone=makeStencilMask(gray,width,height,Number(settings.stencilOffset)||0);
    tone=thickenEdges(tone,width,height,Math.max(1,Number(settings.edgeThickness)||1));
    edge=new Uint8Array(tone.length);
    for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
      const i=y*width+x,v=tone[i];
      if(v!==tone[i-1]||v!==tone[i+1]||v!==tone[i-width]||v!==tone[i+width]) edge[i]=255;
    }
  }
  return {edge,tone};
}
function blueprintGrid(output,width,height,settings) {
  if(!settings.blueprintGrid) return;
  const step=Math.max(12,Math.round(Number(settings.gridSpacing)||32));
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(x%step===0||y%step===0) {
    const i=(y*width+x)*4; output[i]=Math.min(255,output[i]+9);output[i+1]=Math.min(255,output[i+1]+16);output[i+2]=Math.min(255,output[i+2]+24);
  }
}

function drawSheetFrame(output,width,height,blueprint=false) {
  const color=blueprint?[235,246,245]:[24,24,24];
  const inset=Math.max(4,Math.round(Math.min(width,height)*0.025));
  const put=(x,y)=>{
    if(x<0||x>=width||y<0||y>=height)return;
    const i=(y*width+x)*4;
    output[i]=color[0];output[i+1]=color[1];output[i+2]=color[2];output[i+3]=255;
  };
  const rect=(x1,y1,x2,y2)=>{
    for(let x=x1;x<=x2;x++){put(x,y1);put(x,y2);}
    for(let y=y1;y<=y2;y++){put(x1,y);put(x2,y);}
  };
  rect(inset,inset,width-inset-1,height-inset-1);
  if(width>160&&height>120){
    const blockW=Math.round(width*.28),blockH=Math.round(height*.09);
    const x1=width-inset-blockW,y1=height-inset-blockH,x2=width-inset-1,y2=height-inset-1;
    rect(x1,y1,x2,y2);
    const splitX=Math.round(x1+blockW*.62),splitY=Math.round(y1+blockH*.55);
    for(let y=y1;y<=y2;y++)put(splitX,y);
    for(let x=x1;x<=x2;x++)put(x,splitY);
  }
}
