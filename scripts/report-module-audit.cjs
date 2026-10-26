// Formats a Designer audit download. Never imports or executes contributed Python.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, filename);
const { normalizeCatalog } = require('../src/app/domain/descriptors.ts');
const { missingMetadata } = require('../src/app/domain/metadata-requirements.ts');
const [auditPath, outputDirectory, catalogDirectory, recheckPath] = process.argv.slice(2);
if (!auditPath || !outputDirectory) throw new Error('Usage: node scripts/report-module-audit.cjs AUDIT.json OUTPUT_DIR [CATALOG_DIR] [RECHECKS.json]');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const key = d => `${d.kind}:${d.id}@${d.version}`;
const listings = new Map();
if (catalogDirectory) for (const kind of ['task', 'dataset', 'model', 'metric']) {
  const prefix = kind === 'model' ? 'modl' : kind;
  let files = fs.readdirSync(catalogDirectory).filter(name => new RegExp(`^${kind}-page\\d+\\.json$`).test(name));
  if (kind === 'dataset') {
    const sorted = fs.readdirSync(catalogDirectory).filter(name => /^dataset-sorted-page\d+\.json$/.test(name));
    if (sorted.length) files = sorted;
  }
  for (const file of files) {
    const response = JSON.parse(fs.readFileSync(path.join(catalogDirectory, file), 'utf8'));
    const items = response.data?.[`${prefix}_descriptors`];
    if (!Array.isArray(items)) throw new Error(`Unsupported catalog capture: ${file}`);
    for (const descriptor of normalizeCatalog(kind, items)) listings.set(key(descriptor), descriptor);
  }
}
const rechecks = new Map((recheckPath ? JSON.parse(fs.readFileSync(recheckPath, 'utf8')) : []).map(row => [key(row.descriptor), row]));
const seen = new Set();
const modules = audit.modules.map(row => {
  if (seen.has(key(row))) throw new Error(`Duplicate audited identity ${key(row)}`);
  seen.add(key(row));
  const recheck = rechecks.get(key(row));
  const listing = listings.get(key(row));
  const result = { ...row, catalogMissing: listing ? missingMetadata(listing) : row.catalogMissing ?? [] };
  if (recheck) {
    if (recheck.error) {
      result.status = 'error'; result.error = recheck.error; result.stage = recheck.stage ?? 'download';
      result.recheckedAt = recheck.recheckedAt;
      return result;
    }
    if (recheck.descriptor.provenance !== 'package' || missingMetadata(recheck.descriptor).length)
      throw new Error(`Recheck lacks complete automatic package evidence: ${key(row)}`);
    result.status = 'ready'; result.missing = []; result.error = ''; delete result.stage;
    result.recheckedAt = recheck.recheckedAt;
    result.recheckNote = 'Verified again in Designer through automatic exact-version metadata loading.';
  }
  return result;
}).sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id || a.version - b.version);
const verified = modules.filter(row => row.status === 'ready');
const unavailable = modules.filter(row => row.status !== 'ready' && (row.stage === 'download' || /network|HTTP|timed out|fetch|download/i.test(row.error)));
const incomplete = modules.filter(row => row.status !== 'ready' && !unavailable.includes(row));
const report = { generatedAt: new Date().toISOString(), sourceAuditGeneratedAt: audit.generatedAt,
  complete: audit.complete && modules.length === audit.total, total: audit.total,
  verified: verified.length, packageMetadataIssues: incomplete.length, packageDownloadsUnverified: unavailable.length,
  method: 'Exact registry versions; package manifests and literal Python task declarations inspected without executing module code. Catalog omissions and inaccessible downloads are separate findings.',
  summary: Object.fromEntries(['task', 'dataset', 'model', 'metric'].map(kind => [kind, {
    listed: modules.filter(row => row.kind === kind).length,
    listingIncomplete: modules.filter(row => row.kind === kind && row.catalogMissing.length).length,
    verified: verified.filter(row => row.kind === kind).length
  }])), modules };
const label = row => `${row.kind} ${row.name} (#${row.id}, v${row.version})`;
const lines = ['CAUSALBENCH DESIGNER — MODULE METADATA AUDIT', `Generated: ${report.generatedAt}`,
  `Scope: ${report.total} module versions; ${report.verified} packages verified.`, '',
  'PACKAGE METADATA ISSUES', ...(incomplete.length ? incomplete.map(row => `- ${label(row)}: ${row.error || row.missing.join('; ')}`) : ['None found in the inspected packages.']), '',
  'DOWNLOADS THAT COULD NOT BE VERIFIED', ...unavailable.map(row => `- ${label(row)}: ${row.error}`),
  'These are access/transport findings, not proof of missing package metadata.', '',
  'CATALOG LISTING OMISSIONS',
  'Designer now resolves these fields automatically from the exact packages. Users do not need to open package files.',
  ...modules.filter(row => row.catalogMissing.length).map(row => `- ${label(row)}: ${row.catalogMissing.join('; ')}`), '',
  'The accompanying JSON contains the status of every module version, including successful checks and later rechecks.', ''];
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'module-metadata-audit.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outputDirectory, 'module-metadata-audit.txt'), lines.join('\n'));
console.log(JSON.stringify({ total: report.total, verified: report.verified, metadataIssues: incomplete.length, unavailable: unavailable.length, summary: report.summary }, null, 2));
