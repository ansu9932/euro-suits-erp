import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Original procedural garment: no external model, texture or tracking request.
export function createGarmentScene(host:HTMLElement,paused:()=>boolean,onReady:()=>void,onUnavailable:()=>void){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
 renderer.setClearColor(0xffffff,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 host.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.1,8.5);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.035);scene.environment=env.texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xffffff,0x515663,2));
 const key=new T.DirectionalLight(0xffffff,4);key.position.set(-3,5,6);scene.add(key);
 const rim=new T.DirectionalLight(0xbfd4e3,2);rim.position.set(3,1,-3);scene.add(rim);
 const model=new T.Group();model.position.y=-.12;scene.add(model);
 const fabric=new T.MeshPhysicalMaterial({color:0x9ba8b1,metalness:.82,roughness:.28,clearcoat:1,clearcoatRoughness:.17,side:T.DoubleSide});
 const lapel=new T.MeshPhysicalMaterial({color:0xd6dee1,metalness:.92,roughness:.17,clearcoat:1,side:T.DoubleSide});
 const shirt=new T.MeshStandardMaterial({color:0xf7f8f6,roughness:.66,metalness:.05});
 const seam=new T.LineBasicMaterial({color:0x223443,transparent:true,opacity:.45});
 function panel(points:number[][],mat:T.Material,z:number,depth=.3){
  const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.042,bevelThickness:.045,curveSegments:12});g.translate(0,0,-depth/2);
  const m=new T.Mesh(g,mat);m.position.z=z;model.add(m);return m;
 }
 panel([[-.35,1.3],[.35,1.3],[.48,.6],[.25,-1.12],[-.25,-1.12],[-.48,.6]],shirt,-.03,.23);
 for(const side of [-1,1]){
  const p=(points:number[][])=>points.map(([x,y])=>[x*side,y]);
  panel(p([[.34,1.38],[.83,1.14],[.72,.62],[.65,-.05],[.77,-1.43],[.13,-1.49],[.03,-1.17],[.09,-.2],[.22,.63]]),fabric,0,.44);
  panel(p([[.83,1.12],[1.05,.97],[1.44,-.83],[1.11,-.95],[.92,-.2],[.72,.6]]),fabric,-.08,.36);
  panel(p([[.34,1.38],[.54,1.12],[.43,.83],[.62,.7],[.13,-.35],[.26,.75]]),lapel,.295,.04);
  panel(p([[.01,1.32],[.3,1.4],[.36,1.13],[.15,.9]]),shirt,.25,.035);
  panel(p([[.33,-.63],[.66,-.58],[.65,-.66],[.32,-.71]]),lapel,.282,.027);
  const line=new T.BufferGeometry().setFromPoints(p([[.35,1.35],[.29,.75],[.11,-.3],[.05,-1.18],[.17,-1.45]]).map(([x,y])=>new T.Vector3(x,y,.35)));
  model.add(new T.Line(line,seam));
 }
 panel([[-.57,.67],[-.28,.7],[-.28,.66],[-.57,.63]],lapel,.3,.03);
 const buttonMaterial=new T.MeshStandardMaterial({color:0x23313d,metalness:.7,roughness:.3});
 for(const y of [-.28,-.67]){const b=new T.Mesh(new T.SphereGeometry(.046,12,8),buttonMaterial);b.scale.z=.4;b.position.set(.075,y,.3);model.add(b);}
 // Tailoring construction lines give the sculpture its technical character.
 const blueprint=new T.Group();model.add(blueprint);
 for(let i=0;i<12;i++){
  const y=-1.35+i*.22,w=.69+Math.sin(i*.52)*.03;
  const g=new T.BufferGeometry().setFromPoints([new T.Vector3(-w,y,.29),new T.Vector3(w,y,.29)]);
  blueprint.add(new T.Line(g,new T.LineBasicMaterial({color:0x243844,transparent:true,opacity:.09})));
 }
 const orbit=new T.Group();scene.add(orbit);
 const orbitMaterial=new T.LineBasicMaterial({color:0x819098,transparent:true,opacity:.29});
 for(let j=0;j<5;j++){
  const points=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;points.push(new T.Vector3(Math.cos(a)*2.15,Math.sin(a)*2.15,0));}
  const ring=new T.Line(new T.BufferGeometry().setFromPoints(points),orbitMaterial);ring.rotation.set(.5+j*.49,.45+j*.55,j*.3);orbit.add(ring);
 }
 const dots=new T.BufferGeometry(),positions=[];
 for(let i=0;i<100;i++){const a=i*2.399963,y=1-2*i/99,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*2.2,y*2.2,Math.sin(a)*r*2.2);}
 dots.setAttribute('position',new T.Float32BufferAttribute(positions,3));orbit.add(new T.Points(dots,new T.PointsMaterial({color:0x182c3b,size:.022,transparent:true,opacity:.72})));
 const satellites:T.Mesh[]=[];
 for(let i=0;i<6;i++){const dot=new T.Mesh(new T.SphereGeometry(.033,10,8),buttonMaterial);scene.add(dot);satellites.push(dot);}
 let inView=true,frame=0,last=0,t=0,pointerX=0,pointerY=0,dirty=true,wasMoving=false,contextLost=false;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'100px'});observer.observe(host);
 const resize=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();dirty=true;};
 const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const pointer=(e:PointerEvent)=>{if(e.pointerType==='touch')return;const b=host.getBoundingClientRect();pointerX=(e.clientX-b.left)/b.width-.5;pointerY=(e.clientY-b.top)/b.height-.5;};
 window.addEventListener('pointermove',pointer,{passive:true});
 const lost=(e:Event)=>{e.preventDefault();contextLost=true;renderer.domElement.style.opacity='0';onUnavailable();};
 const restored=()=>{contextLost=false;dirty=true;renderer.domElement.style.opacity='1';onReady();};renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);
 function render(now:number){
  frame=requestAnimationFrame(render);
  if(!inView||document.hidden||contextLost||now-last<32)return;
  const dt=Math.min((now-last)/1000,.05);last=now;
  const moving=!paused()&&!reduce.matches;
  if(!moving&&!dirty&&!wasMoving)return;
  if(moving)t+=dt;
  dirty=false;wasMoving=moving;
  model.rotation.y=.2+Math.sin(t*.3)*.22+(moving?pointerX*.14:0);model.rotation.z=Math.sin(t*.23)*.025;
  model.position.y=-.08+Math.sin(t*.7)*.06;model.rotation.x=moving?pointerY*.08:0;
  orbit.rotation.y=t*.05;orbit.rotation.z=t*.026;
  satellites.forEach((s,i)=>{const a=t*.15+i*Math.PI/3;s.position.set(Math.cos(a)*2.15,Math.sin(a)*2.1,Math.sin(a*2)*.7);});
  renderer.render(scene,camera);
 }
 renderer.render(scene,camera);onReady();frame=requestAnimationFrame(render);
 return()=>{cancelAnimationFrame(frame);ro.disconnect();observer.disconnect();window.removeEventListener('pointermove',pointer);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restored);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(obj=>{const m=obj as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>materials.add(v));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());env.dispose();renderer.dispose();renderer.domElement.remove();};
}
