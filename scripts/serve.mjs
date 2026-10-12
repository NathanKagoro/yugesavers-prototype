// Tiny static server that mimics GitHub Pages serving the site from a subfolder.
//   node scripts/serve.mjs [dir=dist] [port=4380] [base=/yugesavers-prototype/]
import { createServer } from 'node:http';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain',
};

export function serve(dir = 'dist', port = 4380, base = '/yugesavers-prototype/') {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith(base)) { res.writeHead(404); return res.end('outside base'); }
    let file = join(root, p.slice(base.length) || 'index.html');
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      return res.end(readFileSync(join(root, '404.html')));
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir, port, base] = process.argv.slice(2);
  await serve(dir, port ? Number(port) : undefined, base);
  console.log(`http://127.0.0.1:${port || 4380}${base || '/yugesavers-prototype/'}`);
}
