// Optional enhancement: native scrolling and all case content work without this file.
export function initStoryMotion(){
 const scene=document.querySelector('.story-scene');
 if(!scene||scene.dataset.ready)return;
 scene.dataset.ready='true';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover: hover) and (pointer: fine)');
 let frame=0,lookX=0,lookY=0;
 const enabled=()=>!reduced.matches&&document.documentElement.dataset.motion==='on';
 function draw(){frame=0;const y=enabled()?Math.min(52,Math.max(-12,scrollY*.09)):0;scene.style.setProperty('--scene-shift',y+'px');scene.style.setProperty('--look-x',enabled()?lookX+'deg':'0deg');scene.style.setProperty('--look-y',enabled()?lookY+'deg':'0deg');updateChapter();}
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
 addEventListener('scroll',schedule,{passive:true});
 scene.addEventListener('pointermove',event=>{if(!fine.matches||event.pointerType==='touch')return;const r=scene.getBoundingClientRect();lookX=(event.clientY-r.top-r.height/2)/r.height*-4;lookY=(event.clientX-r.left-r.width/2)/r.width*4;schedule();},{passive:true});
 scene.addEventListener('pointerleave',()=>{lookX=lookY=0;schedule();});
 reduced.addEventListener('change',schedule);fine.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
 const links=[...document.querySelectorAll('.story-rail a')];

 const sections=[...document.querySelectorAll('.story-chapter,.story-person')];
 function updateChapter(){
  const line=Math.min(innerHeight*.4,220);
  const current=sections.find(section=>{const r=section.getBoundingClientRect();return r.top<=line&&r.bottom>line;});
  links.forEach(link=>{if(current&&link.hash==='#'+current.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
 }
 addEventListener('resize',schedule,{passive:true});
 draw();
}
