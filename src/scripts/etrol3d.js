/* Etrol page, first screens: the pack, live, held on screen while the page scrolls, as on the Challenger 3D page.
   Six stops: closed (the headline), then the lid, the seal, the control board and the core come apart one after the
   other, each brought forward while the rest fade back, and the pack closes again at the end.
   The model is BNC's own CAD (nov_24_2026_battery_1.glb, converted by cad/batt_stageA.js + batt_stageB.js; parts.json
   says which layer each part belongs to). The Etrol name on the case is put on here: the CAD has no lettering. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const sec = document.getElementById('inside'), host = document.getElementById('open-stage'), canvas = document.getElementById('open-c');
if (sec && host && canvas) (function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DIR = '/assets/model/etrol/';
  const LAYERS = ['case', 'core', 'links', 'board', 'seal', 'lid'];
  const OPEN = { case: 0, core: 150, links: 200, board: 252, seal: 318, lid: 372 };       // how far each layer stands above its place when open (mm)
  // one stop per screen: is the pack open, which layers come forward (null = all), and the camera: the point it looks
  // at (mm, with the pack open or closed as that stop has it), the height and width it frames, and where it stands
  const STOPS = [
    { open: 0, on: null,               at: [0, 158, 0],   h: 470, w: 330, az: 0.62, el: 0.20 },   // the whole pack
    { open: 1, on: ['lid'],            at: [0, 668, 0],   h: 215, w: 330, az: 0.48, el: 0.40 },   // the lid and its handle, from a little above
    { open: 1, on: ['seal'],           at: [0, 606, 0],   h: 190, w: 320, az: 0.86, el: 0.30 },   // the seal, under the lid's rim
    { open: 1, on: ['board', 'links'], at: [30, 505, 20], h: 185, w: 250, az: 0.34, el: 0.62 },   // the control board, looking down on it
    { open: 1, on: ['core'],           at: [0, 300, 0],   h: 330, w: 320, az: 0.80, el: 0.14 },   // the core, rising out of the case
    { open: 0, on: null,               at: [0, 162, 0],   h: 372, w: 300, az: 0.16, el: 0.06 }    // closed again, the name square on
  ];
  const LOGO = { src: '/assets/img/etrol/etrol-mark.png', ratio: 987 / 280, w: 112, y: 132 };   // on the case's front face
  const LOOK = { case: [0x101113, 0.25, 0.62], lid: [0x0c0d0f, 0.2, 0.55], seal: [0x24262a, 0.1, 0.8] };   // colour, metalness, roughness

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 10, 20000);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  [[0xffffff, 2.6, [-4, 8, 7]], [0xdfe8ff, 1.0, [7, 3, 4]], [0xffffff, 2.2, [3, 6, -8]]].forEach(([c, i, p]) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); });
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const root = new THREE.Group(); scene.add(root);
  { const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s; const x = cv.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(0,0,0,.3)'); g.addColorStop(.6, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(520, 400), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -1; m.renderOrder = -1; scene.add(m); }

  const groups = {}; LAYERS.forEach(k => { groups[k] = new THREE.Group(); root.add(groups[k]); });
  const parts = [];                                      // { mat, base, layer }
  const st = { ready: false, S: 0, ST: 0, drag: 0, dirty: true, logo: null, seen: false };
  const ground = () => new THREE.Color(getComputedStyle(host).getPropertyValue('--stage').trim() || '#e9ebed');
  const smooth = (a, b, t) => { t = Math.min(Math.max((t - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  /* ---- where the page is: stop i is reached when its screen meets the top of the held stage ---- */
  const steps = [...sec.querySelectorAll('.open__step')];
  const pin = new URLSearchParams(location.search).get('stop');                    // ?stop=3 holds the scene at one stop, for checking
  function progress() { if (pin !== null) return Math.max(0, Math.min(steps.length - 1, parseFloat(pin) || 0)); if (steps.length < 2) return 0;
    const top = parseFloat(getComputedStyle(host).top) || 0, y = scrollY + top, T = steps.map(e => e.getBoundingClientRect().top + scrollY);
    if (y <= T[0]) return 0; const n = T.length; if (y >= T[n - 1]) return n - 1;
    let i = 0; while (i < n - 2 && y >= T[i + 1]) i++; return i + (y - T[i]) / (T[i + 1] - T[i]); }
  addEventListener('scroll', () => { st.ST = progress(); }, { passive: true });

  const loader = new GLTFLoader(); const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/'); loader.setDRACOLoader(draco);
  fetch(DIR + 'parts.json').then(r => r.json()).then(meta => {
    const info = new Map(meta.parts.map(p => [p.name, p]));
    loader.load(DIR + 'etrol.glb', gltf => {
      const meshes = []; gltf.scene.updateMatrixWorld(true); gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
      meshes.forEach(o => { const m = info.get(o.name) || {}; const layer = groups[m.layer] ? m.layer : 'core';
        let geo = o.geometry; try { geo = toCreasedNormals(geo, 0.6); } catch (e) { /* flat shading below */ }
        const look = LOOK[layer]; const c = m.color ? new THREE.Color().setRGB(m.color[0], m.color[1], m.color[2], THREE.SRGBColorSpace) : new THREE.Color(0x9aa0a8);
        const hsl = {}; c.getHSL(hsl); const grey = hsl.s < 0.12;
        const mat = new THREE.MeshStandardMaterial({ color: look ? look[0] : c, metalness: look ? look[1] : (grey ? 0.75 : 0.1), roughness: look ? look[2] : (grey ? 0.38 : 0.6), flatShading: !geo.attributes.normal });
        const mesh = new THREE.Mesh(geo, mat); mesh.applyMatrix4(o.matrixWorld); groups[layer].add(mesh);
        parts.push({ mat, base: mat.color.clone(), layer }); });
      // the Etrol name on the front of the case
      const box = new THREE.Box3().setFromObject(groups.case);
      const tex = new THREE.TextureLoader().load(LOGO.src, () => { st.dirty = true; }); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(LOGO.w, LOGO.w / LOGO.ratio), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      logo.position.set((box.min.x + box.max.x) / 2, LOGO.y, box.max.z + 0.6); logo.renderOrder = 2; groups.case.add(logo); st.logo = logo;
      st.ST = st.S = progress(); st.ready = true; st.dirty = true; host.classList.add('ready'); resize();
    }, undefined, e => { host.classList.add('failed'); console.error(e); });
  }).catch(e => { host.classList.add('failed'); console.error(e); });

  /* ---- turning it by hand (added to the turn each stop gives it) ---- */
  let grab = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; grab = { x: e.clientX, d: st.drag }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', e => { if (!grab) return; st.drag = grab.d - (e.clientX - grab.x) * 0.008; st.dirty = true; });
  const drop = () => { grab = null; canvas.style.cursor = ''; }; canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);

  /* ---- drawing ---- */
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; /* on narrow screens the canvas is the upper part of the stage */ if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); st.dirty = true; }
  new ResizeObserver(resize).observe(host);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { st.seen = e.isIntersecting; st.dirty = true; })).observe(host);
  new MutationObserver(() => { st.dirty = true; }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  function frame() {
    const n = STOPS.length, i = Math.min(Math.floor(st.S), n - 2), f = smooth(0.18, 0.82, st.S - i), A = STOPS[i], B = STOPS[i + 1];
    const open = mix(A.open, B.open, f), e = open;
    LAYERS.forEach(k => { groups[k].position.y = OPEN[k] * e; });
    const g = ground();
    parts.forEach(p => { const wa = (!A.on || A.on.includes(p.layer)) ? 1 : 0, wb = (!B.on || B.on.includes(p.layer)) ? 1 : 0, w = mix(wa, wb, f); p.mat.color.copy(g).lerp(p.base, 0.2 + 0.8 * w); });
    if (st.logo) { const wa = (!A.on || A.on.includes('case')) ? 1 : 0, wb = (!B.on || B.on.includes('case')) ? 1 : 0; st.logo.material.opacity = 0.22 + 0.78 * mix(wa, wb, f); }
    // the camera moves from stop to stop: target, framing, turn and height all in step with the scroll
    const wide = host.clientWidth > 860, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tx = mix(A.at[0], B.at[0], f), ty = mix(A.at[1], B.at[1], f), tz = mix(A.at[2], B.at[2], f);
    const fh = mix(A.h, B.h, f), fw = mix(A.w, B.w, f), el = mix(A.el, B.el, f);
    const sway = (reduce || !st.seen) ? 0 : 0.045 * Math.sin(performance.now() / 1700);
    const az = mix(A.az, B.az, f) + st.drag + sway;
    const room = wide ? 0.56 : 0.92;                                             // wide screens: the pack keeps to the right of the words
    const dist = Math.max((fh / 2) / t, (fw / 2) / (t * camera.aspect * room)) * 1.12;
    camera.position.set(tx + dist * Math.cos(el) * Math.sin(az), ty + dist * Math.sin(el), tz + dist * Math.cos(el) * Math.cos(az)); camera.lookAt(tx, ty, tz);
    const W = renderer.domElement.width, Hh = renderer.domElement.height;
    if (wide) camera.setViewOffset(W, Hh, -0.2 * W, 0, W, Hh); else camera.clearViewOffset();   // wide: to the right of the words; narrow: the canvas itself sits above them
    renderer.render(scene, camera);
  }
  (function loop() { requestAnimationFrame(loop); if (!st.ready) return;
    const d = st.ST - st.S;
    if (Math.abs(d) > 0.0005) { st.S = reduce ? st.ST : st.S + d * 0.12; st.dirty = true; } else st.S = st.ST;
    if (!st.dirty && !(st.seen && !reduce)) return; st.dirty = false; frame(); })();   // while on screen it keeps drawing: the pack sways a little
  window.__etrol = { ready: () => st.ready, sync: () => { st.S = st.ST = progress(); frame(); return +st.S.toFixed(2); }, at: (s) => { st.S = st.ST = s; frame(); return s; } };
})();
