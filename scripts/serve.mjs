import http from 'node:http';
import { realpathSync, statSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../examples/alex-lin/dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf'
};

function within(root, file) {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path);
}

function normalizeMount(mount) {
  if (typeof mount !== 'string' || !mount.startsWith('/') || /[\\%?#]/.test(mount) ||
      mount.includes('//') || mount.split('/').some(part => part.startsWith('.'))) {
    throw new TypeError('mount must be a safe absolute URL directory such as /demo/');
  }
  return mount === '/' ? '/' : mount.replace(/\/$/, '') + '/';
}

function reply(req, res, status, message, extra = {}) {
  const body = Buffer.from(message + '\n');
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
    ...extra
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Create an unbound static server. Only direct CLI execution opens a port. */
export function createStaticServer({ root = defaultRoot, mount = '/' } = {}) {
  const base = realpathSync(resolve(root));
  if (!statSync(base).isDirectory()) throw new TypeError('root must be a directory');
  const prefix = normalizeMount(mount);

  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      reply(req, res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
      return;
    }
    const target = req.url ?? '/';
    const queryAt = target.indexOf('?');
    const rawPath = queryAt < 0 ? target : target.slice(0, queryAt);
    const query = queryAt < 0 ? '' : target.slice(queryAt);
    if (!rawPath.startsWith('/') || rawPath.startsWith('//')) {
      reply(req, res, 400, 'Invalid request path');
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(rawPath); }
    catch { reply(req, res, 400, 'Invalid request path'); return; }
    if (/[\u0000-\u001f\u007f]/.test(pathname)) {
      reply(req, res, 400, 'Invalid request path');
      return;
    }
    // Check the raw decoded segments before URL/path normalization can erase "..".
    if (/[\\:]/.test(pathname) || pathname.split('/').some(part => part.startsWith('.'))) {
      reply(req, res, 403, 'Forbidden');
      return;
    }
    if (pathname.startsWith('//') || pathname.includes('//')) {
      reply(req, res, 400, 'Invalid request path');
      return;
    }
    if (prefix !== '/' && pathname === prefix.slice(0, -1)) {
      reply(req, res, 308, 'Directory redirect', { Location: prefix + query });
      return;
    }
    if (!pathname.startsWith(prefix)) {
      reply(req, res, 404, 'Not found');
      return;
    }
    const localPath = pathname.slice(prefix.length);
    let candidate = resolve(base, localPath || '.');
    if (!within(base, candidate)) {
      reply(req, res, 403, 'Forbidden');
      return;
    }
    try {
      let actual = await realpath(candidate);
      if (!within(base, actual) || relative(base, actual).split(sep).some(part => part.startsWith('.'))) {
        reply(req, res, 403, 'Forbidden');
        return;
      }
      let info = await stat(actual);
      if (info.isDirectory()) {
        candidate = join(actual, 'index.html');
        actual = await realpath(candidate);
        if (!within(base, actual) || relative(base, actual).split(sep).some(part => part.startsWith('.'))) {
          reply(req, res, 403, 'Forbidden');
          return;
        }
        info = await stat(actual);
        if (!pathname.endsWith('/')) {
          reply(req, res, 308, 'Directory redirect', { Location: rawPath + '/' + query });
          return;
        }
      }
      if (!info.isFile()) {
        reply(req, res, 404, 'Not found');
        return;
      }
      const body = req.method === 'HEAD' ? undefined : await readFile(actual);
      res.writeHead(200, {
        'Content-Type': types[extname(actual).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': body ? body.length : info.size,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache'
      });
      res.end(body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) reply(req, res, 404, 'Not found');
      else if (['EACCES', 'EPERM'].includes(error.code)) reply(req, res, 403, 'Forbidden');
      else {
        console.error('Static request failed:', error.message);
        reply(req, res, 500, 'Static server error');
      }
    }
  });
}

const directlyRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (directlyRun) {
  const port = Number(process.env.PORT ?? 4180);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('PORT must be an integer from 1 to 65535');
  const server = createStaticServer();
  server.once('error', error => { console.error('Unable to start local preview:', error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('Portfolio UI Design: http://127.0.0.1:' + port + '/index.html?lang=en'));
}
