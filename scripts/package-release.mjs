import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkSite } from './check.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const siteDirectory = 'examples/alex-lin/dist';
const publicFiles = [
  '.gitignore', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'DESIGN.md', 'README.md', 'README.zh-CN.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'CHANGELOG.md',
  'docs/INSTALLATION.md', 'docs/USAGE.md', 'docs/QUICK_START.md', 'docs/TROUBLESHOOTING.md', 'docs/SHARING.md', 'docs/MEDIA.md',
  'docs/media/gallery.gif', 'docs/media/story.gif', 'docs/media/portfolio-demo.mp4',
  'docs/DEPLOYMENT.md', 'docs/DEPLOYMENT.zh-CN.md', 'docs/TEACHING.md', 'docs/fictional-resume.md',
  'docs/RELEASE.md', 'docs/RELEASE.zh-CN.md',
  'scripts/serve.mjs', 'scripts/check.mjs', 'scripts/package-release.mjs',
  'tests/demos.test.mjs', 'tests/site.test.mjs', 'tests/release.test.mjs',
  'deploy/nginx.conf', '.github/workflows/pages.yml', '.github/workflows/ci.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml', '.github/ISSUE_TEMPLATE/feature_request.yml', '.github/pull_request_template.md'
];
const screenshotFiles = ['home-desktop.png', 'story-desktop.png', 'growth-demo.png', 'brief-demo.png', 'home-mobile.png', 'about-desktop.png'].map(name => 'docs/screenshots/' + name);
const skillDirectories = ['skills/bespoke-portfolio'];
const requiredFiles = new Set(publicFiles);
const optionalScreenshots = [];
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4']);
const allowedTreeExtensions = new Set([...binaryExtensions, '.html', '.css', '.js', '.mjs', '.cjs', '.json', '.svg', '.txt', '.md', '.xml', '.yaml', '.yml', '.py', '.sh', '.ps1']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = path => path.split(sep).join('/');
const ordered = values => [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
const inside = (root, path) => {
  const value = relative(root, path);
  return value !== '..' && !value.startsWith('..' + sep) && !isAbsolute(value);
};

function safeName(name) {
  if (!name || name.startsWith('/') || /[\\:\u0000-\u001f\u007f]/.test(name) ||
      name.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Unsafe archive path: ' + name);
  }
  return name;
}

function allowedEntry(name) {
  safeName(name);
  const parts = name.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const publicDotfile = (name === '.gitignore') ||
      (i === 0 && part === '.github' && publicFiles.includes(name)) ||
      (part === '.nojekyll' && i === parts.length - 1);
    if ((!publicDotfile && part.startsWith('.')) ||
        /^(?:node_modules|release|artifacts|authoring|evidence|sessions?|browser-data|user-data|__pycache__)$/i.test(part) ||
        /(?:\.env(?:\..*)?|\.log|\.jsonl|\.sqlite3?|\.db|\.har|\.bak|\.tmp|\.pyc)$/i.test(part)) {
      throw new Error('Forbidden private or hidden release entry: ' + name);
    }
  }
}

async function checkedPath(root, name, visited, optional = false) {
  const target = resolve(root, name);
  if (!inside(root, target)) throw new Error('Release path is outside project root');
  let current = root;
  for (const part of relative(root, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    let info;
    try { info = await lstat(current); }
    catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
    visited.add(current);
    if (info.isSymbolicLink()) throw new Error('Symlink, junction or reparse path refused: ' + posix(relative(root, current)));
    const actual = await realpath(current);
    const equal = process.platform === 'win32' ? actual.toLowerCase() === current.toLowerCase() : actual === current;
    if (!inside(root, actual) || !equal) throw new Error('Reparse or outside path refused: ' + posix(relative(root, current)));
  }
  return target;
}

async function collectTree(root, name, selected, visited) {
  allowedEntry(name);
  const full = await checkedPath(root, name, visited);
  const info = await lstat(full);
  if (info.isDirectory()) {
    for (const child of ordered(await readdir(full))) await collectTree(root, name + '/' + child, selected, visited);
  } else if (info.isFile()) {
    if (!allowedTreeExtensions.has(extname(name).toLowerCase()) && !name.endsWith('/.nojekyll')) {
      throw new Error('Unlisted file type in public tree: ' + name);
    }
    if (info.nlink > 1) throw new Error('Hard-linked public file refused: ' + name);
    selected.set(name, full);
  } else throw new Error('Non-regular public file refused: ' + name);
}

function verifyWindowsReparsePoints(paths) {
  if (process.platform !== 'win32') return;
  // Node exposes symbolic links/junctions; the built-in Windows shell also checks other reparse tags.
  // Paths are JSON data on stdin, never interpolated into PowerShell code.
  const command = [
    "$ErrorActionPreference = 'Stop'",
    '[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)',
    '[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)',
    '$paths = ConvertFrom-Json -InputObject ([Console]::In.ReadToEnd())',
    'foreach ($itemPath in $paths) {',
    '  $item = Get-Item -LiteralPath ([string]$itemPath) -Force',
    "  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse point refused' }",
    '}'
  ].join('\n');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    input: JSON.stringify(ordered(paths)), encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 1_000_000
  });
  if (result.error || result.status !== 0) throw new Error('Windows reparse verification failed: ' + (result.error?.message ?? result.stderr.trim()));
}

function verifyPublicText(name, bytes) {
  if (binaryExtensions.has(extname(name).toLowerCase())) return;
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('Invalid UTF-8 in public release file: ' + name); }
  const normalized = text.replaceAll('\\\\', '\\');
  if (/\b[A-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'<>]+/i.test(normalized) ||
      /(?:^|[\s"'=])\/(?:Users|home)\/[^/\s"'<>]+/m.test(normalized) ||
      /\b[A-Z]:\\(?:[^\\\s"'<>]+\\){2}/i.test(normalized)) {
    throw new Error('Potential private local path in public release file: ' + name);
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) ||
      /\b(?:sk-proj-|sk-live-|ghp_)[A-Za-z0-9_-]{20,}/.test(text)) {
    throw new Error('Potential private credential in public release file: ' + name);
  }
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < crcTable.length; i += 1) {
  let value = i;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[i] = value >>> 0;
}
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function writeZip(entries) {
  if (entries.size > 65535) throw new Error('ZIP64 is not supported');
  const local = [], central = [], names = new Set();
  let offset = 0;
  for (const name of ordered(entries.keys())) {
    safeName(name);
    const key = name.normalize('NFC').toLowerCase();
    if (names.has(key)) throw new Error('Duplicate cross-platform archive name: ' + name);
    names.add(key);
    const data = entries.get(name);
    const filename = Buffer.from(name, 'utf8');
    if (filename.length > 65535 || data.length > 0xffffffff) throw new Error('Classic ZIP size limit exceeded');
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0x21, 12); // Fixed 1980-01-01, no source/user filesystem timestamps.
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, data);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(0x0314, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(0x21, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(data.length, 20);
    directory.writeUInt32LE(data.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += header.length + filename.length + data.length;
    if (offset > 0xffffffff) throw new Error('Classic ZIP size limit exceeded');
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

/** Read the uncompressed, UTF-8 classic ZIP files produced here; never extracts to a filesystem. */
export function readZipEntries(bytes) {
  const corrupt = () => { throw new Error('ZIP integrity or CRC check failed'); };
  const end = bytes.length - 22;
  if (end < 0 || bytes.readUInt32LE(end) !== 0x06054b50 || bytes.readUInt16LE(end + 20) !== 0) corrupt();
  const count = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  const directoryOffset = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt32LE(end + 4) !== 0 || bytes.readUInt16LE(end + 8) !== count || directoryOffset + directorySize !== end) corrupt();
  const entries = new Map(), names = new Set();
  let cursor = directoryOffset;
  for (let i = 0; i < count; i += 1) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) corrupt();
    const crc = bytes.readUInt32LE(cursor + 16), size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || bytes.readUInt16LE(cursor + 8) !== 0x800 || bytes.readUInt16LE(cursor + 10) !== 0 || bytes.readUInt32LE(cursor + 20) !== size) corrupt();
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    safeName(name);
    const nameKey = name.normalize('NFC').toLowerCase();
    if (names.has(nameKey)) corrupt();
    names.add(nameKey);
    const local = bytes.readUInt32LE(cursor + 42);
    if (local + 30 > directoryOffset || bytes.readUInt32LE(local) !== 0x04034b50) corrupt();
    const localNameLength = bytes.readUInt16LE(local + 26), localExtraLength = bytes.readUInt16LE(local + 28);
    const start = local + 30 + localNameLength + localExtraLength;
    if (start + size > directoryOffset || bytes.readUInt16LE(local + 6) !== 0x800 || bytes.readUInt16LE(local + 8) !== 0 ||
        bytes.readUInt32LE(local + 14) !== crc || bytes.readUInt32LE(local + 18) !== size || bytes.readUInt32LE(local + 22) !== size ||
        !bytes.subarray(local + 30, local + 30 + localNameLength).equals(nameBytes)) corrupt();
    const data = bytes.subarray(start, start + size);
    if (crc32(data) !== crc) corrupt();
    entries.set(name, data);
    cursor = next;
  }
  if (cursor !== end) corrupt();
  return entries;
}

function verifyRoundtrip(bytes, expected) {
  const actual = readZipEntries(bytes);
  if (actual.size !== expected.size) throw new Error('ZIP roundtrip file count differs');
  for (const [name, original] of expected) {
    const recovered = actual.get(name);
    if (!recovered || recovered.length !== original.length || sha256(recovered) !== sha256(original)) throw new Error('ZIP roundtrip bytes differ: ' + name);
  }
}

async function atomicWrite(directory, name, bytes) {
  const target = join(directory, name);
  const temporary = join(directory, '.' + name + '.' + randomUUID() + '.tmp');
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    if (sha256(await readFile(temporary)) !== sha256(bytes)) throw new Error('Written release bytes differ: ' + name);
    await rename(temporary, target);
  } finally { await rm(temporary, { force: true }); }
}

/** Build local-only public source and site archives from a fixed allowlist. */
export async function createRelease({ root = projectRoot, allowIncomplete = false } = {}) {
  const requestedRoot = resolve(root);
  if ((await lstat(requestedRoot)).isSymbolicLink()) throw new Error('Symlink or junction project root refused');
  const base = await realpath(requestedRoot);
  const visited = new Set([base]), selected = new Map(), warnings = [];
  const output = join(base, 'release');
  await checkedPath(base, 'release', visited, true);
  for (const name of ['portfolio-lab-source.zip', 'portfolio-lab-site.zip', 'manifest.json', 'SHA256SUMS.txt']) {
    await checkedPath(base, 'release/' + name, visited, true);
  }
  for (const name of publicFiles) {
    allowedEntry(name);
    const full = await checkedPath(base, name, visited, !requiredFiles.has(name));
    if (full) {
      if (!(await lstat(full)).isFile()) throw new Error('Public allowlist entry is not a regular file: ' + name);
      selected.set(name, full);
    }
  }
  for (const name of [...screenshotFiles, ...optionalScreenshots]) {
    const full = await checkedPath(base, name, visited, true);
    if (full) selected.set(name, full);
    else if (screenshotFiles.includes(name)) warnings.push('Required teaching screenshot not present: ' + name);
  }
  for (const name of skillDirectories) {
    if (await checkedPath(base, name, visited, true)) {
      await collectTree(base, name, selected, visited);
      for (const entry of ['SKILL.md', 'agents/openai.yaml']) {
        if (!selected.has(name + '/' + entry)) warnings.push('Required Skill entry not present: ' + name + '/' + entry);
      }
    } else warnings.push('Required Skill directory not present: ' + name);
  }
  if (warnings.length && !allowIncomplete) throw new Error('Release incomplete:\n' + warnings.join('\n'));
  await collectTree(base, siteDirectory, selected, visited);
  verifyWindowsReparsePoints(visited);
  const siteCheck = await checkSite({ root: join(base, siteDirectory) });
  if (siteCheck.errors.length) throw new Error('Site validation failed:\n' + siteCheck.errors.join('\n'));
  const snapshot = new Map();
  for (const name of ordered(selected.keys())) {
    const info = await lstat(selected.get(name));
    if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1) throw new Error('Non-regular or linked public file refused: ' + name);
    const bytes = await readFile(selected.get(name));
    verifyPublicText(name, bytes);
    snapshot.set(name, bytes);
  }
  const source = new Map([...snapshot].map(([name, bytes]) => ['portfolio-lab/' + name, bytes]));
  const site = new Map([...snapshot].filter(([name]) => name.startsWith(siteDirectory + '/')).map(([name, bytes]) => [name.slice(siteDirectory.length + 1), bytes]));
  site.set('LICENSE.txt', snapshot.get('LICENSE'));
  site.set('THIRD_PARTY_NOTICES.md', snapshot.get('THIRD_PARTY_NOTICES.md'));
  const builds = [['portfolio-lab-source.zip', source], ['portfolio-lab-site.zip', site]];
  const archives = builds.map(([name, files]) => {
    const bytes = writeZip(files);
    verifyRoundtrip(bytes, files);
    return { name, bytes, files };
  });
  await mkdir(output, { recursive: true });
  await checkedPath(base, 'release', visited);
  verifyWindowsReparsePoints(new Set([output]));
  const manifest = { schemaVersion: 1, complete: warnings.length === 0, warnings, archives: [] };
  for (const archive of archives) {
    await atomicWrite(output, archive.name, archive.bytes);
    const recovered = await readFile(join(output, archive.name));
    verifyRoundtrip(recovered, archive.files);
    manifest.archives.push({
      name: archive.name, bytes: recovered.length, sha256: sha256(recovered),
      files: ordered(archive.files.keys()).map(path => ({ path, bytes: archive.files.get(path).length, sha256: sha256(archive.files.get(path)) }))
    });
  }
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await atomicWrite(output, 'manifest.json', manifestBytes);
  const summaries = manifest.archives.map(({ name, bytes, sha256: checksum, files }) => ({ name, bytes, sha256: checksum, files: files.length }));
  const sums = [...summaries.map(item => item.sha256 + '  ' + item.name), sha256(manifestBytes) + '  manifest.json'].join('\n') + '\n';
  await atomicWrite(output, 'SHA256SUMS.txt', Buffer.from(sums));
  return { archives: summaries, complete: warnings.length === 0, warnings };
}

const directlyRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (directlyRun) {
  try {
    const result = await createRelease({ allowIncomplete: process.argv.includes('--allow-incomplete') });
    for (const item of result.archives) console.log(item.name + ': ' + item.files + ' files, ' + item.bytes + ' bytes, SHA-256 ' + item.sha256);
    for (const warning of result.warnings) console.warn(warning);
    console.log(result.complete ? 'Local archives verified in release/. No remote publication was performed.' : 'INCOMPLETE DRAFT ONLY: release/ is missing required teaching material. No remote publication was performed.');
  } catch (error) { console.error('Release failed:', error.message); process.exitCode = 1; }
}
