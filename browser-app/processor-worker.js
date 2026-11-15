self.onmessage = ({data: job}) => {
  const {id, pixels, width, height, settings} = job;
  const gray = new Uint8Array(width * height);
  for (let j=0,i=0;j<gray.length;j++,i+=4) gray[j]=Math.round(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]);
  const edge = new Uint8Array(width * height), low=+settings.low, high=+settings.high;
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
    const i=y*width+x;
    if(settings.edgeMethod==='laplacian') {edge[i]=Math.abs(4*gray[i]-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width])>low?255:0;continue;}
    const gx=-gray[i-width-1]+gray[i-width+1]-2*gray[i-1]+2*gray[i+1]-gray[i+width-1]+gray[i+width+1];
    const gy=-gray[i-width-1]-2*gray[i-width]-gray[i-width+1]+gray[i+width-1]+2*gray[i+width]+gray[i+width+1];
    edge[i]=Math.hypot(gx,gy)>(settings.edgeMethod==='canny'?high:low)?255:0;
  }
  for(let pass=0;pass<settings.cleanup;pass++) {
    const next=edge.slice();
    for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {const i=y*width+x;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)n+=edge[i+dy*width+dx]?1:0;if(n<=1)next[i]=0;}
    edge.set(next);
  }
  const hex=settings.color.slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),output=new Uint8ClampedArray(width*height*4);
  for(let j=0,i=0;j<gray.length;j++,i+=4){let v=0;if(settings.style==='gray')v=gray[j];else if(settings.style==='threshold')v=gray[j]>=low?255:0;else if(settings.style==='blueprint'){output[i]=edge[j]?rgb[0]:7;output[i+1]=edge[j]?rgb[1]:26;output[i+2]=edge[j]?rgb[2]:52;}else if(settings.style==='neon'){output[i]=edge[j]?rgb[0]:5;output[i+1]=edge[j]?rgb[1]:10;output[i+2]=edge[j]?rgb[2]:13;}else{v=edge[j]?255:0;if(settings.style==='coloring'&&!edge[j])v=255;}if(settings.style!=='neon'&&settings.style!=='blueprint')output[i]=output[i+1]=output[i+2]=v;if(settings.invert){output[i]=255-output[i];output[i+1]=255-output[i+1];output[i+2]=255-output[i+2];}output[i+3]=settings.transparent&&settings.style==='outline'&&!edge[j]?0:255;}
  self.postMessage({id,width,height,gray,edge,output},[gray.buffer,edge.buffer,output.buffer]);
};
