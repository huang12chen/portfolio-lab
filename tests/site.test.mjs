import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const siteRoot = fileURLToPath(new URL('../examples/alex-lin/dist/', import.meta.url));
let fixtures;

before(async () => { fixtures = await mkdtemp(join(tmpdir(), 'portfolio-lab-site-')); });
after(async () => {
  assert.equal(dirname(resolve(fixtures)), resolve(tmpdir()));
  assert.match(basename(fixtures), /^portfolio-lab-site-/);
  await rm(fixtures, { recursive: true, force: true });
});

async function fixture(name) {
  const root = join(fixtures, name);
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body>Fixture home<script type="module" src="./app.js"></script></body></html>');
  await writeFile(join(root, 'project.html'), '<!doctype html><html><body>Fixture case</body></html>');
  await writeFile(join(root, 'about.html'), '<!doctype html><html><body>Fixture about</body></html>');
  await writeFile(join(root, 'styles.css'), 'body { color: black; background-image: url("./assets/shape.svg"); }');
  await writeFile(join(root, 'app.js'), 'import "./dep.js"; export const asset = "./assets/shape.svg";');
  await writeFile(join(root, 'dep.js'), 'export const ready = true;');
  await writeFile(join(root, 'assets', 'shape.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  return root;
}

async function serverFor(t, options) {
  const { createStaticServer } = await import('../scripts/serve.mjs');
  const server = createStaticServer(options);
  assert.equal(server.listening, false, 'importing/creating a server must not open a port');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose())));
  return server;
}

function request(server, path, method = 'GET') {
  return new Promise((resolveResponse, reject) => {
    const outgoing = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method, agent: false }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolveResponse({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

test('serves the real three entry pages and ignores language query strings', async t => {
  const server = await serverFor(t, { root: siteRoot });
  for (const path of ['/', '/index.html?lang=zh', '/project.html?id=signal&lang=en', '/about.html?lang=zh']) {
    const response = await request(server, path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers['content-type'], /^text\/html; charset=utf-8$/);
    assert.match(response.body.toString('utf8'), /<!doctype html>/i);
  }
});

test('serves CSS and JavaScript with safe MIME types and HEAD without a body', async t => {
  const root = await fixture('mime');
  const server = await serverFor(t, { root });
  for (const [path, mime] of [['/styles.css?v=1', /^text\/css/], ['/app.js', /^text\/javascript/], ['/assets/shape.svg', /^image\/svg\+xml/]]) {
    const response = await request(server, path);
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], mime);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  }
  const response = await request(server, '/styles.css', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 0);
  assert.equal(Number(response.headers['content-length']), (await readFile(join(root, 'styles.css'))).length);
});

test('returns an actual plain-text 404 for missing files instead of an HTML fallback', async t => {
  const root = await fixture('missing');
  const server = await serverFor(t, { root });
  for (const path of ['/absent.css', '/assets/absent.jpg', '/absent.html', '/assets/']) {
    const response = await request(server, path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers['content-type'], /^text\/plain/);
    assert.doesNotMatch(response.body.toString(), /<!doctype|<html/i);
  }
});

test('supports a subdirectory mount with real CSS, JS, cases, and a canonical root', async t => {
  const server = await serverFor(t, { root: siteRoot, mount: '/demo/' });
  for (const path of ['/demo/', '/demo/project.html?id=briefly&lang=zh', '/demo/styles.css', '/demo/app.js']) {
    assert.equal((await request(server, path)).status, 200, path);
  }
  for (const path of ['/', '/styles.css', '/demo-other/styles.css']) {
    assert.equal((await request(server, path)).status, 404, path);
  }
  const redirect = await request(server, '/demo?lang=zh');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, '/demo/?lang=zh');
});

test('rejects traversal, encoded separators, Windows paths, and hidden files', async t => {
  const root = await fixture('boundaries');
  await writeFile(join(root, '.env'), 'private fixture');
  await writeFile(join(root, 'assets', '.token'), 'private fixture');
  const server = await serverFor(t, { root });
  for (const path of ['/../outside.txt', '/%2e%2e/outside.txt', '/assets/%2e%2e/%2e%2e/outside.txt', '/%2e%2e%2foutside.txt', '/%2e%2e%5coutside.txt', '/C:/outside.txt', '/.env', '/assets/.token', '/%2eenv']) {
    const response = await request(server, path);
    assert.equal(response.status, 403, path);
    assert.doesNotMatch(response.body.toString(), /private fixture/);
  }
});

test('rejects a directory junction or symlink that resolves outside the static root', async t => {
  const root = await fixture('junction-site');
  const outside = join(fixtures, 'junction-outside');
  await mkdir(outside);
  await writeFile(join(outside, 'secret.txt'), 'outside fixture sentinel');
  await symlink(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  const server = await serverFor(t, { root });
  const response = await request(server, '/escape/secret.txt');
  assert.equal(response.status, 403);
  assert.doesNotMatch(response.body.toString(), /outside fixture sentinel/);
});

test('rejects malformed or absolute request paths and unsupported methods', async t => {
  const root = await fixture('requests');
  const server = await serverFor(t, { root });
  for (const path of ['/%E0%A4%A', '/%00', 'https://example.invalid/index.html', '//example.invalid/index.html']) {
    assert.equal((await request(server, path)).status, 400, path);
  }
  const response = await request(server, '/index.html', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
});

test('rejects unsafe mount configuration', async () => {
  const { createStaticServer } = await import('../scripts/serve.mjs');
  for (const mount of ['../demo', '/demo/../', '/.private/', '/demo?x=1', '//example.invalid/']) {
    assert.throws(() => createStaticServer({ root: siteRoot, mount }), /mount/i);
  }
});

test('the checker accepts local assets and ignores generated template interpolation', async () => {
  const { checkSite } = await import('../scripts/check.mjs');
  const root = await fixture('check-valid');
  await writeFile(join(root, 'app.js'), 'import "./dep.js"; export const asset = "./assets/shape.svg"; const view = `<img src="${picture.src}">`;');
  const result = await checkSite({ root });
  assert.deepEqual(result.errors, []);
  assert.ok(result.syntaxChecked >= 2);
});

test('the checker reports missing HTML, CSS, module, and static JS asset references', async () => {
  const { checkSite } = await import('../scripts/check.mjs');
  const root = await fixture('check-missing');
  await writeFile(join(root, 'index.html'), '<!doctype html><link rel="stylesheet" href="./missing.css">');
  await writeFile(join(root, 'styles.css'), 'body { background: url("./assets/missing.svg"); }');
  await writeFile(join(root, 'app.js'), 'import "./missing-module.js"; export const image = "./assets/missing.jpg";');
  await rm(join(root, 'about.html'));
  const result = await checkSite({ root });
  for (const reference of ['about.html', 'missing.css', 'missing.svg', 'missing-module.js', 'missing.jpg']) {
    assert.ok(result.errors.some(message => message.includes(reference)), reference);
  }
});

test('the checker actually parses JavaScript and rejects invalid UTF-8', async () => {
  const { checkSite } = await import('../scripts/check.mjs');
  const root = await fixture('check-invalid');
  await writeFile(join(root, 'app.js'), 'export const broken = ;');
  await writeFile(join(root, 'notes.txt'), Buffer.from([0xc3, 0x28]));
  const result = await checkSite({ root });
  assert.ok(result.errors.some(message => /JavaScript syntax.*app\.js/.test(message)));
  assert.ok(result.errors.some(message => /UTF-8.*notes\.txt/.test(message)));
});

test('the checker flags runtime external assets, root-relative links, and generic sensitive content', async () => {
  const { checkSite } = await import('../scripts/check.mjs');
  const root = await fixture('check-private');
  await writeFile(join(root, 'index.html'), '<!doctype html><script src="https://example.invalid/app.js"></script><img src="/image.jpg"><a href="https://example.invalid/license">Source</a>');
  await writeFile(join(root, 'notes.txt'), ['C:', 'Users', 'sample-author', 'private.txt'].join('\\'));
  const result = await checkSite({ root });
  assert.ok(result.errors.some(message => /external runtime/i.test(message)));
  assert.ok(result.errors.some(message => /root-relative/i.test(message)));
  assert.ok(result.errors.some(message => /local path/i.test(message)));
  assert.equal(result.errors.some(message => message.includes('example.invalid/license')), false, 'external source-credit links are allowed');
});

test('the checker recognizes valid unquoted HTML asset attributes', async () => {
  const { checkSite } = await import('../scripts/check.mjs');
  const root = await fixture('check-unquoted');
  await writeFile(join(root, 'index.html'), '<!doctype html><script src=https://example.invalid/runtime.js></script><img src=./assets/missing.png><link rel=stylesheet href=./missing.css><source srcset=./assets/first.webp,./assets/second.webp><a href=https://example.invalid/license>Source</a>');
  const result = await checkSite({ root });
  assert.ok(result.errors.some(message => /external runtime/i.test(message)));
  for (const asset of ['missing.png', 'missing.css', 'first.webp', 'second.webp']) {
    assert.ok(result.errors.some(message => message.includes(asset)), asset);
  }
  assert.equal(result.errors.some(message => message.includes('example.invalid/license')), false);
});
