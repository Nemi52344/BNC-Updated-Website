import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPINE = ['Front','Overview','Frame','Battery','Boot','Drive','Suspension','Wheels','Colours'];

/* ---------------------------------------------------------------------------
   SEGMENT MAP: every part of /assets/model/challenger_c.glb carries the CAD's own part number, and parts.json says
   which segment it belongs to (`seg`). That map is written by cad/v34_segments.js, checked part by part against the
   v3.4 CAD (front of bike = -X):
     frame   the exoskeleton: both loops, the inner tubes and the grab rail
     seat    cushion and its base (move as one)
     pack    the Etrol 40 pack, leaning forward in its compartment        lid   the wall on the rider's side of it (panel,
             slotted plate, mat with the handle cut-out): it tips back first, then the pack tips back on its base
     dock    the tray the bay stands on          hatch   the bay's rear wall, the boot when one pack is carried
     fork    the upper fork tubes and their clamp           shock   the lower fork legs, which slide up over them
     link    what the lower legs carry: brake caliper and its bracket          fender   front mudguard and stays
     tyreF, tyreR, wheelF (what turns with the front wheel), motor (hub motor and what turns with the rear wheel)
--------------------------------------------------------------------------- */
const SEG_KEYS = ['frame','seat','pack','lid','dock','hatch','fork','fender','tyreF','tyreR','motor','wheelF','link','shock','lampGlass','lampChrome','lampGlow'];
const LID_BODY = 'B_B_MAT_4MM_THICK_FRONT';                        // the wall's mat: its lowest rear edge is the lid's hinge
const REMOVED = new Set();                                         // parts not shown are left out when the model is built (the centre stand)
const FORK_SEAL = /^12_SUS_CUP_/;                                  // top of each lower fork leg: with the axle, gives the fork's line
// The sticker on the bike itself, as the real bike carries it: on the left body shell, in the band between the two diagonal
// frame tubes, parallel to them and a little nearer the rear one. x/y = each line's centre in mm, w = its length in mm.
const DECAL_PART = '2A011514B016_2_1', DECAL_ANG = 0.966;             // rad: the tubes' slope, climbing toward the seat
const DECALS = [
  { x:207.7, y:510, w:250, src:'/assets/img/BNC-Home-image/challenger_logo.png', ratio:848/76 },     // CHALLENGER
  { x:137.8, y:453.8, w:60, src:'/assets/img/challenger_v3/bnc-mark-white.png', ratio:835/201 }             // the BNC mark above its first letters
];
// The Etrol mark on the pack (green lettering, as the real pack carries it). face: which side of the pack it is on;
// w = its length in mm; dy = how far above the pack's middle.
const ETROL_MARK = { src:'/assets/img/etrol/etrol-mark.png', ratio:987/280 };
const PACK_DECALS = [ { face:'front', w:168, dy:26 } ];      // one mark, on the front (user, 2026-11-26)
const LID_TILT = 0.88;    // rad: the wall tips back on its base edge until it lies along the bay's rear wall
const PACK_TILT = 0.62;   // rad: the pack then tips back on its own base edge, from leaning forward to leaning toward the rider

// Which segments stay SOLID in each section (null = whole bike solid). Everything else turns to glass.
const SOLID = [ null, null, ['frame'], ['pack','dock'], ['seat','frame','hatch'], ['motor','tyreR'], ['link','shock','fork','fender','tyreF','wheelF'], null, null ];
// Which segments are the featured "hero" of each section (lightened so they read against the glass).
const HERO  = [ [], [], [], ['pack'], [], ['motor'], ['shock'], [], [] ];

const COL = { frame:0xc41f2d, seat:0x121314, tyre:0x0c0d0f, rim:0x3d4249, body:0x1f2227, small:0x3f444b, pack:0x14161a };
const GLASS = new THREE.Color(0x9aa6b2), HEROC = new THREE.Color(0xd5dae0);        // dark page: pale glass, featured part lightened
const GLASS_L = new THREE.Color(0x59626b), HEROC_L = new THREE.Color(0x7d858e);    // light page: darker glass so it shows on the pale ground
const isLight = () => document.documentElement.dataset.theme === 'light';
const GLASS_MIN = 0.075, GLASS_FRAME = 0.20;   // the red frame stays faintly visible as context

/* Camera keyframes per section. t = look-at point in mm (bike centred on X/Z, wheels on Y=0, front = -X),
   az/el orbit angles, d = distance in bike half-lengths, sx = horizontal screen shift (subject away from caption). */
const CAM = [
  { t:[-60, 590, 0], az:-0.92, el:0.10, d:3.3, sx: 0.19, sy:0.05, py:0.13, pd:0.72 },  // 0 FRONT  — the whole bike, front three-quarter, to the right of the figures and in front of the lettering
  { t:[   0, 600, 0], az:-0.45, el:0.14, d:3.55, sx: 0.15, nd:0.20 },  // 1 FULL   — complete body, three-quarter
  { t:[ 120, 620, 0], az: 0.50, el:0.20, d:3.30, sx:-0.15, nd:0.14 },  // 2 FRAME  — exoskeleton in glass
  { t:[-270, 540, 0], az:-0.78, el:0.62, d:1.75, sx: 0.17, pd:0.8 },  // 3 BATTERY — from the front left and above: the pack and its Etrol sticker face the reader as it tips back
  { t:[ 220, 700, 0], az: 0.95, el:0.66, d:1.95, sx:-0.15, nd:0.32 },  // 4 BOOT   — a little from above and closer: the seat up, the open bay under it
  { t:[ 631, 265, 0], az: 0.42, el:0.07, d:1.25, sx: 0.19 },  // 5 DRIVE  — hub motor close-up
  { t:[-650, 400, 0], az:-0.28, el:0.10, d:1.35, sx:-0.17 },  // 6 SUSPENSION + WHEELS — the front fork working on its 14-inch wheel (one section since 2026-11-27)
  { t:[  20, 520, 0], az:-0.58, el:0.08, d:3.40, sx:-0.13, nd:0.36 },  // 7 COLOURS — the whole bike, three-quarter, beside the swatches
  { t:[   0, 470, 0], az:-0.42, el:0.14, d:4.80, sx: 0.10, sy:-0.06, py:-0.07 }   // 8 FINALE — hero (phone: below the buttons)
];
const NSEC = CAM.length;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
const SHADOWS = innerWidth > 700;                    // parts shade each other; left off on phones
if(SHADOWS){ renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 1, 60000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const KEY = 2.5;
const key = new THREE.DirectionalLight(0xffffff, KEY); key.position.set(-5, 9, 7); scene.add(key); scene.add(key.target);
const keyN = new THREE.DirectionalLight(0xffffff, 0); keyN.position.set(-5, 9, 7); scene.add(keyN);      // the same light without shadows: the two share KEY, so shadows can fade with no change of brightness
const fill = new THREE.DirectionalLight(0xdfe6ff, 0.9); fill.position.set(7, 3, 4); scene.add(fill);
const rim  = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(4, 6, -9); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffffff, 0.9); rim2.position.set(-6, 4, -8); scene.add(rim2);
scene.add(new THREE.AmbientLight(0xffffff, 0.28));

function floorTex(){
  const s=256,cv=document.createElement('canvas');cv.width=cv.height=s;const x=cv.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.6,'rgba(0,0,0,.2)');g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(cv);
}
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7,3.2),
  new THREE.MeshBasicMaterial({map:floorTex(),transparent:true,depthWrite:false,opacity:.9}));
shadow.rotation.x=-Math.PI/2; shadow.renderOrder=-1; scene.add(shadow);

const root = new THREE.Group(); scene.add(root);
const state = { parts:[], byName:new Map(), ready:false, freeze:false, center:new THREE.Vector3(), radius:1, seat:null, pack:null, lid:null };

function pct(arr,p){const s=[...arr].sort((a,b)=>a-b);return s[Math.max(0,Math.floor(p*(s.length-1)))];}
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{t=Math.min(Math.max((t-a)/(b-a),0),1);return t*t*(3-2*t);};

const loader = new GLTFLoader();
// the model is Draco-compressed (cad/v34_compress.js: 6.8 MB -> 2.1 MB); the decoder comes with three
const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
loader.setDRACOLoader(dracoLoader);
const lbar=document.getElementById('lbar'), lsub=document.getElementById('lsub');
let partsMeta=null;
fetch('/assets/model/parts.json').then(r=>r.ok?r.json():null).then(j=>{partsMeta=j;init();}).catch(()=>init());

function init(){
  loader.load('/assets/model/challenger_c.glb', onModel, (e)=>{
    if(e.total){const p=Math.round(e.loaded/e.total*100);lbar.style.width=p+'%';lsub.textContent='Loading model '+p+'%';}
  }, (err)=>{lsub.textContent='3D view unavailable';console.error(err);});
}

function onModel(gltf){
  const model = gltf.scene;
  root.add(model);

  // stray parts far from the bike (from parts.json centroids)
  let outliers = new Set();
  if(partsMeta && partsMeta.parts){
    const P=partsMeta.parts;
    const bounds=[0,1,2].map(ax=>{const c=P.map(p=>p.centroid[ax]);const lo=pct(c,.03),hi=pct(c,.97),span=Math.max(hi-lo,1);return [lo-0.55*span,hi+0.55*span];});
    P.forEach(p=>{for(let ax=0;ax<3;ax++){ if(p.centroid[ax]<bounds[ax][0]||p.centroid[ax]>bounds[ax][1]){ outliers.add(p.name); break; } }});
  }
  const meshes=[];
  model.traverse(o=>{ if(o.isMesh){ if(outliers.has(o.name) || REMOVED.has(o.name)){ o.visible=false; } else meshes.push(o); } });
  { const t0=performance.now(); meshes.forEach(o=>{ if(!o.geometry.attributes.normal){ const g=creased(o.geometry, CREASE); o.geometry.dispose(); o.geometry=g; } }); state.smoothMs=Math.round(performance.now()-t0); }   // smooth panels, crisp corners

  // an older Z-up export is stood upright (the v3.4 file is written Y-up, so nothing turns)
  { let yy,zz;
    if(partsMeta&&partsMeta.size){ yy=partsMeta.size[1]; zz=partsMeta.size[2]; }
    else { model.updateMatrixWorld(true); const raw=new THREE.Box3(); meshes.forEach(o=>raw.expandByObject(o)); const rs=raw.getSize(new THREE.Vector3()); yy=rs.y; zz=rs.z; }
    if(zz > yy*1.15) model.rotation.x = Math.PI/2; }

  // centre on X/Z, wheels on the floor
  const measure=()=>{ model.updateMatrixWorld(true); const b=new THREE.Box3(); meshes.forEach(o=>b.expandByObject(o)); return b; };
  const c0=measure().getCenter(new THREE.Vector3());
  model.position.x -= c0.x; model.position.z -= c0.z;
  model.position.y -= measure().min.y;
  const b3=measure(); b3.getCenter(state.center);
  const fs=b3.getSize(new THREE.Vector3());
  state.radius=Math.max(fs.x, fs.y)*0.5; state.bikeLen=fs.x; state.bikeHt=fs.y;
  shadow.position.y=1; shadow.scale.set(fs.x/7*1.25, fs.z/3.2*1.4, 1);
  if(SHADOWS){                                          // the key light looks at the bike from where it already shines, and its shadow box holds the whole bike
    const R=state.radius, dir=new THREE.Vector3(-5,9,7).normalize();
    key.target.position.copy(state.center); key.position.copy(state.center).addScaledVector(dir, R*4);
    key.castShadow=true; const sc=key.shadow.camera; sc.left=-R*1.35; sc.right=R*1.35; sc.top=R*1.35; sc.bottom=-R*1.35; sc.near=R*0.5; sc.far=R*8; sc.updateProjectionMatrix();
    key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.0006; key.shadow.normalBias=R*0.006; key.shadow.radius=5;
    meshes.forEach(o=>{ o.castShadow=true; o.receiveShadow=true; });
  }
  model.updateMatrixWorld(true);

  // ---- build parts ----
  const parts=meshes.map(o=>{
    const bb=new THREE.Box3().setFromObject(o);
    return { node:o, name:o.name, bb, c:bb.getCenter(new THREE.Vector3()), s:bb.getSize(new THREE.Vector3()), seg:null };
  });
  parts.forEach(p=>state.byName.set(p.name,p));

  // segments, as parts.json names them
  const segOf = new Map(); if(partsMeta && partsMeta.parts) partsMeta.parts.forEach(p=>{ if(p.seg) segOf.set(p.name, p.seg); });
  const seg = {}; SEG_KEYS.forEach(k=>{ seg[k]=[]; });
  parts.forEach(p=>{ const k=segOf.get(p.name); if(k && seg[k]){ seg[k].push(p); p.seg=k; } });
  { const i=seg.lid.findIndex(p=>p.name===LID_BODY); if(i>0) seg.lid.unshift(seg.lid.splice(i,1)[0]); }   // the mat first: it sets the lid's hinge
  state.seg=seg;

  // ---- colours by segment ----
  parts.forEach(p=>{
    let col=COL.body, metal=0.04, rough=0.6, coat=0, coatR=0.3;        // panels: matt plastic
    const k=p.seg, maxd=Math.max(p.s.x,p.s.y,p.s.z);
    if(k==='frame'){ col=COL.frame; metal=0.1; rough=0.42; coat=0.35; coatR=0.3; }     // powder coat under a clear coat
    else if(k==='seat'){ col=COL.seat; metal=0; rough=0.88; }
    else if(k==='pack'){ col=COL.pack; metal=0.08; rough=0.5; p.heroK=[0.0,0.035]; p.heroE=[0.012,0.03]; p.top=1; }     // the pack keeps its own black: featured, it is only lifted a little on the dark page
    else if(k==='tyreF'||k==='tyreR'){ col=COL.tyre; metal=0; rough=0.94; }
    else if(k==='motor'||k==='wheelF'){ col=COL.rim; metal=0.85; rough=0.4; }
    else if(k==='lampGlass'){ col=0xe9eef4; metal=0; rough=0.05; p.alpha=0.26; }          // clear lens: you see the reflector through it
    else if(k==='lampChrome'){ col=0xf3f5f8; metal=1; rough=0.14; }
    else if(k==='lampGlow'){ col=0xffffff; metal=0; rough=0.3; p.glow=1.1; }
    else if(maxd<90){ col=COL.small; metal=0.8; rough=0.42; }
    const mat=new THREE.MeshPhysicalMaterial({ side:p.node.material.side }); mat.clearcoat=coat; mat.clearcoatRoughness=coatR; mat.envMapIntensity=(k==='frame') ? 0.75 : 1.0;
    mat.color=new THREE.Color(col); mat.metalness=metal; mat.roughness=rough;
    mat.emissive=new THREE.Color(0xffffff); mat.emissiveIntensity=0;
    mat.transparent=true;            // compiled alpha-capable once; solid vs glass is then just opacity + depthWrite
    p.node.material=mat; p.mat=mat; p.base=new THREE.Color(col);
    p.gmin = (k==='frame') ? GLASS_FRAME : GLASS_MIN;
    p.sol  = SOLID.map(list=> list===null ? 1 : (list.includes(k)?1:0));
    p.hero = HERO.map(list=> list.includes(k)?1:0);
  });
  state.parts=parts;

  // ---- movers ----
  const union=(arr)=>{ const b=new THREE.Box3(); arr.forEach(p=>b.union(p.bb)); return b; };
  root.updateMatrixWorld(true);
  if(seg.seat.length){                       // seat hinges at its FRONT edge (front of bike = -X), rear lifts
    const sb=union(seg.seat);
    const g=new THREE.Group(); g.position.set(sb.min.x+18, sb.min.y+8, (sb.min.z+sb.max.z)/2);
    root.add(g); root.updateMatrixWorld(true); seg.seat.forEach(p=>g.attach(p.node));
    state.seat=g;
  }
  // battery: a group hinged on the lowest rear edge of its first part, read from the real vertices (the parts lean, so
  // their box corners are not on that edge). Base edge fixed, top swings back toward the rider.
  const hinged=(list, rearCorner)=>{ if(!list.length) return null;
    const v=new THREE.Vector3(); const pts=[]; let minY=Infinity;
    list.slice(0,1).forEach(p=>{ const pos=p.node.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(p.node.matrixWorld); pts.push(v.x,v.y); if(v.y<minY) minY=v.y; } });
    let hx=-Infinity, hy=minY;
    if(rearCorner){ let best=-Infinity; for(let i=0;i<pts.length;i+=2){ const k=pts[i]-pts[i+1]; if(k>best){ best=k; hx=pts[i]; hy=pts[i+1]; } } }   // furthest toward the rear and down
    else for(let i=0;i<pts.length;i+=2){ if(pts[i+1]<minY+40 && pts[i]>hx){ hx=pts[i]; hy=pts[i+1]; } }
    const pb=union(list);
    const g=new THREE.Group(); g.position.set(hx, hy, (pb.min.z+pb.max.z)/2);
    root.add(g); root.updateMatrixWorld(true); list.forEach(p=>g.attach(p.node));
    return { g, hinge:[Math.round(hx),Math.round(hy)] }; };
  state.lid = hinged(seg.lid);                // the wall on the rider's side of the pack
  state.pack = hinged(seg.pack, true);        // the pack itself, on its rear bottom edge
  // wheels turn on their axles: the rear one with its hub motor, the front one with its hub
  const wheel=(tyre, hubParts)=>{ if(!tyre) return null;
    const g=new THREE.Group(); g.position.set(tyre.c.x, tyre.c.y, tyre.c.z);
    root.add(g); root.updateMatrixWorld(true); [tyre, ...hubParts].forEach(p=>g.attach(p.node)); return g; };
  state.wheelR = wheel(seg.tyreR[0], seg.motor);
  state.wheelF = wheel(seg.tyreF[0], seg.wheelF);

  // front suspension: a telescopic fork. The lower legs slide up over the upper tubes and take the wheel, the mudguard
  // and the brake caliper with them
  { const ty=seg.tyreF[0], tyR=seg.tyreR[0];
    if(ty && tyR && state.wheelF && seg.shock.length){
      let ux=0.42, uy=0.907;                                                  // up the fork: it leans back about 25 degrees
      const seals=seg.shock.filter(p=>FORK_SEAL.test(p.name));
      if(seals.length){ let x=0, y=0; seals.forEach(p=>{ x+=p.c.x; y+=p.c.y; }); x=x/seals.length-ty.c.x; y=y/seals.length-ty.c.y;
        const l=Math.hypot(x,y); if(l>50 && y>0){ ux=x/l; uy=y/l; } }
      const forkG=new THREE.Group(); root.add(forkG); root.updateMatrixWorld(true);
      [...seg.shock, ...seg.link, ...seg.fender].forEach(p=>forkG.attach(p.node)); forkG.attach(state.wheelF);
      state.susp={ forkG, ux, uy, A:new THREE.Vector2(ty.c.x,ty.c.y), base:tyR.c.x-ty.c.x, rearX:tyR.c.x };
    }
  }

  { const host=state.byName.get(DECAL_PART);                    // find the panel's surface under each line's centre
    state.decals=[];
    if(host) DECALS.forEach(D=>{
      const rc=new THREE.Raycaster(new THREE.Vector3(D.x,D.y,1200), new THREE.Vector3(0,0,-1));
      const hit=rc.intersectObject(host.node,false)[0]; if(!hit) return;
      const n=hit.face.normal.clone().transformDirection(host.node.matrixWorld); if(n.z<0) n.negate();
      const d=new THREE.Vector3(Math.cos(DECAL_ANG),Math.sin(DECAL_ANG),0);
      const u=d.sub(n.clone().multiplyScalar(n.dot(d))).normalize(), v=new THREE.Vector3().crossVectors(n,u);
      const tex=new THREE.TextureLoader().load(D.src,()=>{ dirty=true; });
      tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
      const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, toneMapped:false, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4 });
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(D.w, D.w/D.ratio), mat);
      mesh.position.copy(hit.point).addScaledVector(n,1.5);
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n));
      mesh.renderOrder=1; root.add(mesh);
      state.decals.push({ mesh, mat, host, n:[+n.x.toFixed(2),+n.y.toFixed(2),+n.z.toFixed(2)], at:[Math.round(hit.point.x),Math.round(hit.point.y),Math.round(hit.point.z)] });
    });
  }

  // the Etrol mark on the pack: found on the pack's real surface, then made a child of the pack's group
  if(state.pack && seg.pack.length){
    const pb=union(seg.pack), pc=pb.getCenter(new THREE.Vector3()), nodes=seg.pack.map(p=>p.node), hostP=seg.pack[0];
    const cast=(o,d)=>{ const h=new THREE.Raycaster(o,d).intersectObjects(nodes,false)[0]; if(!h) return null;
      const n=h.face.normal.clone().transformDirection(h.object.matrixWorld); if(n.dot(d)>0) n.negate(); return { p:h.point, n }; };
    const front=cast(new THREE.Vector3(pb.min.x-600, pc.y, pc.z), new THREE.Vector3(1,0,0));     // the broad face toward the front of the bike
    const up=new THREE.Vector3(0,1,0);
    PACK_DECALS.forEach(D=>{
      let hit=null, uHint=null;
      if(D.face==='front'){ hit=cast(new THREE.Vector3(pb.min.x-600, pc.y+D.dy, pc.z), new THREE.Vector3(1,0,0)); uHint=new THREE.Vector3(0,0,1); }      // read from in front: left to right is toward +Z
      else { const x = front ? front.p.x + (pb.max.x-pb.min.x)*0.30 : pc.x;                                                                                // a little behind the front face, on the left side
        hit=cast(new THREE.Vector3(x, pc.y+D.dy, pb.max.z+600), new THREE.Vector3(0,0,-1));
        uHint = front ? front.n.clone().negate() : new THREE.Vector3(1,0,0); }                                                                           // read from the left: along the pack's depth, toward the rear
      if(!hit) return;
      const n=hit.n, u=uHint.sub(n.clone().multiplyScalar(n.dot(uHint))).normalize(), v=new THREE.Vector3().crossVectors(n,u);
      if(v.dot(up)<0){ u.negate(); v.negate(); }
      const tex=new THREE.TextureLoader().load(ETROL_MARK.src,()=>{ dirty=true; });
      tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
      const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, toneMapped:false, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4 });
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(D.w, D.w/ETROL_MARK.ratio), mat);
      mesh.position.copy(hit.p).addScaledVector(n,1.2);
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n));
      mesh.renderOrder=4; root.add(mesh); root.updateMatrixWorld(true); state.pack.g.attach(mesh);
      state.decals.push({ mesh, mat, host:hostP, inside:true, n:[+n.x.toFixed(2),+n.y.toFixed(2),+n.z.toFixed(2)], at:[Math.round(hit.p.x),Math.round(hit.p.y),Math.round(hit.p.z)] });
    });
  }

  targetP=scrollProgress(); dirty=true;
  state.ready=true;
  document.getElementById('loader').classList.add('gone'); document.documentElement.classList.add('loaded');
  rollFacts();
  buildSpine(); onResize(); render();
}

/* Smoothed normals for a part that has none. Faces that meet at a vertex at less than the crease angle share their light
   (weighted by area); sharper edges stay crisp. The part is welded by position in the file, so its index gives the
   neighbours directly. Returns a new geometry without an index. */
const CREASE = 42;                                   // degrees
function creased(geo, deg){
  const pa=geo.attributes.position, pos=new Float32Array(pa.count*3);          /* read through the attribute: the file stores positions as scaled integers */
  for(let i=0;i<pa.count;i++){ pos[3*i]=pa.getX(i); pos[3*i+1]=pa.getY(i); pos[3*i+2]=pa.getZ(i); }
  let idx=geo.index?geo.index.array:null;
  if(!idx){ idx=new Uint32Array(pos.length/3); for(let i=0;i<idx.length;i++) idx[i]=i; }
  const nF=(idx.length/3)|0, nV=(pos.length/3)|0, cos=Math.cos(deg*Math.PI/180);
  const fa=new Float32Array(nF*3), fu=new Float32Array(nF*3);           // face normal: area-weighted, and unit
  for(let t=0;t<nF;t++){ const a=idx[3*t]*3,b=idx[3*t+1]*3,c=idx[3*t+2]*3;
    const ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2], vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
    const x=uy*vz-uz*vy, y=uz*vx-ux*vz, z=ux*vy-uy*vx, l=Math.hypot(x,y,z)||1;
    fa[3*t]=x;fa[3*t+1]=y;fa[3*t+2]=z; fu[3*t]=x/l;fu[3*t+1]=y/l;fu[3*t+2]=z/l; }
  const start=new Uint32Array(nV+1); for(let i=0;i<idx.length;i++) start[idx[i]+1]++;
  for(let v=0;v<nV;v++) start[v+1]+=start[v];
  const fill=start.slice(0,nV), adj=new Uint32Array(idx.length);
  for(let t=0;t<nF;t++) for(let k=0;k<3;k++){ const v=idx[3*t+k]; adj[fill[v]++]=t; }
  const P=new Float32Array(nF*9), N=new Float32Array(nF*9);
  for(let t=0;t<nF;t++){ const tx=fu[3*t],ty=fu[3*t+1],tz=fu[3*t+2];
    for(let k=0;k<3;k++){ const v=idx[3*t+k], o=(3*t+k)*3; let x=0,y=0,z=0;
      for(let j=start[v];j<start[v+1];j++){ const g=adj[j]*3; if(fu[g]*tx+fu[g+1]*ty+fu[g+2]*tz>=cos){ x+=fa[g]; y+=fa[g+1]; z+=fa[g+2]; } }
      const l=Math.hypot(x,y,z); if(l>0){ x/=l;y/=l;z/=l; } else { x=tx;y=ty;z=tz; }
      P[o]=pos[3*v];P[o+1]=pos[3*v+1];P[o+2]=pos[3*v+2]; N[o]=x;N[o+1]=y;N[o+2]=z; } }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P,3)); out.setAttribute('normal', new THREE.BufferAttribute(N,3));
  out.computeBoundingBox(); out.computeBoundingSphere(); return out;
}

function buildSpine(){
  const el=document.getElementById('spine'); if(!el) return;   // the section list is optional
  el.innerHTML = SPINE.map((s,i)=>`<div class="dot" data-i="${i}"><b>${s}</b><i></i></div>`).join('');
}

let targetP=0, curP=0;
// Progress 0..1 across the 3D sections, read from where each one really sits on the page: section i is "reached"
// when its top meets the top of the screen. Sections may be any height, and other sections may sit between them.
let secEls=null;
function scrollProgress(){
  if(!secEls) secEls=[...document.querySelectorAll('[data-sec]')].sort((a,b)=>a.dataset.sec-b.dataset.sec);
  const n=secEls.length; if(n<2) return 0;
  const tops=secEls.map(e=>e.offsetTop);
  const end=document.documentElement.scrollHeight-innerHeight;          // the last scene is also reached when the page ends
  tops[n-1]=Math.max(Math.min(tops[n-1], end), tops[n-2]+1);
  const y=scrollY;
  if(y<=tops[0]) return 0;
  if(y>=tops[n-1]) return 1;
  let i=0; while(i<n-2 && y>=tops[i+1]) i++;
  return (i + (y-tops[i])/(tops[i+1]-tops[i]))/(n-1);
}
let dirty=true;                                   // something changed that needs a new frame
// first screen: the bike turns a little toward the pointer (mouse only; eased; fades out as the page scrolls on)
const look={x:0,y:0,tx:0,ty:0};
const lookWeight=S=>1-smooth(0,0.7,S);
if(!reduce && matchMedia('(pointer:fine)').matches)
  addEventListener('pointermove',e=>{ look.tx=e.clientX/innerWidth*2-1; look.ty=e.clientY/innerHeight*2-1; },{passive:true});
addEventListener('scroll',()=>{targetP=scrollProgress();},{passive:true});
/* phones: a caption rests in the lower half and the bike above it. As a caption scrolls up to leave it would pass over the
   bike with its veil and hide it, so it fades out before it gets there (found in the scroll check, 2026-11-26). */
const caps=[...document.querySelectorAll('.panel .cap')];
const capFade=()=>{ const narrow=innerWidth<=600, vh=innerHeight; caps.forEach(c=>{ if(!narrow){ if(c.style.opacity) c.style.opacity=''; return; } const t=c.getBoundingClientRect().top; c.style.opacity=Math.min(1,Math.max(0,(t-vh*0.32)/(vh*0.16))).toFixed(3); }); };
addEventListener('scroll',capFade,{passive:true}); addEventListener('resize',capFade); capFade();

const sections=[...document.querySelectorAll('[data-sec]')];
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){
  e.target.classList.add('in');
  const s=+e.target.dataset.sec;
  document.querySelectorAll('.spine .dot').forEach(d=>d.classList.toggle('on',+d.dataset.i===s));
}});},{threshold:.5});
sections.forEach(s=>io.observe(s));
const fin=document.getElementById('finale');
new IntersectionObserver((es)=>es.forEach(e=>e.isIntersecting&&fin.classList.add('in')),{threshold:.3}).observe(fin);

const hint=document.getElementById('hint');
const hintSync=()=>{ if(hint) hint.style.visibility=scrollY>60?'hidden':'visible'; };   // gone at once, no fade to get stuck
addEventListener('scroll',hintSync,{passive:true}); hintSync();

/* ---- per-frame: camera, glass/solid paint, movers ---- */
function segOf(p){ const seg=p*(NSEC-1); const i=Math.min(Math.floor(seg), NSEC-2); return [i, smooth(0,1,seg-i)]; }

function cameraFor(p){
  const [i,f]=segOf(p); const a=CAM[i], b=CAM[i+1];
  const tx=lerp(a.t[0],b.t[0],f), ty=lerp(a.t[1],b.t[1],f), tz=lerp(a.t[2],b.t[2],f);
  const lk=lookWeight(p*(NSEC-1));
  const az=lerp(a.az,b.az,f)+look.x*0.15*lk, el=lerp(a.el,b.el,f)-look.y*0.035*lk;
  const aspect=innerWidth/innerHeight;
  const fit=Math.min(2.6, Math.max(1, 1.45/aspect));          // pull back on narrow screens
  const narrow=Math.min(1, Math.max(0, (1.6-aspect)/0.5));        /* nd: extra distance on a narrow desktop window (the app pane), where the caption leaves the subject less room */
  const dist=state.radius*lerp(a.d,b.d,f)*fit*(innerWidth>600 ? 1+lerp(a.nd??0, b.nd??0, f)*narrow : lerp(a.pd??1, b.pd??1, f));   /* pd: phone-only distance factor */
  camera.position.set(tx+dist*Math.cos(el)*Math.sin(az), ty+dist*Math.sin(el), tz+dist*Math.cos(el)*Math.cos(az));
  camera.lookAt(tx,ty,tz);
  const wide = innerWidth>600;
  const sx = wide ? lerp(a.sx,b.sx,f) * Math.min(1.5, Math.max(1, 1.62/aspect)) : 0;   // narrower windows: further from the caption                    // desktop: slide the subject away from the caption
  const sy = wide ? lerp(a.sy??0, b.sy??0, f) : lerp(a.py??0.21, b.py??0.21, f);      // phone: lift the subject above the caption at the foot (py per keyframe)
  const W=renderer.domElement.width, H=renderer.domElement.height;
  if(Math.abs(sx)>0.001 || sy) camera.setViewOffset(W,H,-sx*W,sy*H,W,H); else camera.clearViewOffset();
}

function paint(p){
  const [i,f]=segOf(p);
  const light=isLight(), GL=light?GLASS_L:GLASS, HC=light?HEROC_L:HEROC, gk=light?1.7:1;
  const fe=smooth(0.4,0.6,f);                         // solid and glass change places in the middle fifth of the travel: a visitor who stops scrolling almost never lands on a half-faded bike
  let minS=1;
  for(const pt of state.parts){
    const s = lerp(pt.sol[i],pt.sol[i+1],fe);
    const h = lerp(pt.hero[i],pt.hero[i+1],fe);
    if(s<minS) minS=s;
    const gm = Math.min(pt.gmin*gk, 0.4);
    const op = (gm + (1-gm)*s) * (pt.alpha||1);
    const m=pt.mat, glassy = op<0.995;
    m.depthWrite=!glassy; m.opacity=op; pt.node.castShadow=!glassy;        /* a part that is glass throws no shadow */
    pt.node.renderOrder = glassy ? 2 : (pt.top ? 3 : 0);          /* the pack is drawn after the glass, so nothing hazes it */
    m.color.copy(pt.base).lerp(GL,(light ? 1-s*s*s : 1-s)*0.75)       /* light page: goes to the glass tone early, so a half-faded part is pale, not dark and blotchy; dark page: evenly, or the bike would flash white */.lerp(HC,h*(pt.heroK ? pt.heroK[light?0:1] : (light?0.25:0.5)));
    m.emissiveIntensity = h*(pt.heroE ? pt.heroE[light?0:1] : 0.07) + (pt.glow||0)*s;
  }
  if(SHADOWS){ const w=smooth(0.82,1,minS);           // shadows between parts only while the whole bike is solid
    key.intensity=KEY*w; keyN.intensity=KEY*(1-w); renderer.shadowMap.autoUpdate = w>0.001; }
  const opened=1-smooth(0.3,0.9,minS);                // 0 while the whole bike is solid, 1 once it is opened up
  if(state.decals) state.decals.forEach(k=>{ let o=Math.max(0,(k.host.mat.opacity-0.5)/0.5);    // the sticker shows while its panel is solid
    if(k.inside) o*=opened;                           /* the Etrol mark sits inside the body: on the closed bike its bright green showed through the gap behind the fork (user, 2026-11-26) */
    k.mat.opacity=o; k.mesh.visible=o>0.01; });
}

function movers(p){
  const S=p*(NSEC-1);  // position in sections: 3 = battery, 4 = boot, 5 = drive, 6 = suspension and wheels, 7 = colours
  if(state.seat){
    const open = Math.max(0, smooth(3.62,4.02,S) - smooth(4.32,4.72,S));
    state.seat.rotation.z = open*0.92;                         // rear of the seat rises ~53 deg
  }
  if(state.lid){                                               // the wall opens first and closes last
    const out = Math.max(0, smooth(2.62,3.02,S) - smooth(3.30,3.68,S));
    state.lid.g.rotation.z = -out*LID_TILT;
  }
  if(state.pack){
    const out = Math.max(0, smooth(2.78,3.06,S) - smooth(3.26,3.56,S));
    state.pack.g.rotation.z = -out*PACK_TILT;                  // top swings back toward the rider, base fixed
  }
  // Drive (section 5): the hub motor turns the rear wheel as the section passes; Wheels (7): both roll on a little
  if(!reduce){
    const drive=smooth(4.35,5.6,S), roll=0;   /* the separate wheels section, where both rolled on, is gone */
    if(state.wheelR) state.wheelR.rotation.z = Math.PI*2*(1.25*drive + 0.5*roll);
    state.wheelRoll = Math.PI*2*(0.5*roll);
  }
  // Suspension (section 6): the fork is pressed down and let go again and again while the section is on screen
  suspend(suspLift(S));
}

// How far the front of the bike is pressed down onto its suspension (mm) at section position S, now.
// Every 2.6 s: pressed down, held a moment, let go. Faded in and out with the section.
function suspWeight(S){ return Math.max(0, smooth(5.45,5.9,S) - smooth(6.3,6.75,S)); }
function suspLift(S){
  const w=suspWeight(S); if(w<=0 || reduce) return 0;
  const t=(performance.now()/1000)%2.6;
  return w * 50 * (smooth(0,0.6,t) - smooth(0.95,1.75,t));
}
// The wheel stays on the ground: the lower legs ride up the fork by the lift, and the whole bike dips over them about
// the rear tyre's contact.
const _w=new THREE.Vector3();
function suspend(lift){
  const s=state.susp; if(!s) return;
  const c=lift/s.uy;                                             // travel along the fork for that much rise
  s.forkG.position.set(s.ux*c, s.uy*c, 0);
  const phi=lift/s.base;                                         // the bike dips at the front
  state.wheelF.rotation.z=(state.wheelRoll||0)-phi;              // the wheel itself stands still on the ground
  root.rotation.z=phi; root.position.set(s.rearX-s.rearX*Math.cos(phi), -s.rearX*Math.sin(phi), 0);
  if(lift){ root.updateMatrixWorld(true); state.wheelF.getWorldPosition(_w);          // hold the front axle exactly where it rests
    root.position.x += s.A.x-_w.x; root.position.y += s.A.y-_w.y; }
}

function frameAt(p){ cameraFor(p); movers(p); paint(p); renderer.render(scene,camera); }

function render(){
  requestAnimationFrame(render);
  if(!state.ready || state.freeze) return;
  if(reduce){                                      // reduced motion: no travel, the scene steps to each section's finished view
    const q=Math.round(targetP*(NSEC-1))/(NSEC-1);
    if(q!==curP || dirty){ curP=q; dirty=false; frameAt(q); }
    return;
  }
  const d=targetP-curP;
  toneStep();                                       // a colour change in progress
  if(suspWeight(curP*(NSEC-1))>0) dirty=true;       // the suspension section animates on its own
  if(lookWeight(curP*(NSEC-1))>0){ const lx=look.tx-look.x, ly=look.ty-look.y;
    if(Math.abs(lx)+Math.abs(ly)>0.002){ look.x+=lx*0.06; look.y+=ly*0.06; dirty=true; } }
  if(Math.abs(d)<0.00005 && !dirty) return;        // at rest: draw nothing
  curP = Math.abs(d)<0.00005 ? targetP : curP+d*0.09;
  dirty=false; frameAt(curP);
}

function onResize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
addEventListener('resize',onResize);
onResize();

/* ---- frame colour: the bike's four colours; the page's one accent (--hl) follows the pick ---- */
const TONES = { red:[0xc41f2d,'#d7232b','Crimson Red','It’s a picker-upper.'], black:[0x1b1c1e,'#e6e8ea','Panther Black','It’s my happy colour.'],
                blue:[0x1d66c2,'#3f8fe0','Azure Blue','I’m a “blue sky thinker”.'], green:[0x77805f,'#9aa27f','Commando Green','The colour of youth and growth.'] };
const toneBtns=[...document.querySelectorAll('[data-tone]')], toneName=document.getElementById('tone-name'), toneLine=document.getElementById('tone-line');
const toneOrder=toneBtns.map(b=>b.dataset.tone).filter(k=>TONES[k]);
let toneNow=toneOrder[0]||'red', toneTween=null;                  // toneTween: the frame's paint on its way to the next colour
function setTone(key, byUser){
  const t=TONES[key]; if(!t) return;
  toneNow=key;
  if(state.seg && state.seg.frame.length){
    if(reduce) state.seg.frame.forEach(p=>p.base.setHex(t[0]));
    else toneTween={ from:state.seg.frame[0].base.clone(), to:new THREE.Color(t[0]), t0:performance.now(), ms:700 };
  }
  document.documentElement.style.setProperty('--hl', t[1]);
  toneBtns.forEach(x=>x.setAttribute('aria-pressed', String(x.dataset.tone===key)));
  if(toneName){ toneName.setAttribute('aria-live', byUser ? 'polite' : 'off'); toneName.textContent=t[2]; }   // the automatic change is not read out
  if(toneLine) toneLine.textContent=t[3];
  dirty=true;
}
function toneStep(){                                              // called every frame: blend the frame's paint
  if(!toneTween || !state.seg) return;
  const k=Math.min(1,(performance.now()-toneTween.t0)/toneTween.ms), e=k*k*(3-2*k);
  state.seg.frame.forEach(p=>p.base.copy(toneTween.from).lerp(toneTween.to,e));
  dirty=true; if(k>=1) toneTween=null;
}
// automatic change while the colours section is on screen; a pick by hand ends it
let toneTimer=0, toneAuto=!reduce;
const toneSec=toneBtns.length ? toneBtns[0].closest('section') : null;
const toneStop=()=>{ clearInterval(toneTimer); toneTimer=0; };
toneBtns.forEach(b=>b.addEventListener('click',()=>{ toneAuto=false; toneStop(); setTone(b.dataset.tone,true); }));
if(toneSec && toneAuto && 'IntersectionObserver' in window){
  new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting && toneAuto && !toneTimer)
      toneTimer=setInterval(()=>{ setTone(toneOrder[(toneOrder.indexOf(toneNow)+1)%toneOrder.length], false); }, 2800);
    else if(!e.isIntersecting) toneStop();
  }),{threshold:.45}).observe(toneSec);
}

/* ---- first screen: the lettering behind the bike, and the figures ---- */
const bgword=document.getElementById('bgword');
function fitWord(){                                  // each line exactly as wide as the page (desktop); a phone sets it in three lines
  if(!bgword) return;
  const lines=[...bgword.children], wide=innerWidth>600, target=bgword.clientWidth;
  lines.forEach(l=>{ l.style.fontSize=''; if(!wide) return;
    const w=l.getBoundingClientRect().width; if(w>0) l.style.fontSize=(parseFloat(getComputedStyle(l).fontSize)*target/w)+'px'; });
  if(!wide) return;
  const foot=document.querySelector('.hero__id'), figs=document.getElementById('hfacts');
  const limit=Math.min(foot?foot.getBoundingClientRect().top+scrollY:1e9, figs?figs.getBoundingClientRect().top+scrollY:1e9) - 16;
  const top=bgword.offsetTop, h=bgword.offsetHeight;
  if(top+h>limit && limit-top>60){ const k=(limit-top)/h; lines.forEach(l=>{ l.style.fontSize=(parseFloat(getComputedStyle(l).fontSize)*k)+'px'; }); }   // a short window: smaller, centred
}
function moveWord(){ if(!bgword) return;               // it leaves with the first screen, as if it were on the page
  const y=scrollY; bgword.style.transform='translateY('+(-y)+'px)'; bgword.style.visibility = y>innerHeight*1.3 ? 'hidden' : 'visible'; }
addEventListener('scroll',moveWord,{passive:true}); addEventListener('resize',()=>{fitWord();moveWord();});
fitWord(); moveWord(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitWord);

function rollFacts(){                                 // each digit is a strip of 0 to 9 that rolls to its number, like an odometer
  const box=document.getElementById('hfacts'); if(!box || reduce) return;
  box.querySelectorAll('[data-roll]').forEach((el,k)=>{
    const digits=String(el.dataset.roll).split(''); el.textContent='';
    digits.forEach((ch,i)=>{ const od=document.createElement('span'); od.className='od'; od.setAttribute('aria-hidden','true');
      const strip=document.createElement('span'); strip.className='od__strip'; strip.style.setProperty('--d',ch); strip.style.setProperty('--w',(k*0.18+i*0.08)+'s');
      for(let n=0;n<10;n++){ const b=document.createElement('b'); b.textContent=n; strip.appendChild(b); }
      od.appendChild(strip); el.appendChild(od); });
  });
  requestAnimationFrame(()=>requestAnimationFrame(()=>box.classList.add('go')));
  setTimeout(()=>box.classList.add('go'),400);        // in case frames are held back
}

/* ---- gallery: three sets side by side; the names, the arrows, a swipe or the arrow keys move between them ---- */
const gTrack=document.getElementById('g-track');
if(gTrack){
  const slides=[...gTrack.children], tabs=[...document.querySelectorAll('#g-tabs button')];
  const gPrev=document.getElementById('g-prev'), gNext=document.getElementById('g-next'), gNote=document.getElementById('g-note'), gCount=document.getElementById('g-count');
  let cur=-1;
  let gT=0;
  const go=i=>{ const left=Math.max(0,Math.min(slides.length-1,i))*gTrack.clientWidth; gTrack.scrollTo({left, behavior: reduce ? 'auto' : 'smooth'});
    clearTimeout(gT); gT=setTimeout(()=>{ if(Math.abs(gTrack.scrollLeft-left)>4) gTrack.scrollTo({left, behavior:'auto'}); },900); };
  const sync=()=>{ const i=Math.max(0,Math.min(slides.length-1,Math.round(gTrack.scrollLeft/Math.max(1,gTrack.clientWidth)))); if(i===cur) return; cur=i;
    tabs.forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i)));
    if(gNote) gNote.textContent=slides[i].dataset.note||''; if(gCount) gCount.textContent=(i+1)+' / '+slides.length;
    if(gPrev) gPrev.disabled=i<=0; if(gNext) gNext.disabled=i>=slides.length-1; };
  tabs.forEach((b,k)=>b.addEventListener('click',()=>go(k)));
  if(gPrev) gPrev.addEventListener('click',()=>go(cur-1)); if(gNext) gNext.addEventListener('click',()=>go(cur+1));
  if('IntersectionObserver' in window){ const gio=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ gTrack.querySelectorAll('img[loading]').forEach(im=>{ im.loading='eager'; }); gio.disconnect(); } },{rootMargin:'800px 0px'}); gio.observe(gTrack); }
  gTrack.addEventListener('scroll',sync,{passive:true}); addEventListener('resize',()=>{ gTrack.scrollLeft=Math.max(0,cur)*gTrack.clientWidth; }); sync();
}

/* ---- real life: the soft pattern behind the pictures. Each line is two gentle waves that repeat four times across the
   drawing, so sliding it by one repeat loops without a seam ---- */
{ const bg=document.getElementById('g-bg');
  if(bg){ const W=2400,H=900,P=600,N=24; let d='';
    for(let i=0;i<N;i++){ const y0=-30+i*(H+60)/(N-1); let p='';
      for(let x=0;x<=W;x+=20){ const y=y0+26*Math.sin(2*Math.PI*x/P+i*0.42)+11*Math.sin(4*Math.PI*x/P-i*0.27+1.3); p+=(x?'L':'M')+x+' '+y.toFixed(1); }
      d+='<path d="'+p+'"/>'; }
    bg.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+d+'</svg>'; } }

/* ---- gallery films: muted loops that run only while they are on screen ---- */
const films=[...document.querySelectorAll('.gallery video')];
if(films.length && !reduce && 'IntersectionObserver' in window){
  const fio=new IntersectionObserver(es=>es.forEach(e=>{ const v=e.target;
    if(e.isIntersecting && !v.dataset.paused){ const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{}); } else v.pause(); }),{threshold:.35});
  films.forEach(v=>{ fio.observe(v); v.style.cursor='pointer';
    v.addEventListener('click',()=>{ if(v.paused){ delete v.dataset.paused; v.play(); } else { v.dataset.paused='1'; v.pause(); } }); });
} else films.forEach(v=>{ v.controls=true; });

/* ---- dark / light switch ---- */
const modeBtn=document.getElementById('mode');
const applyMode=()=>{ const l=isLight(); if(modeBtn) modeBtn.setAttribute('aria-pressed', String(l));
  const tc=document.getElementById('theme-color'); if(tc) tc.content = l ? '#f4f4f2' : '#08090a'; dirty=true; };
if(modeBtn) modeBtn.addEventListener('click',()=>{ const next=isLight()?'dark':'light';
  document.documentElement.dataset.theme=next; try{ localStorage.setItem('reveal-theme',next); }catch(e){} applyMode(); });
applyMode();

/* ---- inspection tools (used to build and verify the segment map) ---- */
window.__dbg = {
  ready:()=>state.ready, n:()=>state.parts.length, smoothMs:()=>state.smoothMs,
  freeze:(f)=>{ state.freeze=!!f; return state.freeze; },
  setP:(p)=>{ curP=targetP=p; frameAt(p); return 'sec '+(p*(NSEC-1)).toFixed(2); },
  hinge:()=>[state.lid&&state.lid.hinge, state.pack&&state.pack.hinge],
  sync:()=>{ curP=targetP=scrollProgress(); frameAt(curP); return +(curP*(NSEC-1)).toFixed(2); },   // jump the scene to the scroll position (no easing)
  lift:(mm)=>{ suspend(mm); renderer.render(scene,camera); return state.susp?[+state.susp.forkG.position.x.toFixed(1), +state.susp.forkG.position.y.toFixed(1), +state.susp.ux.toFixed(3), +state.susp.uy.toFixed(3)]:null; },
  cam:(i,o)=>{ Object.assign(CAM[i],o); frameAt(curP); return JSON.stringify(CAM[i]); },
  decal:()=>state.decals?state.decals.map(k=>({n:k.n, at:k.at})):null,
  axle:()=>{ root.updateMatrixWorld(true); const v=new THREE.Vector3(); state.wheelF.getWorldPosition(v); return [+v.x.toFixed(1),+v.y.toFixed(1)]; },
  tone:()=>[toneNow, toneAuto, !!toneTimer, state.seg?'#'+state.seg.frame[0].base.getHexString():null],
  wheels:()=>[state.wheelR?+state.wheelR.rotation.z.toFixed(2):null, state.wheelF?+state.wheelF.rotation.z.toFixed(2):null],
  segs:()=>Object.fromEntries(Object.entries(state.seg).map(([k,v])=>[k,v.length])),
  parts:()=>state.parts.map(p=>[p.name,Math.round(p.c.x),Math.round(p.c.y),Math.round(p.c.z),Math.round(p.s.x),Math.round(p.s.y),Math.round(p.s.z),p.seg||'']),
  view:(az,el,d,tx,ty,tz)=>{ camera.clearViewOffset(); const dist=state.radius*d; camera.position.set(tx+dist*Math.cos(el)*Math.sin(az), ty+dist*Math.sin(el), tz+dist*Math.cos(el)*Math.cos(az)); camera.lookAt(tx,ty,tz); renderer.render(scene,camera); return 'view'; },
  mark:(groups,ghost)=>{ const col=new Map(); for(const k in groups) groups[k].forEach(n=>col.set(n,parseInt(k,16)));
    const g=(ghost===undefined)?0.07:ghost;
    state.parts.forEach(p=>{ const c=col.get(p.name); const on=c!==undefined;
      p.node.visible = on || g>0; p.node.renderOrder=on?0:2;
      p.mat.opacity=on?1:g; p.mat.depthWrite=on;
      p.mat.color.set(on?c:0x9aa3ad); p.mat.emissive.set(on?c:0x000000); p.mat.emissiveIntensity=on?0.25:0; });
    renderer.render(scene,camera); return col.size; },
  unmark:()=>{ state.parts.forEach(p=>{ p.node.visible=true; p.mat.emissive.set(0xffffff); }); frameAt(curP); return 'ok'; }
};
