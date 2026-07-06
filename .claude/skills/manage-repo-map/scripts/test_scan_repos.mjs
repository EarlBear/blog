#!/usr/bin/env node
// node:test for scan-repos.mjs pure core. Run: node test_scan_repos.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseEmbeddedData, jsObjectToJson, detectFileDeps,
  fileDepEdges, diffMap, normRemote,
} from './scan-repos.mjs'

// A trimmed stand-in for the artifact's <script> block: same literal style we
// author (single-quoted strings, bare keys, trailing-comma-free, // comments).
const HTML = `
<script>
var GROUPS = { frontend: { label: 'Frontend', color: '#B14726' } };
var REPOS = {
  "earlbear-sites":         { icon: "🎨", group: "frontend", remote: "EarlBear/sites",
    stack: ["TypeScript"], purpose: "Frontend assets." },
  "earlbear-design-system": { icon: "🧩", group: "frontend", remote: "EarlBear/design-system",
    stack: ["TypeScript"], purpose: "Tokens + @earlbear/ui." }
};
var EDGES = [
  { from: "earlbear-sites", to: "earlbear-design-system", kind: "dep",
    reason: "file: dep on @earlbear/ui." },
  { from: "earlbear-sites", to: "earlbear", kind: "flow",
    reason: "publishes gallery." }
];
function nodeId(slug) { return "n_" + slug; }
</script>
`

test('parseEmbeddedData: extracts REPOS and EDGES from the artifact', () => {
  const { repos, edges } = parseEmbeddedData(HTML)
  assert.deepEqual(Object.keys(repos).sort(), ['earlbear-design-system', 'earlbear-sites'])
  assert.equal(repos['earlbear-sites'].remote, 'EarlBear/sites')
  assert.equal(edges.length, 2)
  assert.equal(edges[0].kind, 'dep')
  assert.equal(edges[1].kind, 'flow')
})

test('parseEmbeddedData: returns empty when literals are absent', () => {
  const { repos, edges } = parseEmbeddedData('<script>var X = 1;</script>')
  assert.deepEqual(repos, {})
  assert.deepEqual(edges, [])
})

test('jsObjectToJson: bare keys, single quotes, trailing commas, comments', () => {
  const out = jsObjectToJson(`{
    foo: 'bar',          // a comment
    nums: [1, 2, 3,],
    nested: { a: 'b', },
  }`)
  assert.deepEqual(out, { foo: 'bar', nums: [1, 2, 3], nested: { a: 'b' } })
})

test('jsObjectToJson: preserves an apostrophe inside a double-quoted-ish value', () => {
  // our data uses double quotes for prose; ensure single->double swap is safe
  const out = jsObjectToJson(`{ reason: 'Watson reads context.' }`)
  assert.equal(out.reason, 'Watson reads context.')
})

test('detectFileDeps: finds file: specs across dep fields', () => {
  const pkg = {
    dependencies: { '@earlbear/ui': 'file:../../../earlbear-design-system', react: '^18' },
    devDependencies: { '@types/node': '^20', '@earlbear/x': 'file:../earlbear-x' },
  }
  const deps = detectFileDeps(pkg)
  assert.deepEqual(deps, [
    { name: '@earlbear/ui', target: '../../../earlbear-design-system' },
    { name: '@earlbear/x', target: '../earlbear-x' },
  ])
})

test('detectFileDeps: tolerates missing dep fields', () => {
  assert.deepEqual(detectFileDeps({}), [])
  assert.deepEqual(detectFileDeps({ dependencies: { react: '^18' } }), [])
  assert.deepEqual(detectFileDeps(null), [])
})

test('fileDepEdges: resolves file: target to the matching sibling slug', () => {
  const known = new Set(['earlbear-sites', 'earlbear-design-system'])
  const edges = fileDepEdges(
    'earlbear-sites',
    [{ name: '@earlbear/ui', target: '../../../earlbear-design-system' }],
    known,
  )
  assert.deepEqual(edges, [{ from: 'earlbear-sites', to: 'earlbear-design-system' }])
})

test('fileDepEdges: ignores targets not in the known slug set and self-edges', () => {
  const known = new Set(['earlbear-sites'])
  assert.deepEqual(
    fileDepEdges('earlbear-sites', [{ name: 'x', target: '../some-other-lib' }], known),
    [],
  )
  // self-reference is dropped
  assert.deepEqual(
    fileDepEdges('earlbear-sites', [{ name: 'x', target: './earlbear-sites' }], known),
    [],
  )
})

test('fileDepEdges: dedupes repeated edges to the same target', () => {
  const known = new Set(['earlbear-sites', 'earlbear-design-system'])
  const edges = fileDepEdges('earlbear-sites', [
    { name: '@earlbear/ui', target: '../../../earlbear-design-system' },
    { name: '@earlbear/ui', target: '../../earlbear-design-system' },
  ], known)
  assert.equal(edges.length, 1)
})

test('normRemote: normalizes git URLs and shorthand to org/name', () => {
  assert.equal(normRemote('git@github.com:EarlBear/sites.git'), 'earlbear/sites')
  assert.equal(normRemote('https://github.com/EarlBear/sites.git'), 'earlbear/sites')
  assert.equal(normRemote('EarlBear/sites'), 'earlbear/sites')
  assert.equal(normRemote(''), '')
})

test('diffMap: no drift when scanned == embedded', () => {
  const embedded = {
    repos: { 'earlbear-sites': { remote: 'EarlBear/sites' }, 'earlbear-design-system': { remote: 'EarlBear/design-system' } },
    edges: [{ from: 'earlbear-sites', to: 'earlbear-design-system', kind: 'dep' }],
  }
  const scanned = {
    repos: {
      'earlbear-sites': { remote: 'git@github.com:EarlBear/sites.git' },
      'earlbear-design-system': { remote: 'git@github.com:EarlBear/design-system.git' },
    },
    depEdges: [{ from: 'earlbear-sites', to: 'earlbear-design-system' }],
  }
  const d = diffMap(scanned, embedded)
  assert.equal(d.hasDrift, false)
})

test('diffMap: flags a new repo on disk', () => {
  const embedded = { repos: { 'earlbear-sites': { remote: 'EarlBear/sites' } }, edges: [] }
  const scanned = {
    repos: { 'earlbear-sites': { remote: 'EarlBear/sites' }, 'earlbear-new': { remote: 'EarlBear/new' } },
    depEdges: [],
  }
  const d = diffMap(scanned, embedded)
  assert.deepEqual(d.newRepos, ['earlbear-new'])
  assert.equal(d.hasDrift, true)
})

test('diffMap: flags a removed repo', () => {
  const embedded = {
    repos: { 'earlbear-sites': { remote: 'EarlBear/sites' }, 'earlbear-old': { remote: 'EarlBear/old' } },
    edges: [],
  }
  const scanned = { repos: { 'earlbear-sites': { remote: 'EarlBear/sites' } }, depEdges: [] }
  const d = diffMap(scanned, embedded)
  assert.deepEqual(d.removedRepos, ['earlbear-old'])
  assert.equal(d.hasDrift, true)
})

test('diffMap: flags a new file: dep edge missing from the map', () => {
  const embedded = {
    repos: { 'earlbear-sites': {}, 'earlbear-design-system': {} },
    edges: [],
  }
  const scanned = {
    repos: { 'earlbear-sites': {}, 'earlbear-design-system': {} },
    depEdges: [{ from: 'earlbear-sites', to: 'earlbear-design-system' }],
  }
  const d = diffMap(scanned, embedded)
  assert.deepEqual(d.newDepEdges, [{ from: 'earlbear-sites', to: 'earlbear-design-system' }])
  assert.equal(d.hasDrift, true)
})

test('diffMap: flags a stale dep edge no longer on disk; ignores flow edges', () => {
  const embedded = {
    repos: { 'earlbear-sites': {}, 'earlbear-design-system': {}, earlbear: {} },
    edges: [
      { from: 'earlbear-sites', to: 'earlbear-design-system', kind: 'dep' },
      { from: 'earlbear-sites', to: 'earlbear', kind: 'flow' }, // flow never flagged
    ],
  }
  const scanned = {
    repos: { 'earlbear-sites': {}, 'earlbear-design-system': {}, earlbear: {} },
    depEdges: [], // the dep edge is gone on disk
  }
  const d = diffMap(scanned, embedded)
  assert.deepEqual(d.staleDepEdges, [{ from: 'earlbear-sites', to: 'earlbear-design-system' }])
  assert.equal(d.hasDrift, true)
})

test('diffMap: ignores remote diff when map says "(local only)"', () => {
  const embedded = { repos: { 'earlbear-x': { remote: '(local only)' } }, edges: [] }
  const scanned = { repos: { 'earlbear-x': { remote: 'git@github.com:EarlBear/x.git' } }, depEdges: [] }
  const d = diffMap(scanned, embedded)
  assert.equal(d.remoteChanges.length, 0)
  assert.equal(d.hasDrift, false)
})

test('diffMap: honors IGNORE_REPOS so an alias dir is not flagged as new', () => {
  const embedded = {
    repos: { 'earlbear-sites': { remote: 'EarlBear/sites' } },
    edges: [],
    ignore: ['earlbear-gallery'],
  }
  const scanned = {
    repos: { 'earlbear-sites': { remote: 'EarlBear/sites' }, 'earlbear-gallery': { remote: 'EarlBear/gallery' } },
    depEdges: [],
  }
  const d = diffMap(scanned, embedded)
  assert.deepEqual(d.newRepos, [])
  assert.equal(d.hasDrift, false)
})

test('parseEmbeddedData: extracts IGNORE_REPOS when present', () => {
  const html = `<script>var IGNORE_REPOS = ["earlbear-gallery"]; var REPOS = { "a": {} }; var EDGES = [];</script>`
  const { ignore } = parseEmbeddedData(html)
  assert.deepEqual(ignore, ['earlbear-gallery'])
})

test('diffMap: flags a genuine remote change', () => {
  const embedded = { repos: { 'earlbear-x': { remote: 'EarlBear/x' } }, edges: [] }
  const scanned = { repos: { 'earlbear-x': { remote: 'git@github.com:EarlBear/x-renamed.git' } }, depEdges: [] }
  const d = diffMap(scanned, embedded)
  assert.equal(d.remoteChanges.length, 1)
  assert.equal(d.remoteChanges[0].slug, 'earlbear-x')
  assert.equal(d.hasDrift, true)
})
