import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const root = process.cwd();
const watchSetPath = path.join(root, 'monitoring', 'watch-set.json');
const accept = process.argv.includes('--accept');
const execFileAsync = promisify(execFile);

function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

function normalizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeHtml(match[1]).slice(0, 160) : '';
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.hash = '';
        links.add(url.toString());
      }
    } catch {
      // Ignore malformed page links; the content hash still catches meaningful changes.
    }
  }
  return [...links].sort();
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function fetchSource(source) {
  let status = 200;
  let ok = true;
  let html = '';
  try {
    const response = await fetch(source.url, {
      headers: {
        'user-agent': 'MagicCon Atlanta companion monitor/1.0 (+https://metavirus.github.io/mtg-magiccon/)'
      }
    });
    status = response.status;
    ok = response.ok;
    html = await response.text();
  } catch (error) {
    try {
      const escapedUrl = source.url.replace(/'/g, "''");
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$ProgressPreference = "SilentlyContinue"; (Invoke-WebRequest -UseBasicParsing -Uri '${escapedUrl}' -Headers @{"User-Agent"="MagicCon Atlanta companion monitor/1.0"}).Content`
      ], { maxBuffer: 20 * 1024 * 1024 });
      html = stdout;
    } catch (fallbackError) {
      const cause = error.cause?.message ? `; cause: ${error.cause.message}` : '';
      const fallbackCause = fallbackError.stderr?.trim() || fallbackError.message;
      throw new Error(`${error.message}${cause}; powershell fallback: ${fallbackCause}`);
    }
  }
  const normalizedText = normalizeHtml(html);
  const links = source.trackLinks ? extractLinks(html, source.url) : [];

  return {
    id: source.id,
    label: source.label,
    url: source.url,
    status,
    ok,
    title: extractTitle(html),
    textHash: hashText(normalizedText),
    linkHash: hashText(links.join('\n')),
    textSample: normalizedText.slice(0, 500),
    linkCount: links.length
  };
}

const watchSet = await readJson(watchSetPath);
const statePath = path.join(root, watchSet.stateFile || '.monitoring-state/watch-state.local.json');
const state = await readJson(statePath, { version: 1, accepted: {} });
const checkedAt = new Date().toISOString();
const results = [];
const changes = [];
const failures = [];

for (const source of watchSet.sources) {
  try {
    const current = await fetchSource(source);
    const previous = state.accepted[source.id];
    const changed = Boolean(
      previous &&
      (previous.textHash !== current.textHash || previous.linkHash !== current.linkHash || previous.status !== current.status)
    );

    results.push({ ...current, changed });

    if (!previous || accept) {
      state.accepted[source.id] = { ...current, acceptedAt: checkedAt };
    } else if (changed) {
      changes.push({
        id: source.id,
        label: source.label,
        url: source.url,
        priority: source.priority,
        destination: source.destination,
        homeWorthyWhen: source.homeWorthyWhen,
        previous: {
          status: previous.status,
          title: previous.title,
          textHash: previous.textHash,
          linkHash: previous.linkHash,
          acceptedAt: previous.acceptedAt
        },
        current
      });
      state.pending ??= {};
      state.pending[source.id] = { ...current, detectedAt: checkedAt };
    }
  } catch (error) {
    failures.push({
      id: source.id,
      label: source.label,
      url: source.url,
      error: error.message
    });
  }
}

state.version = 1;
state.checkedAt = checkedAt;
state.watchSetVersion = watchSet.version;
await mkdir(path.dirname(statePath), { recursive: true });
await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const output = {
  checkedAt,
  mode: accept ? 'accept-baseline' : 'check',
  watchSet: watchSetPath,
  stateFile: statePath,
  sourceCount: watchSet.sources.length,
  changeCount: changes.length,
  failureCount: failures.length,
  changes,
  failures,
  summary: changes.length
    ? `${changes.length} watched source(s) changed; inspect before routing.`
    : failures.length
      ? `No confirmed changes; ${failures.length} source(s) failed to fetch.`
      : accept
        ? 'Accepted current source snapshots as the monitoring baseline.'
        : 'No watched web source changed from the accepted baseline.'
};

console.log(JSON.stringify(output, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
