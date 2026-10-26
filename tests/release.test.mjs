import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';

let fixtures;
before(async () => { fixtures = await mkdtemp(join(tmpdir(), 'portfolio-lab-release-')); });
after(async () => {
  assert.equal(dirname(resolve(fixtures)), resolve(tmpdir()));
  assert.match(basename(fixtures), /^portfolio-lab-release-/);
  await rm(fixtures, { recursive: true, force: true });
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(name) {
  const root = join(fixtures, name);
  const files = {
    'package.json': '{"name":"portfolio-lab","version":"1.0.0","type":"module"}',
    '.gitignore': 'release/\n',
    'LICENSE': 'MIT sample license\n',
    'THIRD_PARTY_NOTICES.md': 'Third-party credits\n',
    'README.md': '# Portfolio Lab\n',
    'README.en.md': '# Portfolio Lab English\n',
    'README.zh-CN.md': '# 示例\n',
    'CONTRIBUTING.md': '# Public example documentation\n',
    'CODE_OF_CONDUCT.md': '# Public example documentation\n',
    'SECURITY.md': '# Public example documentation\n',
    'CHANGELOG.md': '# Public example documentation\n',
    'docs/install.md': '# Public example documentation\n',
    'docs/faq.md': '# Troubleshooting\n',
    'docs/examples.md': '# Public example documentation\n',
    'docs/privacy.md': '# Public example documentation\n',
    'docs/recordings.md': '# Public example documentation\n',
    '.github/workflows/ci.yml': '# Public example documentation\n',
    '.github/ISSUE_TEMPLATE/bug_report.yml': '# Public example documentation\n',
    '.github/ISSUE_TEMPLATE/feature_request.yml': '# Public example documentation\n',
    '.github/pull_request_template.md': '# Public example documentation\n',
    'docs/media/gallery.gif': Buffer.from([71, 73, 70, 56, 57, 97]),
    'docs/media/story.gif': Buffer.from([71, 73, 70, 56, 57, 97]),
    'docs/media/portfolio-demo.mp4': Buffer.from([0, 0, 0, 20, 102, 116, 121, 112]),
    'examples/alex-lin/dist/index.html': '<!doctype html><html><body>Home</body></html>',
    'examples/alex-lin/dist/project.html': '<!doctype html><html><body>Case</body></html>',
    'examples/alex-lin/dist/about.html': '<!doctype html><html><body>About</body></html>',
    'examples/alex-lin/dist/assets/shape.svg': '<svg xmlns="http://www.w3.org/2000/svg">示例</svg>',
    'docs/deploy.md': '# Deployment\n',
    'docs/deploy.zh-CN.md': '# 部署\n',
    'docs/recording-guide.md': '# Teaching\n',
    'docs/sample-resume.md': '# Fiction\n',
    'docs/packages.md': '# Release\n',
    'docs/packages.zh-CN.md': '# 发布\n',
    'DESIGN.md': '# Design\n',
    'scripts/serve.mjs': 'export {};\n',
    'scripts/check.mjs': 'export {};\n',
    'scripts/package-release.mjs': 'export {};\n',
    'tests/demos.test.mjs': 'export {};\n',
    'tests/site.test.mjs': 'export {};\n',
    'tests/release.test.mjs': 'export {};\n',
    'docs/screenshots/home-desktop.png': Buffer.from([137, 80, 78, 71, 0, 255, 1]),
    'skills/portfolio-website/SKILL.md': '---\nname: portfolio-website\ndescription: Example\n---\n',
    'skills/portfolio-website/references/example.md': '# Reference\n',
    'skills/portfolio-website/agents/openai.yaml': 'interface: {}\n',
    'skills/unpublished-draft/SKILL.md': 'PRIVATE_SENTINEL',
    '.github/workflows/pages.yml': 'name: Example\n',
    'deploy/nginx.conf': 'server { listen 80; }\n',
    '.openai/private.json': 'PRIVATE_SENTINEL',
    '.git/config': 'PRIVATE_SENTINEL',
    '.env': 'PRIVATE_SENTINEL',
    'authoring-evidence.md': 'PRIVATE_SENTINEL',
    'docs/owner-session.json': 'PRIVATE_SENTINEL'
  };
  for (const name of ['chinese.svg', 'chinese-active.svg', 'english.svg', 'english-active.svg']) files['docs/images/' + name] = '<svg xmlns="http://www.w3.org/2000/svg">Language</svg>';
  for (const name of ['growth-demo.png', 'brief-demo.png', 'home-mobile.png', 'about-desktop.png', 'story-desktop.png']) files['docs/screenshots/' + name] = Buffer.from([137, 80, 78, 71, 0, 255, 1]);
  for (const [relative, content] of Object.entries(files)) {
    const file = join(root, relative);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

test('release creates allowlisted source and flat site archives with verified hashes', async () => {
  const { createRelease, readZipEntries } = await import('../scripts/package-release.mjs');
  const root = await fixture('complete');
  const result = await createRelease({ root });
  const manifest = JSON.parse(await readFile(join(root, 'release', 'manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.archives.length, 2);
  assert.deepEqual(result.archives.map(item => item.name), ['portfolio-lab-source.zip', 'portfolio-lab-site.zip']);
  for (const archive of manifest.archives) {
    const bytes = await readFile(join(root, 'release', archive.name));
    assert.equal(hash(bytes), archive.sha256);
    const entries = readZipEntries(bytes);
    assert.equal(entries.size, archive.files.length);
    for (const file of archive.files) {
      assert.equal(entries.get(file.path).length, file.bytes);
      assert.equal(hash(entries.get(file.path)), file.sha256);
      assert.doesNotMatch(entries.get(file.path).toString(), /PRIVATE_SENTINEL/);
    }
  }
  const source = readZipEntries(await readFile(join(root, 'release', 'portfolio-lab-source.zip')));
  const site = readZipEntries(await readFile(join(root, 'release', 'portfolio-lab-site.zip')));
  for (const path of ['portfolio-lab/README.md', 'portfolio-lab/docs/images/english.svg', 'portfolio-lab/docs/deploy.md', 'portfolio-lab/docs/screenshots/home-desktop.png', 'portfolio-lab/skills/portfolio-website/SKILL.md', 'portfolio-lab/deploy/nginx.conf', 'portfolio-lab/.github/workflows/pages.yml']) assert.ok(source.has(path), path);
  assert.equal([...source.keys()].some(path => path.startsWith('portfolio-lab/skills/unpublished-draft/')), false);
  assert.ok(site.has('index.html'));
  assert.ok(site.has('LICENSE.txt'));
  assert.ok(site.has('THIRD_PARTY_NOTICES.md'));
  assert.equal([...site.keys()].some(path => path.startsWith('examples/') || path.startsWith('docs/') || path.startsWith('skills/')), false);
  assert.deepEqual(site.get('assets/shape.svg'), await readFile(join(root, 'examples/alex-lin/dist/assets/shape.svg')));
  assert.equal(result.complete, true);
  assert.deepEqual(result.warnings, []);
  assert.equal(manifest.complete, true);
});

test('identical source bytes produce identical archives across repeated releases', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const root = await fixture('repeat');
  const first = await createRelease({ root });
  await writeFile(join(root, 'release', 'unrelated-private.txt'), 'not selected');
  const second = await createRelease({ root });
  assert.deepEqual(first.archives, second.archives);
  const sums = await readFile(join(root, 'release', 'SHA256SUMS.txt'), 'utf8');
  assert.match(sums, /[a-f0-9]{64}  portfolio-lab-source\.zip/);
  assert.match(sums, /[a-f0-9]{64}  portfolio-lab-site\.zip/);
  assert.match(sums, /[a-f0-9]{64}  manifest\.json/);
});

test('release rejects private paths inside an included tree', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const root = await fixture('private-tree');
  await writeFile(join(root, 'skills/portfolio-website/.env'), 'not public');
  await assert.rejects(createRelease({ root }), /private|hidden|forbidden/i);
});

test('release rejects a symlink or junction within selected assets even when it targets a regular file tree', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const root = await fixture('linked-tree');
  const outside = join(fixtures, 'external-material');
  await mkdir(outside);
  await writeFile(join(outside, 'secret.svg'), '<svg>not public</svg>');
  await symlink(outside, join(root, 'examples/alex-lin/dist/assets/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createRelease({ root }), /symlink|junction|reparse|outside/i);
});

test('release rejects an output directory junction before writing outside the project', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const root = await fixture('linked-output');
  const outside = join(fixtures, 'external-output');
  await mkdir(outside);
  await writeFile(join(outside, 'sentinel.txt'), 'preserve me');
  await symlink(outside, join(root, 'release'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createRelease({ root }), /symlink|junction|reparse|outside/i);
  assert.equal(await readFile(join(outside, 'sentinel.txt'), 'utf8'), 'preserve me');
});

test('release detects generic local private paths and invalid UTF-8 in public text', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const first = await fixture('private-text');
  await writeFile(join(first, 'README.md'), ['C:', 'Users', 'sample-owner', 'private.txt'].join('\\'));
  await assert.rejects(createRelease({ root: first }), /private|local path/i);
  const second = await fixture('invalid-text');
  await writeFile(join(second, 'README.md'), Buffer.from([0xc3, 0x28]));
  await assert.rejects(createRelease({ root: second }), /UTF-8/i);
});

test('ZIP roundtrip reader rejects modified payload bytes', async () => {
  const { createRelease, readZipEntries } = await import('../scripts/package-release.mjs');
  const root = await fixture('corrupt');
  await createRelease({ root });
  const archive = await readFile(join(root, 'release', 'portfolio-lab-site.zip'));
  const altered = Buffer.from(archive);
  const nameLength = altered.readUInt16LE(26);
  const extraLength = altered.readUInt16LE(28);
  altered[30 + nameLength + extraLength] ^= 1;
  assert.throws(() => readZipEntries(altered), /CRC|corrupt|integrity/i);
});

test('release refuses an incomplete teaching bundle unless explicitly requested as a draft', async () => {
  const { createRelease } = await import('../scripts/package-release.mjs');
  const root = await fixture('incomplete');
  await rm(join(root, 'docs/screenshots/home-mobile.png'));
  await assert.rejects(createRelease({ root }), /Release incomplete[\s\S]*home-mobile/);
  const draft = await createRelease({ root, allowIncomplete: true });
  assert.equal(draft.complete, false);
  const manifest = JSON.parse(await readFile(join(root, 'release/manifest.json'), 'utf8'));
  assert.equal(manifest.complete, false);
  assert.ok(manifest.warnings.some(item => item.includes('home-mobile.png')));
});

test('source release carries its onboarding, community files, and actual demo media without altering the static site archive', async () => {
  const { createRelease, readZipEntries } = await import('../scripts/package-release.mjs');
  const root = await fixture('public-onboarding');
  await createRelease({ root });
  const source = readZipEntries(await readFile(join(root, 'release/portfolio-lab-source.zip')));
  const site = readZipEntries(await readFile(join(root, 'release/portfolio-lab-site.zip')));
  for (const name of ['docs/install.md', 'docs/examples.md', 'docs/install.md', 'docs/faq.md', 'docs/privacy.md', 'docs/recordings.md', 'CONTRIBUTING.md', 'SECURITY.md', '.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/bug_report.yml', 'docs/media/gallery.gif', 'docs/media/story.gif', 'docs/media/portfolio-demo.mp4']) {
    assert.deepEqual(source.get('portfolio-lab/' + name), await readFile(join(root, name)), name);
    assert.equal(site.has(name), false, name);
  }
});
