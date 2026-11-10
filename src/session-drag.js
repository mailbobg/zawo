// Internal session movement uses Pointer Events, not Chromium's OS drag loop.
// The native HTML drag handoff cancels pointer delivery before a drop reaches us.
export function createSessionDrag({findTarget,canDrop,onDrop,onHint,onEnd}) {
 let gesture=null,swallowClick=false,clickTimer;
 const suppressClick=()=>{swallowClick=true;clearTimeout(clickTimer);clickTimer=setTimeout(()=>swallowClick=false,0);};
 const cancel=()=>{const old=gesture;gesture=null;if(old?.moving)suppressClick();if(old?.capture.hasPointerCapture(old.pointerId))old.capture.releasePointerCapture(old.pointerId);onHint(null);onEnd();};
 function source(element,payload){
  element.draggable=false;
  element.ondragstart=e=>e.preventDefault();
  element.onpointerdown=e=>{
   if(e.button!==0||!e.isPrimary||e.target.closest('.pane-actions button,.pane-close,.tab-close,.pane-reconnect'))return;
   cancel();gesture={element,capture:e.target,payload,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moving:false};
   // Capture the original hit element so ordinary clicks still reach its button.
   try{e.target.setPointerCapture(e.pointerId);}catch{}
  };
 }
 document.addEventListener('pointermove',e=>{
  const g=gesture;if(!g||e.pointerId!==g.pointerId)return;
  if(!g.element.isConnected){cancel();return;}
  // Capture/focus changes may emit a zero-button move before native dragging.
  // Only up/cancel/blur ends the gesture; this move is not a release.
  if(!(e.buttons&1))return;
  if(!g.moving){if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<6)return;g.moving=true;document.body.classList.add('session-dragging');}
  e.preventDefault();const target=findTarget(e.clientX,e.clientY);onHint(target&&canDrop(g.payload,target)?target:null,e.clientX,e.clientY);
 },true);
 document.addEventListener('pointerup',e=>{
  const g=gesture;if(!g||e.pointerId!==g.pointerId)return;
  // A fast native gesture can coalesce all intermediate move events.
  g.moving ||= Math.hypot(e.clientX-g.x,e.clientY-g.y)>=6;
  const target=g.moving?findTarget(e.clientX,e.clientY):null;
  const valid=target&&canDrop(g.payload,target);cancel();
  if(g.moving){e.preventDefault();if(valid)onDrop(g.payload,target);}
 },true);
 document.addEventListener('pointercancel',e=>{if(gesture?.pointerId===e.pointerId)cancel();},true);
 document.addEventListener('lostpointercapture',e=>{if(gesture?.pointerId===e.pointerId)cancel();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture?.moving){e.preventDefault();e.stopImmediatePropagation();cancel();}},true);
 document.addEventListener('click',e=>{if(swallowClick){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('blur',cancel);
 return {source,cancel};
}
