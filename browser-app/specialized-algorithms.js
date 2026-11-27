function edgeAwareSmooth(gray,width,height){
  const out=new Uint8Array(gray.length);
  const spatial=[1,2,1];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,center=gray[i];let sum=0,weightSum=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=Math.max(0,Math.min(width-1,x+dx)),yy=Math.max(0,Math.min(height-1,y+dy));
      const value=gray[yy*width+xx],difference=Math.abs(value-center);
      const rangeWeight=difference<12?1:difference<28?.55:difference<52?.2:.06;
      const weight=spatial[dx+1]*spatial[dy+1]*rangeWeight;
      sum+=value*weight;weightSum+=weight;
    }
    out[i]=Math.round(sum/Math.max(.001,weightSum));
  }
  return out;
}
function multiScaleEdges(gray,width,height,settings){
  const low=Math.max(4,Number(settings.low)||0),high=Math.max(low+1,Number(settings.high)||low+1);
  const method=settings.edgeMethod||'canny';
  const fine=detectEdges(gray,width,height,{...settings,edgeMethod:method,low:Math.max(4,low*.72),high:Math.max(12,high*.78)});
  const coarse=detectEdges(smooth(gray,width,height,1),width,height,{...settings,edgeMethod:method,low:Math.max(12,low*1.25)});
  const out=fine.slice(),support=dilate(fine,width,height);
  for(let i=0;i<out.length;i++)if(coarse[i]&&support[i])out[i]=255;
  return out;
}
function cleanSpecks(edge,width,height,minNeighbors=3){
  const out=edge.slice();
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;if(!edge[i])continue;let n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(edge[i+dy*width+dx])n++;
    if(n<minNeighbors)out[i]=0;
  }
  return out;
}
function otsu(gray){
  const hist=new Uint32Array(256);for(const v of gray)hist[v]++;
  const total=gray.length;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
  let sumB=0,weightB=0,best=-1,threshold=128;
  for(let t=0;t<256;t++){weightB+=hist[t];if(!weightB)continue;const weightF=total-weightB;if(!weightF)break;sumB+=t*hist[t];const meanB=sumB/weightB,meanF=(sum-sumB)/weightF;const variance=weightB*weightF*(meanB-meanF)*(meanB-meanF);if(variance>best){best=variance;threshold=t;}}
  return threshold;
}
function makeStencilMask(gray,width,height,offset=0){
  // Hybrid global/local thresholding keeps useful object structure in uneven lighting.
  const globalThreshold=Math.max(1,Math.min(254,otsu(gray)+Number(offset||0)));
  const integral=new Float64Array((width+1)*(height+1));
  for(let y=1;y<=height;y++){
    let rowSum=0;
    for(let x=1;x<=width;x++){
      rowSum+=gray[(y-1)*width+x-1];
      integral[y*(width+1)+x]=integral[(y-1)*(width+1)+x]+rowSum;
    }
  }
  const radius=Math.max(4,Math.min(24,Math.round(Math.min(width,height)*.035)));
  const borderStep=Math.max(1,Math.floor(Math.min(width,height)/48));
  let borderSum=0,borderCount=0,centerSum=0,centerCount=0;
  for(let y=0;y<height;y+=borderStep)for(let x=0;x<width;x+=borderStep){
    const v=gray[y*width+x];
    if(x<radius||y<radius||x>=width-radius||y>=height-radius){borderSum+=v;borderCount++;}
    else if(x>width*.2&&x<width*.8&&y>height*.2&&y<height*.8){centerSum+=v;centerCount++;}
  }
  const borderMean=borderSum/Math.max(1,borderCount),centerMean=centerSum/Math.max(1,centerCount);
  const darkForeground=borderMean>=centerMean;
  const mask=new Uint8Array(gray.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const x1=Math.max(0,x-radius),x2=Math.min(width-1,x+radius),y1=Math.max(0,y-radius),y2=Math.min(height-1,y+radius),stride=width+1;
    const area=(x2-x1+1)*(y2-y1+1);
    const localSum=integral[(y2+1)*stride+x2+1]-integral[y1*stride+x2+1]-integral[(y2+1)*stride+x1]+integral[y1*stride+x1];
    const localMean=localSum/area;
    const threshold=Math.max(1,Math.min(254,globalThreshold*.58+localMean*.42));
    const value=gray[y*width+x];
    if(darkForeground?value<threshold:value>=threshold)mask[y*width+x]=255;
  }
  // If local contrast creates an implausibly empty/full mask, fall back to a
  // global threshold with polarity inferred from the image border, not pixel count.
  let foreground=0;for(const value of mask)if(value)foreground++;
  if(foreground<gray.length*.003||foreground>gray.length*.92){
    for(let i=0;i<mask.length;i++)mask[i]=(darkForeground?gray[i]<globalThreshold:gray[i]>=globalThreshold)?255:0;
  }
  const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),minArea=Math.max(3,Math.round(mask.length*.00004));
  for(let start=0;start<mask.length;start++){
    if(!mask[start]||seen[start])continue;
    let head=0,tail=0;queue[tail++]=start;seen[start]=1;
    while(head<tail){
      const i=queue[head++],x=i%width,y=(i-x)/width;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const xx=x+dx,yy=y+dy;
        if(xx<0||xx>=width||yy<0||yy>=height)continue;
        const j=yy*width+xx;
        if(mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}
      }
    }
    if(tail<minArea)for(let j=0;j<tail;j++)mask[queue[j]]=0;
  }
  return mask;
}
function makeSketchTone(gray,width,height,variant='pencil'){
  const inverted=new Uint8Array(gray.length);for(let i=0;i<gray.length;i++)inverted[i]=255-gray[i];
  const blur=smooth(inverted,width,height,2),tone=new Uint8Array(gray.length);
  for(let i=0;i<tone.length;i++){const dodge=Math.min(255,Math.round(gray[i]*255/Math.max(1,255-blur[i])));let value=variant==='charcoal'?Math.round(dodge*.68+gray[i]*.32):dodge;const x=i%width,y=(i-x)/width;if(variant==='crosshatch'&&((x+y)%11<2||(x-y+width)%13<2)&&gray[i]<205)value=Math.min(value,55);tone[i]=value;}
  return tone;
}
function workspaceProcess(gray,width,height,settings){
  const mode=settings.workspaceMode||'standard';let edge=null,tone=gray;
  // Each workspace owns its detector/tone generation. Shared cleanup,
  // morphology and thickness are applied once by processor-worker.js.
  if(mode==='clean-outline'){
    edge=detectEdges(edgeAwareSmooth(gray,width,height),width,height,{...settings,edgeMethod:settings.edgeMethod||'canny'});
  }else if(mode==='detailed-outline'){
    edge=multiScaleEdges(gray,width,height,settings);
  }else if(mode==='bold-outline'){
    edge=detectEdges(smooth(gray,width,height,1),width,height,{...settings,edgeMethod:settings.edgeMethod||'canny'});
  }else if(mode==='sketch'){
    tone=makeSketchTone(gray,width,height,settings.sketchVariant||'pencil');
    edge=detectEdges(gray,width,height,{...settings,edgeMethod:settings.edgeMethod||'sobel'});
  }else if(mode==='technical-drawing'||mode==='blueprint'){
    edge=multiScaleEdges(gray,width,height,settings);
  }else if(mode==='stencil'){
    tone=makeStencilMask(gray,width,height,Number(settings.stencilOffset)||0);
    edge=new Uint8Array(tone.length);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=y*width+x,v=tone[i];
      if(v!==tone[i-1]||v!==tone[i+1]||v!==tone[i-width]||v!==tone[i+width])edge[i]=255;
    }
  }
  return {edge,tone};
}
function blueprintGrid(output,width,height,settings){
  if(!settings.blueprintGrid)return;
  const step=Math.max(12,Math.round(Number(settings.gridSpacing)||32));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x%step===0||y%step===0){const i=(y*width+x)*4;output[i]=Math.min(255,output[i]+9);output[i+1]=Math.min(255,output[i+1]+16);output[i+2]=Math.min(255,output[i+2]+24);}
}
