/* Home page, first screen: the Challenger, live, on the drawing-board ground, with its parts called out.
   Same model and part map as challenger-reveal.html (front of the bike = -X; see cad/reveal_module.js). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const host = document.getElementById('bike'), canvas = document.getElementById('bike-c');
const pinsBox = document.getElementById('pins'), lines = document.getElementById('pin-lines');

// which part is what comes from parts.json (`seg`), as on the 3D page (cad/v34_segments.js)
const REMOVED = new Set();
const COL = { frame:0xc41f2d, seat:0x121314, tyre:0x0c0d0f, rim:0x3d4249, body:0x2b2f35, small:0x4b5159 };
// the sticker, as on the 3D page (cad/reveal_module.js)
const DECAL_PART = '2A011514B016_2_1', DECAL_ANG = 0.966;
const DECALS = [
  { x:207.7, y:510, w:250, src:'/assets/img/BNC-Home-image/challenger_logo.png', ratio:848/76 },     // CHALLENGER
  { x:137.8, y:453.8, w:60, src:'/assets/img/challenger_v3/bnc-mark-white.png', ratio:835/201 }             // the BNC mark above its first letters
];
// What is called out, where on the bike (mm), and which way its label leans (px at a 900px-wide stage)
const PINS = {
  frame:   { at:[ 420, 708, 176], off:[  70, -86] },
  battery: { at:[-205, 560, 130], off:[-120, -96] },
  susp:    { at:[-676, 395, 116], off:[-128,  10] },
  motor:   { at:[ 631, 265, 100], off:[  96,  40] },
  boot:    { at:[ 250, 800,   0], off:[ -10,-110] }
};
const VIEW = { t:[-20, 520, 0], az:-0.55, el:0.07, d:3.0 };

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 1, 60000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
[[0xffffff,3.0,[-5,9,7]],[0xbfd0ff,1.2,[7,3,4]],[0xffffff,3.4,[4,6,-9]],[0xffffff,2.6,[-6,4,-8]]].forEach(([c,i,p])=>{ const l=new THREE.DirectionalLight(c,i); l.position.set(...p); scene.add(l); });
scene.add(new THREE.AmbientLight(0xffffff, 0.36));
const sh=(()=>{ const s=256,cv=document.createElement('canvas'); cv.width=cv.height=s; const x=cv.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); g.addColorStop(0,'rgba(0,0,0,.42)'); g.addColorStop(.6,'rgba(0,0,0,.16)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,s,s);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(7,3.2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.renderOrder=-1; scene.add(m); return m; })();
const root = new THREE.Group(); scene.add(root);

let ready=false, dirty=true, radius=1;
const look={x:0,y:0,tx:0,ty:0};
const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.max(0,Math.floor(p*(s.length-1)))];};

const loader = new GLTFLoader(); const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/'); loader.setDRACOLoader(draco);
let meta=null;
fetch('/assets/model/parts.json').then(r=>r.ok?r.json():null).then(j=>{meta=j;}).catch(()=>{}).finally(()=>loader.load('/assets/model/challenger_c.glb', onModel, undefined, e=>{ host.classList.add('failed'); console.error(e); }));

function onModel(gltf){
  const model=gltf.scene; root.add(model);
  const out=new Set();
  if(meta && meta.parts){ const P=meta.parts;
    const b=[0,1,2].map(ax=>{const c=P.map(p=>p.centroid[ax]); const lo=pct(c,.03),hi=pct(c,.97),sp=Math.max(hi-lo,1); return [lo-.55*sp,hi+.55*sp];});
    P.forEach(p=>{ for(let ax=0;ax<3;ax++) if(p.centroid[ax]<b[ax][0]||p.centroid[ax]>b[ax][1]){ out.add(p.name); break; } }); }
  const meshes=[]; model.traverse(o=>{ if(o.isMesh){ if(out.has(o.name)||REMOVED.has(o.name)) o.visible=false; else meshes.push(o); } });
  { let yy,zz; if(meta&&meta.size){ yy=meta.size[1]; zz=meta.size[2]; } else { model.updateMatrixWorld(true); const r=new THREE.Box3(); meshes.forEach(o=>r.expandByObject(o)); const s=r.getSize(new THREE.Vector3()); yy=s.y; zz=s.z; }
    if(zz>yy*1.15) model.rotation.x=Math.PI/2; }                          // an older Z-up export; the v3.4 file is Y-up
  const measure=()=>{ model.updateMatrixWorld(true); const b=new THREE.Box3(); meshes.forEach(o=>b.expandByObject(o)); return b; };
  const c0=measure().getCenter(new THREE.Vector3()); model.position.x-=c0.x; model.position.z-=c0.z; model.position.y-=measure().min.y;
  const fs=measure().getSize(new THREE.Vector3()); radius=Math.max(fs.x,fs.y)*0.5;
  sh.position.y=1; sh.scale.set(fs.x/7*1.25, fs.z/3.2*1.4, 1);
  model.updateMatrixWorld(true);

  const by=new Map(); const parts=meshes.map(o=>{ const bb=new THREE.Box3().setFromObject(o); const p={node:o,c:bb.getCenter(new THREE.Vector3()),s:bb.getSize(new THREE.Vector3()),seg:null}; by.set(o.name,p); return p; });
  if(meta && meta.parts) meta.parts.forEach(m=>{ const p=by.get(m.name); if(p && m.seg) p.seg = (m.seg==='motor'||m.seg==='wheelF') ? 'rim' : m.seg; });
  parts.forEach(p=>{ let col=COL.body, metal=.55, rough=.5; const k=p.seg, md=Math.max(p.s.x,p.s.y,p.s.z);
    if(k==='frame'){ col=COL.frame; metal=.5; rough=.42; } else if(k==='seat'){ col=COL.seat; metal=.1; rough=.8; }
    else if(k==='tyreF'||k==='tyreR'){ col=COL.tyre; metal=.05; rough=.92; } else if(k==='rim'){ col=COL.rim; metal=.9; rough=.35; }
    else if(md<90){ col=COL.small; metal=.9; rough=.35; }
    const m=p.node.material.clone(); m.color=new THREE.Color(col); m.metalness=metal; m.roughness=rough; p.node.material=m; });

  const hostPart=by.get(DECAL_PART);                                     // the sticker on the side panel, as on the real bike
  if(hostPart) DECALS.forEach(D=>{ const hit=new THREE.Raycaster(new THREE.Vector3(D.x,D.y,1200), new THREE.Vector3(0,0,-1)).intersectObject(hostPart.node,false)[0]; if(!hit) return;
    const n=hit.face.normal.clone().transformDirection(hostPart.node.matrixWorld); if(n.z<0) n.negate();
    const d=new THREE.Vector3(Math.cos(DECAL_ANG),Math.sin(DECAL_ANG),0), u=d.sub(n.clone().multiplyScalar(n.dot(d))).normalize(), v=new THREE.Vector3().crossVectors(n,u);
    const tex=new THREE.TextureLoader().load(D.src,()=>{dirty=true;}); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(D.w,D.w/D.ratio), new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
    mesh.position.copy(hit.point).addScaledVector(n,1.5); mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n)); root.add(mesh); });

  ready=true; dirty=true; resize(); host.classList.add('ready');
}

/* ---- view ---- */
// how far the stage has travelled up the screen: 0 as it enters at the foot, 1 as it leaves at the top
function scrollFrac(){ const r=host.getBoundingClientRect(); return Math.min(Math.max((innerHeight-r.top)/(innerHeight+Math.max(r.height,1)),0),1); }
function place(){
  const w=host.clientWidth, h=host.clientHeight, aspect=w/Math.max(h,1), f=scrollFrac();
  const az=VIEW.az+look.x*0.2+(f-0.5)*0.7, el=VIEW.el-look.y*0.04, dist=radius*VIEW.d*Math.max(1,1.55/aspect);
  camera.position.set(VIEW.t[0]+dist*Math.cos(el)*Math.sin(az), VIEW.t[1]+dist*Math.sin(el), VIEW.t[2]+dist*Math.cos(el)*Math.cos(az));
  camera.lookAt(VIEW.t[0],VIEW.t[1],VIEW.t[2]); camera.updateMatrixWorld(true);
  return { w, h, f };
}
const _v=new THREE.Vector3();
function pins(st){                                                        // labels and their leader lines follow the parts
  if(!pinsBox) return;
  const k=Math.min(1.15,Math.max(.62,st.w/900)), fade=1; let d='';
  pinsBox.style.opacity=fade; lines.style.opacity=fade;
  pinsBox.querySelectorAll('[data-pin]').forEach(el=>{ const p=PINS[el.dataset.pin]; if(!p) return;
    _v.set(p.at[0],p.at[1],p.at[2]).project(camera);
    const ax=(_v.x*.5+.5)*st.w, ay=(-_v.y*.5+.5)*st.h, ly=ay+p.off[1]*k; let lx=ax+p.off[0]*k;
    const bw=el.offsetWidth, left=p.off[0]<0 ? lx-bw : lx, fix=Math.max(8-left,0)+Math.min(st.w-8-(left+bw),0);   // keep the label inside the stage
    el.style.transform='translate('+(lx+fix).toFixed(1)+'px,'+ly.toFixed(1)+'px) translate('+(p.off[0]<0?'-100%':'0')+','+(p.off[1]<0?'-100%':'0')+')';
    lx+=fix; d+='M'+ax.toFixed(1)+' '+ay.toFixed(1)+'L'+lx.toFixed(1)+' '+ly.toFixed(1)+'M'+(ax+3).toFixed(1)+' '+ay.toFixed(1)+'a3 3 0 1 0 -6 0a3 3 0 1 0 6 0'; });
  lines.setAttribute('viewBox','0 0 '+st.w+' '+st.h); lines.firstElementChild.setAttribute('d',d);
}
function resize(){ const w=host.clientWidth, h=host.clientHeight; if(!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); dirty=true; }
new ResizeObserver(resize).observe(host);
addEventListener('scroll',()=>{ dirty=true; },{passive:true});
if(!reduce && matchMedia('(pointer:fine)').matches) addEventListener('pointermove',e=>{ look.tx=e.clientX/innerWidth*2-1; look.ty=e.clientY/innerHeight*2-1; },{passive:true});

(function loop(){ requestAnimationFrame(loop); if(!ready) return;
  const dx=look.tx-look.x, dy=look.ty-look.y; if(Math.abs(dx)+Math.abs(dy)>0.002){ look.x+=dx*0.06; look.y+=dy*0.06; dirty=true; }
  if(!dirty) return; dirty=false;
  { const r=host.getBoundingClientRect(); if(r.bottom<0 || r.top>innerHeight) return; }   // off screen: draw nothing
  const st=place(); pins(st); renderer.render(scene,camera);
})();
window.__home={ ready:()=>ready, draw:()=>{ const st=place(); pins(st); renderer.render(scene,camera); return [st.w,st.h]; } };
