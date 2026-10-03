import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

type SceneOptions = {mode:'hero'|'layers';progress:()=>number};
// A procedural tailoring study. All geometry and fabric textures stay local.
export function createGarmentScene(host:HTMLElement,paused:()=>boolean,onReady:()=>void,onUnavailable:()=>void,options:SceneOptions){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
 renderer.setClearColor(0xffffff,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 host.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.05,8.5);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xeefaff,0x405c66,1.5));
 const key=new T.DirectionalLight(0xffffff,2.8);key.position.set(-3,5,6);scene.add(key);
 const rim=new T.DirectionalLight(0x9ae0d4,2.5);rim.position.set(4,1,-2);scene.add(rim);
 const model=new T.Group();scene.add(model);
 const pixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=(x+y)%6<2?180:235;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 const weave=new T.DataTexture(pixels,64,64);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(7,7);weave.needsUpdate=true;
 const fabric=new T.MeshPhysicalMaterial({color:0x10243b,metalness:.08,roughness:.74,bumpMap:weave,bumpScale:.008,sheen:.5,sheenColor:new T.Color(0x6d9ca8),side:T.DoubleSide});
 const lapelMaterial=new T.MeshPhysicalMaterial({color:0x193d55,metalness:.1,roughness:.6,sheen:.6,side:T.DoubleSide});
 const liningMaterial=new T.MeshPhysicalMaterial({color:0x148b88,metalness:.12,roughness:.38,clearcoat:.3,side:T.DoubleSide});
 const canvasMaterial=new T.MeshStandardMaterial({color:0xc5bea4,roughness:.92,bumpMap:weave,bumpScale:.01,side:T.DoubleSide});
 const buttonMaterial=new T.MeshStandardMaterial({color:0xa8c2c7,metalness:.65,roughness:.28});
 const groups={shellLeft:new T.Group(),shellRight:new T.Group(),canvasLeft:new T.Group(),canvasRight:new T.Group(),lining:new T.Group(),sleeveLeft:new T.Group(),sleeveRight:new T.Group(),lapelLeft:new T.Group(),lapelRight:new T.Group(),trimLeft:new T.Group(),trimRight:new T.Group()};
 Object.values(groups).forEach(g=>model.add(g));
 groups.shellLeft.add(groups.trimLeft);groups.shellRight.add(groups.trimRight);
 function panel(parent:T.Group,points:number[][],mat:T.Material,z:number,depth=.16,round=.025){
  const s=new T.Shape();s.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>s.lineTo(x,y));s.closePath();
  const geometry=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:round,bevelThickness:round,curveSegments:12});geometry.translate(0,0,-depth/2);
  const mesh=new T.Mesh(geometry,mat);mesh.position.z=z;parent.add(mesh);return mesh;
 }
 panel(groups.lining,[[-.32,1.31],[-.78,1.08],[-.62,.38],[-.6,-.32],[-.72,-1.4],[0,-1.45],[.72,-1.4],[.6,-.32],[.62,.38],[.78,1.08],[.32,1.31],[.23,1.05],[-.23,1.05]],liningMaterial,-.24,.1);
 for(const side of [-1,1]){
  const left=side<0,p=(points:number[][])=>points.map(([x,y])=>[x*side,y]);
  const shell=left?groups.shellLeft:groups.shellRight,canvas=left?groups.canvasLeft:groups.canvasRight,sleeve=left?groups.sleeveLeft:groups.sleeveRight,lapel=left?groups.lapelLeft:groups.lapelRight;
  panel(shell,p([[.34,1.34],[.79,1.13],[.75,.73],[.63,.2],[.62,-.28],[.74,-1.31],[.68,-1.43],[.19,-1.47],[.07,-1.34],[.065,-.8],[.075,-.1],[.2,.62]]),fabric,.07,.23,.045);
  panel(canvas,p([[.31,1.25],[.7,1.04],[.63,.38],[.53,-.36],[.13,-.48],[.2,.66]]),canvasMaterial,-.05,.055,.02);
  panel(sleeve,p([[.79,1.12],[.97,1.02],[1.07,.75],[1.21,.18],[1.43,-.91],[1.11,-1.01],[.93,-.33],[.79,.16],[.69,.65]]),fabric,-.06,.24,.055);
  panel(lapel,p([[.33,1.36],[.52,1.1],[.43,.86],[.57,.73],[.11,-.35],[.25,.7]]),lapelMaterial,.255,.045,.022);
  panel(left?groups.trimLeft:groups.trimRight,p([[.31,-.61],[.64,-.57],[.65,-.68],[.32,-.72]]),lapelMaterial,.24,.045,.01);
  const seamPoints=p([[.37,1.28],[.3,.75],[.12,-.3],[.095,-1.23],[.22,-1.39]]).map(([x,y])=>new T.Vector3(x,y,.23));
  shell.add(new T.Line(new T.BufferGeometry().setFromPoints(seamPoints),new T.LineBasicMaterial({color:0x84b8bd,transparent:true,opacity:.45})));
  for(let i=0;i<3;i++){const b=new T.Mesh(new T.SphereGeometry(.021,10,8),buttonMaterial);b.position.set(side*(1.18+i*.025),-.79-i*.07,.095);sleeve.add(b);}
 }
 panel(groups.trimLeft,[[-.56,.64],[-.29,.66],[-.29,.61],[-.56,.59]],lapelMaterial,.23,.035,.006);
 for(const y of [-.28,-.65]){const b=new T.Mesh(new T.SphereGeometry(.048,16,10),buttonMaterial);b.scale.z=.4;b.position.set(.074,y,.255);groups.trimRight.add(b);}
 const stitch=new T.LineDashedMaterial({color:0x87c9c5,dashSize:.025,gapSize:.027,transparent:true,opacity:.55});
 const liningSeam=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1.06,-.16),new T.Vector3(0,-1.36,-.16)]),stitch);liningSeam.computeLineDistances();groups.lining.add(liningSeam);
 const orbit=new T.Group();scene.add(orbit);
 const orbitMaterial=new T.LineBasicMaterial({color:0x539f9b,transparent:true,opacity:options.mode==='hero'?.21:.1});
 for(let j=0;j<3;j++){const points=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;points.push(new T.Vector3(Math.cos(a)*2.05,Math.sin(a)*2.05,0));}const ring=new T.Line(new T.BufferGeometry().setFromPoints(points),orbitMaterial);ring.rotation.set(.6+j*.65,.4+j*.55,j*.3);orbit.add(ring);}
 let inView=true,frame=0,last=0,t=0,pointerX=0,pointerY=0,dirty=true,wasMoving=false,contextLost=false,displayProgress=0,lastProgress=-1;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'100px'});observer.observe(host);
 const resize=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();dirty=true;};
 const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const pointer=(e:PointerEvent)=>{if(e.pointerType==='touch'||options.mode==='layers')return;const b=host.getBoundingClientRect();pointerX=T.MathUtils.clamp((e.clientX-b.left)/b.width-.5,-.6,.6);pointerY=T.MathUtils.clamp((e.clientY-b.top)/b.height-.5,-.6,.6);};
 window.addEventListener('pointermove',pointer,{passive:true});
 const lost=(e:Event)=>{e.preventDefault();contextLost=true;renderer.domElement.style.opacity='0';onUnavailable();};
 const restored=()=>{contextLost=false;dirty=true;renderer.domElement.style.opacity='1';onReady();};renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);
 const smooth=(a:number,b:number,p:number)=>T.MathUtils.smoothstep(p,a,b);
 function pose(p:number){
  const shell=smooth(.15,1,p),inner=smooth(1.1,2,p),sleeve=smooth(2.1,3,p),trim=smooth(3.1,4,p);
  groups.shellLeft.position.set(-shell*.55,0,shell*.65);groups.shellRight.position.set(shell*.55,0,shell*.65);
  groups.shellLeft.rotation.y=-shell*.25;groups.shellRight.rotation.y=shell*.25;
  groups.canvasLeft.position.set(-inner*.17,0,inner*.42);groups.canvasRight.position.set(inner*.17,0,inner*.42);
  groups.lining.position.z=-inner*.25;
  groups.sleeveLeft.position.set(-sleeve*.72,sleeve*.08,0);groups.sleeveRight.position.set(sleeve*.72,sleeve*.08,0);
  groups.sleeveLeft.rotation.z=-sleeve*.08;groups.sleeveRight.rotation.z=sleeve*.08;
  groups.lapelLeft.position.set(-shell*.55-trim*.08,trim*.1,shell*.65+trim*.6);groups.lapelRight.position.set(shell*.55+trim*.08,trim*.1,shell*.65+trim*.6);
  groups.trimLeft.position.set(0,-trim*.15,trim*.7);groups.trimRight.position.set(0,-trim*.15,trim*.7);
  camera.position.z=Math.max(options.mode==='layers'?7.3:7.8,6.5/camera.aspect)+shell*.65+sleeve*.85;
 }
 function render(now:number){
  frame=requestAnimationFrame(render);if(!inView||document.hidden||contextLost||now-last<32)return;
  const dt=Math.min((now-last)/1000,.05);last=now;
  const moving=!paused()&&!reduce.matches,target=options.mode==='layers'?options.progress():0;
  displayProgress=moving?T.MathUtils.lerp(displayProgress,target,1-Math.exp(-dt*12)):Math.floor(target+.001);
  if(Math.abs(displayProgress-target)<.002)displayProgress=target;
  const changed=Math.abs(lastProgress-displayProgress)>.001;
  if(!moving&&!dirty&&!wasMoving&&!changed)return;
  if(moving)t+=dt;dirty=false;wasMoving=moving;lastProgress=displayProgress;
  pose(displayProgress);
  model.rotation.y=options.mode==='layers'?-.26-displayProgress*.065:.14+Math.sin(t*.25)*.18+(moving?pointerX*.14:0);
  model.rotation.z=options.mode==='hero'&&moving?Math.sin(t*.23)*.016:0;
  model.position.y=options.mode==='hero'&&moving?-.03+Math.sin(t*.65)*.04:0;model.rotation.x=options.mode==='hero'&&moving?pointerY*.06:0;
  orbit.visible=options.mode==='hero';orbit.rotation.y=t*.035;orbit.rotation.z=t*.016;
  renderer.render(scene,camera);
 }
 pose(0);renderer.render(scene,camera);onReady();frame=requestAnimationFrame(render);
 return()=>{cancelAnimationFrame(frame);ro.disconnect();observer.disconnect();window.removeEventListener('pointermove',pointer);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restored);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(obj=>{const m=obj as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>materials.add(v));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());weave.dispose();env.dispose();renderer.dispose();renderer.domElement.remove();};
}
