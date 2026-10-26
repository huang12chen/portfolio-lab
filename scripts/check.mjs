import { spawnSync } from 'node:child_process';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultRoot = join(projectRoot, 'examples', 'alex-lin', 'dist');
const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.svg', '.txt', '.md', '.xml', '.map']);
const scriptExtensions = new Set(['.js', '.mjs', '.cjs']);
const assetExtensions = /\.(?:html|css|js|mjs|json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|txt|md)(?:[?#].*)?$/i;
const decoder = new TextDecoder('utf-8', { fatal: true });

const slash = value => value.split(sep).join('/');
function inside(root, file) {
  const value = relative(root, file);
  return value !== '..' && !value.startsWith('..' + sep) && !isAbsolute(value);
}

async function listFiles(root, errors, folder = root) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = join(folder, entry.name);
    const label = slash(relative(root, full));
    if (entry.isSymbolicLink()) {
      errors.push('Symbolic link is not allowed in the deployable directory: ' + label);
      continue;
    }
    if (entry.name.startsWith('.') && entry.name !== '.nojekyll') {
      errors.push('Hidden file or directory in deployable output: ' + label);
      continue;
    }
    if (entry.isDirectory()) files.push(...await listFiles(root, errors, full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function readUTF8(buffer, label, errors) {
  try { return decoder.decode(buffer); }
  catch { errors.push('Invalid UTF-8 in ' + label); return null; }
}

function inspectPrivateContent(source, label, errors) {
  // Deliberately generic: repository-specific private identifiers belong in an owner-side audit.
  if (/\b[A-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'<>]+/i.test(source) ||
      /(?:^|[\s"'=])\/(?:Users|home)\/[^/\s"'<>]+/m.test(source) ||
      /\b[A-Z]:\\(?:[^\\\s"'<>]+\\){2}/i.test(source)) {
    errors.push('Potential private local path in ' + label);
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source) ||
      /\b(?:sk-proj-|sk-live-|ghp_)[A-Za-z0-9_-]{20,}/.test(source)) {
    errors.push('Potential credential in ' + label);
  }
}

function parseReferences(source, extension) {
  const references = [];
  if (extension === '.html') {
    for (const tag of source.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)) {
      const name = tag[1].toLowerCase();
      const attributes = tag[2].matchAll(/(?:^|\s)(src|href|poster|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/gi);
      for (const attribute of attributes) {
        const kind = attribute[1].toLowerCase();
        const value = attribute[2] ?? attribute[3] ?? attribute[4];
        if (kind === 'srcset') {
          if (['img', 'source'].includes(name) && !value.startsWith('data:')) {
            for (const item of value.split(',')) references.push({ value: item.trim().split(/\s+/)[0], runtime: true });
          }
        } else if (kind !== 'href' || ['a', 'link'].includes(name)) {
          references.push({ value, runtime: name !== 'a' });
        }
      }
    }
  } else if (extension === '.css') {
    for (const match of source.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
      references.push({ value: (match[2] ?? match[3]).trim(), runtime: true });
    }
    for (const match of source.matchAll(/@import\s+(["'])(.*?)\1/gi)) references.push({ value: match[2], runtime: true });
  } else if (scriptExtensions.has(extension)) {
    // Parse module specifiers and complete local path literals, not HTML attributes inside JS templates.
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;'"()\x60]*?\s+from\s*)?["']([^"']+)["']/g)) {
      references.push({ value: match[1], runtime: true, module: true });
    }
    for (const match of source.matchAll(/\bimport\s*\(\s*(["'])(.*?)\1\s*\)/g)) references.push({ value: match[2], runtime: true, module: true });
    for (const match of source.matchAll(/(["'])(\.{1,2}\/[^"'\x60\s<>]+)\1/g)) {
      if (assetExtensions.test(match[2])) references.push({ value: match[2], runtime: true });
    }
  }
  return references;
}

async function inspectReference(reference, file, root, errors) {
  const value = reference.value.replace(/&amp;/g, '&').trim();
  const label = slash(relative(root, file));
  if (!value || value.startsWith('#') || value.includes('$' + '{') || value.includes('{' + '{')) return;
  if (/^(?:https?:)?\/\//i.test(value)) {
    if (reference.runtime) errors.push('External runtime reference in ' + label + ': ' + value);
    return;
  }
  if (/^(?:data|blob|mailto|tel):/i.test(value)) return;
  if (value.startsWith('/')) {
    errors.push('Root-relative reference breaks subdirectory hosting in ' + label + ': ' + value);
    return;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || (reference.module && !value.startsWith('.'))) {
    errors.push('Unsupported local runtime reference in ' + label + ': ' + value);
    return;
  }
  let path;
  try { path = decodeURIComponent(value.split(/[?#]/, 1)[0]); }
  catch { errors.push('Invalid encoded reference in ' + label + ': ' + value); return; }
  if (!path) return;
  const target = resolve(dirname(file), path);
  if (!inside(root, target)) {
    errors.push('Reference escapes the static root in ' + label + ': ' + value);
    return;
  }
  try {
    let actual = await realpath(target);
    if (!inside(root, actual)) throw new Error('outside-root');
    if ((await stat(actual)).isDirectory()) actual = await realpath(join(actual, 'index.html'));
    if (!inside(root, actual) || !(await stat(actual)).isFile()) throw new Error('invalid-file');
  } catch {
    errors.push('Missing or unsafe local reference in ' + label + ': ' + value);
  }
}

function inspectSyntax(source, label, extension, errors) {
  const mode = extension === '.cjs' ? 'commonjs' : 'module';
  const parsed = spawnSync(process.execPath, ['--check', '--input-type=' + mode], {
    input: source, encoding: 'utf8', timeout: 10_000, maxBuffer: 1_000_000, windowsHide: true
  });
  if (parsed.error || parsed.status !== 0) {
    const detail = parsed.error?.message ?? parsed.stderr.trim();
    errors.push('JavaScript syntax failed in ' + label + ': ' + detail);
  }
}

/** Validate a static output directory without executing its browser JavaScript. */
export async function checkSite({ root = defaultRoot } = {}) {
  const errors = [];
  let base;
  try { base = await realpath(resolve(root)); }
  catch { return { errors: ['Static output directory is missing'], filesChecked: 0, syntaxChecked: 0 }; }
  const files = await listFiles(base, errors);
  const available = new Set(files.map(file => slash(relative(base, file))));
  for (const entry of ['index.html', 'project.html', 'about.html']) {
    if (!available.has(entry)) errors.push('Missing entry page: ' + entry);
  }
  let syntaxChecked = 0;
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    const label = slash(relative(base, file));
    if (!textExtensions.has(extension)) continue;
    const source = readUTF8(await readFile(file), label, errors);
    if (source === null) continue;
    inspectPrivateContent(source, label, errors);
    if (label.split('/').includes('vendor')) continue;
    if (scriptExtensions.has(extension)) {
      inspectSyntax(source, label, extension, errors);
      syntaxChecked += 1;
    }
    for (const reference of parseReferences(source, extension)) await inspectReference(reference, file, base, errors);
  }
  return { errors: [...new Set(errors)], filesChecked: files.length, syntaxChecked };
}

async function inspectEngineeringScripts(folder, errors) {
  let entries;
  try { entries = await readdir(folder, { withFileTypes: true }); }
  catch (error) {
    if (error.code === 'ENOENT') { errors.push('Missing engineering directory: ' + slash(relative(projectRoot, folder))); return 0; }
    throw error;
  }
  let count = 0;
  for (const entry of entries) {
    const file = join(folder, entry.name);
    if (entry.isDirectory()) count += await inspectEngineeringScripts(file, errors);
    else if (entry.isFile() && scriptExtensions.has(extname(file))) {
      const label = slash(relative(projectRoot, file));
      const source = readUTF8(await readFile(file), label, errors);
      if (source !== null) { inspectSyntax(source, label, extname(file), errors); count += 1; }
    }
  }
  return count;
}

const directlyRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (directlyRun) {
  const result = await checkSite();
  result.syntaxChecked += await inspectEngineeringScripts(join(projectRoot, 'scripts'), result.errors);
  result.syntaxChecked += await inspectEngineeringScripts(join(projectRoot, 'tests'), result.errors);
  if (result.errors.length) {
    console.error('Project check failed:\n' + result.errors.map(error => '- ' + error).join('\n'));
    process.exitCode = 1;
  } else console.log('Project check passed: ' + result.filesChecked + ' static files, ' + result.syntaxChecked + ' JavaScript syntax checks.');
}
