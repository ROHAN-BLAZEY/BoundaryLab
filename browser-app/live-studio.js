(() => {
'use strict';
const $=selector=>document.querySelector(selector);
const video=$('#liveVideo'),status=$('#liveStatus'),start=$('#startCamera'),stop=$('#stopCamera'),capture=$('#captureFrame');
const canvases={color:$('#liveColor'),gray:$('#liveGray'),output:$('#liveOutput')};
const ctx={color:canvases.color.getContext('2d'),gray:canvases.gray.getContext('2d'),output:canvases.output.getContext('2d')};
const worker=new Worker('./processor-worker.js');
const workCanvas=document.createElement('canvas'),workCtx=workCanvas.getContext('2d',{willReadFrequently:true});
const resultCanvas=document.createElement('canvas'),resultCtx=resultCanvas.getContext('2d');
const mobile=matchMedia('(max-width:700px)').matches||matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const memory=navigator.deviceMemory||4,cores=navigator.hardwareConcurrency||4;
const constrained=memory<=3||cores<=4;
const deviceLabel=mobile?'Mobile device':(constrained?'Laptop · efficiency mode':'Desktop / laptop');
let stream=null,raf=0,stopped=true,busy=false,job=0,lastProcess=0,lastMetrics=0,processedFrames=0,processedFps=0,latency=0,slowStreak=0,fastStreak=0,adaptiveScale=1,latest=null,activeWidth=0,activeHeight=0;
const say=message=>{status.textContent=message;};
const settingsIds=['liveMode','livePerformance','liveFpsLimit','liveResolutionSelect','liveLow','liveHigh','liveSmooth','liveThickness','liveEdgeSoftness','liveColor','liveContrast','liveBrightness','liveStencilOffset','liveNormalize','liveInvert','liveGrid'];
const presets={
 'clean-outline':{low:28,high:78,smooth:1,thickness:1,contrast:12},
 'detailed-outline':{low:18,high:58,smooth:0,thickness:1,contrast:18},
 'bold-outline':{low:32,high:86,smooth:1,thickness:2,contrast:20},
 'stencil':{low:28,high:78,smooth:1,thickness:1,contrast:18},
 'blueprint':{low:24,high:68,smooth:1,thickness:1,contrast:14},
 'technical-drawing':{low:24,high:70,smooth:1,thickness:1,contrast:16}
};
function updateLabels(){
 for(const [id,out,suffix] of [['liveFpsLimit','fpsValue',''],['liveLow','lowValue',''],['liveHigh','highValue',''],['liveSmooth','smoothValue',''],['liveThickness','thicknessValue',''],['liveEdgeSoftness','softnessValue',''],['liveContrast','contrastValue',''],['liveBrightness','brightnessValue',''],['liveStencilOffset','stencilValue','']])$('#'+out).textContent=$('#'+id).value+suffix;
 $('#livePresetName').textContent=$('#liveMode').selectedOptions[0].textContent;
}
function setCanvasSize(canvas,w,h){if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function dimensions(maxSide,sourceWidth,sourceHeight){const scale=Math.min(1,maxSide/Math.max(sourceWidth,sourceHeight));return {width:Math.max(1,Math.round(sourceWidth*scale)),height:Math.max(1,Math.round(sourceHeight*scale))};}
function selectedProfile(){
 const p=$('#livePerformance').value;
 if(p==='smooth')return {fps:mobile?12:16,res:320};
 if(p==='detail')return {fps:mobile?15:20,res:480};
 return {fps:mobile?14:18,res:400};
}
function setProfile(){const p=selectedProfile();$('#liveFpsLimit').value=p.fps;$('#liveResolutionSelect').value=String(p.res);updateLabels();}
function currentSettings(){
 const low=Number($('#liveLow').value),high=Math.max(low+1,Number($('#liveHigh').value));
 return {workspaceMode:$('#liveMode').value,style:'edge-map',livePreview:true,edgeMethod:'canny',low,high,cleanup:Number($('#liveSmooth').value),edgeThickness:Number($('#liveThickness').value),edgeSoftness:Number($('#liveEdgeSoftness').value),color:$('#liveColor').value,contrast:Number($('#liveContrast').value),brightness:Number($('#liveBrightness').value),stencilOffset:Number($('#liveStencilOffset').value),autoNormalize:$('#liveNormalize').checked,invert:$('#liveInvert').checked,transparent:false,blueprintGrid:$('#liveGrid').checked,gridSpacing:32,morphology:'close',sketchVariant:'pencil'};
}
function updateMetrics(now){
 if(now-lastMetrics<800)return;processedFps=processedFrames*1000/Math.max(1,now-lastMetrics);processedFrames=0;lastMetrics=now;
 $('#liveFps').textContent=processedFps.toFixed(1)+' FPS processed';
 $('#liveLatency').textContent=Math.round(latency)+' ms latency';
 $('#liveResolution').textContent=activeWidth?activeWidth+' × '+activeHeight:'Waiting for camera';
 $('#liveDevice').textContent=deviceLabel+(adaptiveScale<1?' · adaptive quality':'');
}
function drawLiveColour(){
 if(video.readyState<2||!video.videoWidth)return;
 const d=dimensions(mobile?720:960,video.videoWidth,video.videoHeight);
 setCanvasSize(canvases.color,d.width,d.height);setCanvasSize(canvases.gray,d.width,d.height);
 ctx.color.drawImage(video,0,0,d.width,d.height);
 ctx.gray.filter='grayscale(1)';ctx.gray.drawImage(video,0,0,d.width,d.height);ctx.gray.filter='none';
 return d;
}
function adaptPerformance(duration){
 const target=1000/Math.max(5,Number($('#liveFpsLimit').value));
 if(duration>target*1.35){slowStreak++;fastStreak=0;}else if(duration<target*.55){fastStreak++;slowStreak=0;}else{slowStreak=Math.max(0,slowStreak-1);fastStreak=0;}
 if(slowStreak>=3){adaptiveScale=Math.max(.5,adaptiveScale*.85);slowStreak=0;say('Keeping the preview smooth · reducing processing load automatically.');}
 if(fastStreak>=10){adaptiveScale=Math.min(1,adaptiveScale+.05);fastStreak=0;}
}
function frameLoop(now){
 if(stopped)return;
 raf=requestAnimationFrame(frameLoop);
 if(video.readyState<2||!video.videoWidth)return;
 drawLiveColour();
 if(busy)return;
 const target=1000/Math.max(5,Number($('#liveFpsLimit').value));
 if(now-lastProcess<target)return;
 lastProcess=now;
 const requested=Math.min(Number($('#liveResolutionSelect').value),mobile?480:640,constrained?400:640);
 const d=dimensions(Math.max(240,Math.round(requested*adaptiveScale)),video.videoWidth,video.videoHeight);
 activeWidth=d.width;activeHeight=d.height;
 setCanvasSize(workCanvas,d.width,d.height);
 workCtx.imageSmoothingEnabled=true;workCtx.imageSmoothingQuality='high';workCtx.drawImage(video,0,0,d.width,d.height);
 let image;
 try{image=workCtx.getImageData(0,0,d.width,d.height);}catch(error){say('The browser could not read the camera frame. Restart the camera and check site permissions.');return;}
 const id=++job,buffer=image.data.buffer.slice(image.data.byteOffset,image.data.byteOffset+image.data.byteLength);
 busy=true;
 worker.postMessage({id,pixels:buffer,width:d.width,height:d.height,settings:currentSettings(),sentAt:performance.now()},[buffer]);
}
worker.onmessage=({data})=>{
 if(stopped||data.id!==job)return;
 busy=false;
 latency=Math.max(0,performance.now()-(data.sentAt||performance.now()));
 adaptPerformance(latency);
 setCanvasSize(resultCanvas,data.width,data.height);
 resultCtx.putImageData(new ImageData(data.output,data.width,data.height),0,0);
 const display=dimensions(mobile?720:960,video.videoWidth||data.width,video.videoHeight||data.height);
 setCanvasSize(canvases.output,display.width,display.height);
 ctx.output.imageSmoothingEnabled=true;ctx.output.imageSmoothingQuality='high';
 ctx.output.clearRect(0,0,display.width,display.height);ctx.output.drawImage(resultCanvas,0,0,display.width,display.height);
 latest={width:data.width,height:data.height,pixels:data.output.slice()};capture.disabled=false;
 processedFrames++;updateMetrics(performance.now());
};
worker.onerror=()=>{busy=false;say('The live image processor stopped unexpectedly. Refresh Live Studio and try again.');};
function stopCamera(message='Camera stopped.'){
 stopped=true;job++;latest=null;cancelAnimationFrame(raf);
 if(stream)stream.getTracks().forEach(track=>track.stop());
 stream=null;video.srcObject=null;busy=false;start.disabled=false;stop.disabled=true;capture.disabled=true;
 $('#liveCameraFps').textContent='Camera · idle';$('#liveFps').textContent='0 FPS processed';$('#liveLatency').textContent='0 ms latency';
 say(message);
}
async function startCamera(){
 if(!navigator.mediaDevices?.getUserMedia||!isSecureContext){say('Camera access requires HTTPS (or localhost) and a supported browser.');return;}
 start.disabled=true;say('Requesting camera permission…');
 try{
  const preferred=mobile?720:1280;
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:$('#cameraFacing').value},width:{ideal:preferred},height:{ideal:mobile?480:540},frameRate:{ideal:30,max:30}}});
  video.srcObject=stream;await video.play();stopped=false;latest=null;adaptiveScale=1;slowStreak=0;fastStreak=0;busy=false;
  const track=stream.getVideoTracks()[0],trackSettings=track.getSettings();$('#liveCameraFps').textContent='Camera · '+Math.round(trackSettings.frameRate||30)+' FPS';
  activeWidth=trackSettings.width||video.videoWidth;activeHeight=trackSettings.height||video.videoHeight;
  track.addEventListener('ended',()=>{if(!stopped)stopCamera('Camera stream ended. Start the camera again to continue.');},{once:true});
  start.disabled=true;stop.disabled=false;capture.disabled=true;
  processedFrames=0;lastMetrics=performance.now();lastProcess=0;
  say('Camera connected · live colour preview is running.');
  raf=requestAnimationFrame(frameLoop);
 }catch(error){
  stopCamera(error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings.':error.name==='NotFoundError'?'No camera was found on this device.':'Camera could not start. Close other camera apps and try again.');
 }
}
function captureFrame(){
 if(!latest)return;
 const canvas=document.createElement('canvas');canvas.width=latest.width;canvas.height=latest.height;
 canvas.getContext('2d').putImageData(new ImageData(latest.pixels,latest.width,latest.height),0,0);
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='boundarylab-live-edge-map.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);say('Latest processed edge map saved.');},'image/png');
}
function applyPreset(){
 const preset=presets[$('#liveMode').value];if(!preset)return;
 for(const [key,value] of Object.entries(preset))$('#live'+key[0].toUpperCase()+key.slice(1)).value=value;
 updateLabels();
}
function resetSettings(){
 $('#liveMode').value='clean-outline';$('#livePerformance').value='balanced';setProfile();
 $('#liveColor').value='#e8eeee';$('#liveBrightness').value=0;$('#liveStencilOffset').value=0;
 $('#liveNormalize').checked=true;$('#liveInvert').checked=false;$('#liveGrid').checked=false;
 applyPreset();updateLabels();say(stream?'Settings reset · live processing continues.':'Settings reset.');
}
settingsIds.forEach(id=>$('#'+id).addEventListener('input',()=>{
 if(id==='liveLow'&&Number($('#liveLow').value)>=Number($('#liveHigh').value))$('#liveHigh').value=Math.min(240,Number($('#liveLow').value)+1);
 if(id==='liveHigh'&&Number($('#liveHigh').value)<=Number($('#liveLow').value))$('#liveLow').value=Math.max(1,Number($('#liveHigh').value)-1);
 if(id==='liveMode')applyPreset();
 if(id==='livePerformance')setProfile();
 updateLabels();
}));
$('#liveReset').addEventListener('click',resetSettings);
$('#cameraFacing').addEventListener('change',()=>{if(!stopped){stopCamera('Switching camera…');startCamera();}});
start.addEventListener('click',startCamera);stop.addEventListener('click',()=>stopCamera());capture.addEventListener('click',captureFrame);
window.addEventListener('pagehide',()=>{stopCamera();worker.terminate();});
updateLabels();$('#liveDevice').textContent=deviceLabel;$('#liveFps').textContent='0 FPS processed';
})();
