#!/usr/bin/env node
/* BNC Motors website: build.
   node build.js           builds the site into dist/
   node build.js --serve   builds, then serves dist/ at http://localhost:8084 (PORT=... for another port)

   No dependencies. What it does:
     1. src/pages/**.html      -> dist/<address>/index.html
        A page starts with a few facts between --- lines (title, description, nav, styles, scripts ...).
        `layout: none` pages are whole documents; the others are wrapped in src/layouts/site.html.
        {{> header}} and {{> footer}} bring in src/partials/header.html and footer.html.
     2. src/styles/**          -> dist/assets/css/**
        src/scripts/**         -> dist/assets/js/**
        public/**              -> dist/**            (images, the 3D model, vendor files, documents)
     3. every link to a css or js file of ours gets ?v=<its content hash>, so a changed file is never served stale
     4. redirects.json         -> dist/_redirects (Netlify) and a small forwarding page at each old address (any host)
     5. every local link, image, style and script named in dist is checked to exist; the build fails if one does not */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname, SRC = path.join(ROOT, 'src'), PUB = path.join(ROOT, 'public'), DIST = path.join(ROOT, 'dist');
const read = f => fs.readFileSync(f, 'utf8');
const walk = (dir, out = []) => { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); e.isDirectory() ? walk(f, out) : out.push(f); } return out; };
const put = (rel, data) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const copyTree = (from, toRel) => { for (const f of walk(from)) { const dest = path.join(DIST, toRel, path.relative(from, f)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f, dest); } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function build() {
  const t0 = Date.now();
  fs.rmSync(DIST, { recursive: true, force: true });
  copyTree(PUB, '');
  copyTree(path.join(SRC, 'styles'), 'assets/css');
  copyTree(path.join(SRC, 'scripts'), 'assets/js');

  const layouts = {}, partials = {};
  for (const f of walk(path.join(SRC, 'layouts'))) layouts[path.basename(f, '.html')] = read(f);
  for (const f of walk(path.join(SRC, 'partials'))) partials[path.basename(f, '.html')] = read(f).trim();

  /* ---- pages ---- */
  const pagesDir = path.join(SRC, 'pages'); let n = 0;
  for (const file of walk(pagesDir).filter(f => f.endsWith('.html'))) {
    const rel = path.relative(pagesDir, file).split(path.sep).join('/');
    const out = /(^|\/)index\.html$/.test(rel) ? rel : rel.replace(/\.html$/, '/index.html');     /* about.html -> about/index.html */
    let text = read(file), page = {};
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (fm) { text = text.slice(fm[0].length); for (const line of fm[1].split(/\r?\n/)) { const i = line.indexOf(':'); if (i > 0) page[line.slice(0, i).trim()] = line.slice(i + 1).trim(); } }
    let headExtra = ''; text = text.replace(/<!--head-->\r?\n?([\s\S]*?)<!--\/head-->\r?\n?/, (all, h) => { headExtra = h.trim(); return ''; });
    const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean);
    const fill = s => s
      .replace(/\{\{> ?(\w+)\}\}/g, (all, name) => { if (!(name in partials)) throw new Error(rel + ': no partial "' + name + '"'); return partials[name]; })
      .replace(/\{\{current:(\w+)\}\}/g, (all, key) => key === page.nav ? ' aria-current="page"' : '')
      .replace(/\{\{footnote\}\}/g, page.footnote ? ' ' + page.footnote : '');
    let html;
    if ((page.layout || 'site') === 'none') html = fill(text);
    else {
      const layout = layouts[page.layout || 'site']; if (!layout) throw new Error(rel + ': no layout "' + page.layout + '"');
      html = fill(layout
        .replace('{{styles}}', list(page.styles).map(s => `<link rel="stylesheet" href="/assets/css/${s}">`).join('\n'))
        .replace('{{head}}', () => headExtra)
        .replace('{{scripts}}', list(page.scripts).map(s => `<script src="/assets/js/${s}"></script>`).concat(list(page.modules).map(s => `<script type="module" src="/assets/js/${s}"></script>`)).join('\n'))
        .replace('{{content}}', () => text.trim()))
        .replace(/\{\{title\}\}/g, () => page.title || '').replace(/\{\{description\}\}/g, () => page.description || '')
        .replace(/\{\{ogTitle\}\}/g, () => page.ogTitle || page.title || '').replace(/\{\{ogDescription\}\}/g, () => page.ogDescription || page.description || '')
        .replace(/\n{3,}/g, '\n\n');
    }
    put(out, html); n++;
  }

  /* ---- old addresses ---- */
  const redirects = fs.existsSync(path.join(ROOT, 'redirects.json')) ? JSON.parse(read(path.join(ROOT, 'redirects.json'))) : [];
  const lines = [];
  for (const r of redirects) {
    lines.push(r.from + '  ' + r.to + '  301!');
    const bare = r.from.replace(/\.html$/, '');       /* the old site also answered without .html; skip it where that IS the new address (/about -> /about/ would loop) */
    const kept = bare === r.to.split('#')[0].replace(/\/$/, '');       /* this page kept its name: about.html -> /about/ */
    if (bare !== r.from && !kept) lines.push(bare + '  ' + r.to + '  301!');
    if (kept) continue;        /* no forwarding page either: about.html would sit beside the folder about/ and be served in its place */
    put(r.from.replace(/^\//, ''), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="robots" content="noindex">\n<meta http-equiv="refresh" content="0; url=${esc(r.to)}">\n<link rel="canonical" href="${esc(r.to)}">\n<title>BNC Motors</title>\n</head>\n<body>\n<p><a href="${esc(r.to)}">This page has moved. Continue to BNC Motors.</a></p>\n</body>\n</html>\n`);
  }
  if (lines.length) put('_redirects', lines.join('\n') + '\n');

  /* ---- version every css / js of ours that a page names ---- */
  const hashes = {};
  const hashOf = url => { if (!(url in hashes)) { const f = path.join(DIST, url); hashes[url] = fs.existsSync(f) ? crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8) : null; } return hashes[url]; };
  const htmlFiles = walk(DIST).filter(f => f.endsWith('.html'));
  for (const f of htmlFiles) { const s = read(f); const t = s.replace(/((?:href|src)=")(\/assets\/(?:css|js)\/[^"?#]+\.(?:css|js))(")/g, (all, a, url, z) => { const h = hashOf(url); return h ? a + url + '?v=' + h + z : all; }); if (t !== s) fs.writeFileSync(f, t); }

  /* ---- check: everything a page or stylesheet names must exist ---- */
  const missing = new Set();
  const exists = url => { let u = url.split('#')[0].split('?')[0]; if (!/(\/|\.[A-Za-z0-9]{2,5})$/.test(u)) return true;   /* a path a script is still putting together, not an address */ try { u = decodeURIComponent(u); } catch (e) {} if (!u.startsWith('/')) return true; const f = path.join(DIST, u); return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html'))); };
  for (const f of walk(DIST).filter(f => /\.(html|css)$/.test(f))) {
    const s = read(f), where = '/' + path.relative(DIST, f).split(path.sep).join('/'); let m;
    const reA = /(?:src|href|poster)\s*=\s*["'](\/[^"']*)["']/g; while ((m = reA.exec(s))) if (!m[1].startsWith('//') && !exists(m[1])) missing.add(m[1] + '   (in ' + where + ')');
    const reS = /srcset\s*=\s*["']([^"']+)["']/g; while ((m = reS.exec(s))) for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith('/') && !exists(u)) missing.add(u + '   (in ' + where + ')'); }
    const reU = /url\(\s*["']?(\/[^"')]+)["']?\s*\)/g; while ((m = reU.exec(s))) if (!m[1].startsWith('//') && !exists(m[1])) missing.add(m[1] + '   (in ' + where + ')');
  }
  console.log(`built ${n} pages, ${redirects.length} redirects, ${walk(DIST).length} files in ${Date.now() - t0} ms`);
  if (missing.size) { console.error('\nMISSING (' + missing.size + '):\n  ' + [...missing].join('\n  ')); process.exitCode = 1; }
}

function serve() {
  const http = require('http'), PORT = Number(process.env.PORT) || 8084;
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.eot': 'application/vnd.ms-fontobject', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
  http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = '/'; }
    let f = path.join(DIST, p); if (!f.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden'); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); } f = path.join(f, 'index.html'); }
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  }).listen(PORT, () => console.log('serving dist at http://localhost:' + PORT));
}

build();
if (process.argv.includes('--serve')) serve();
