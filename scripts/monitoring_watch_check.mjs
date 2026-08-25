import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { dueMonitoringMilestoneChanges } from './lib/scheduled_monitoring_milestones.mjs';
import { discoverNewsletterLinks, fetchNewsletterPages, planNewsletterFetch } from './lib/first_party_newsletter_intake.mjs';

const root = process.cwd();
const watchSetPath = path.join(root, 'monitoring', 'watch-set.json');
const accept = process.argv.includes('--accept');
const execFileAsync = promisify(execFile);
const ticketedPlayEmptyDiff = {
  enabled: false,
  status: 'waiting-for-inventory',
  previousEventCount: 0,
  currentEventCount: 0,
  addedCount: 0,
  removedCount: 0,
  changedCount: 0,
  signalCount: 0,
  signals: []
};

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

function extractLinkRecords(html, baseUrl) {
  const links = new Map();
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.hash = '';
        const label = normalizeHtml(match[2]).slice(0, 120);
        const key = `${url.toString()} ${label}`.trim();
        links.set(key, { label, url: url.toString() });
      }
    } catch {
      // Ignore malformed page links; the content hash still catches meaningful changes.
    }
  }
  return [...links.values()].sort((a, b) => `${a.label} ${a.url}`.localeCompare(`${b.label} ${b.url}`));
}

function compactLinkRecord(link) {
  return link.label ? `${link.label} -> ${link.url}` : link.url;
}

function diffLinkRecords(previousLinks = [], currentLinks = []) {
  const previous = new Set(previousLinks.map(compactLinkRecord));
  const current = new Set(currentLinks.map(compactLinkRecord));
  return {
    added: [...current].filter((link) => !previous.has(link)).sort(),
    removed: [...previous].filter((link) => !current.has(link)).sort()
  };
}

function summarizeLinkDelta(previous, current) {
  if (!previous.links || !current.links) {
    return {
      added: [],
      removed: [],
      note: 'Accepted baseline predates labeled-link tracking; accept a reviewed baseline before interpreting link/menu deltas.'
    };
  }
  const delta = diffLinkRecords(previous.links, current.links);
  return {
    added: delta.added.slice(0, 25),
    removed: delta.removed.slice(0, 25),
    truncated: delta.added.length > 25 || delta.removed.length > 25
  };
}

function summarizeCurrent(current) {
  const { links, ...summary } = current;
  return {
    ...summary,
    linkSample: current.linkSample.slice(0, 12)
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function eventKey(event) {
  return event.sourceEventKey || event.id;
}

function eventChangedFields(previous, current) {
  const fields = [];
  if (previous.availability !== current.availability) fields.push('availability');
  if (
    previous.date !== current.date ||
    previous.startsAt !== current.startsAt ||
    previous.endsAt !== current.endsAt ||
    previous.durationMinutes !== current.durationMinutes ||
    previous.timeKind !== current.timeKind
  ) {
    fields.push('time');
  }
  if (previous.locationName !== current.locationName || previous.room !== current.room) fields.push('location');
  if (previous.priceAmount !== current.priceAmount || previous.priceDisplay !== current.priceDisplay) fields.push('price');
  return fields;
}

function eventIsHighSignal(event) {
  if (event.purchaseStatus === 'purchased' || event.purchaseStatus === 'registered') return true;
  if ((event.sourceCategories || []).some((category) => category.toLowerCase() === 'black lotus')) return true;
  if ((event.relevanceReasons || []).length >= 2) return true;
  if (event.difficulty === 'social' || event.difficulty === 'challenging') return true;
  if (event.playFormat === 'commander' || event.playFormat === 'two_headed_giant') return true;
  return false;
}

function signalId(prefix, retrievedAt, scope) {
  const stamp = retrievedAt.replace(/[^0-9TZ]/g, '').replace(/Z$/, 'z');
  const safeScope = scope.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all';
  return `${prefix}-${stamp}-${safeScope}`;
}

function buildTicketedPlaySignals(added, changed, retrievedAt) {
  const signals = [];
  const highSignalAdded = added.filter(eventIsHighSignal);
  if (highSignalAdded.length > 0) {
    signals.push({
      id: signalId('ticketed-play-drop', retrievedAt, 'high-signal'),
      kind: 'ticketed_play_drop',
      severity: 'hot',
      title: `${highSignalAdded.length} high-signal ${highSignalAdded.length === 1 ? 'event' : 'events'} landed`,
      affectedEventIds: highSignalAdded.map((event) => event.id),
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', group: 'high_signal' }
    });
  }
  if (added.length > 0) {
    signals.push({
      id: signalId('ticketed-play-drop', retrievedAt, 'all'),
      kind: 'ticketed_play_drop',
      severity: added.length >= 5 ? 'worth_knowing' : 'activity',
      title: `${added.length} ticketed play ${added.length === 1 ? 'event landed' : 'events landed'}`,
      affectedEventIds: added.map((event) => event.id),
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', group: 'all_ticketed_play' }
    });
  }

  const soldOut = changed
    .filter((change) => change.fields.includes('availability') && change.current.availability === 'sold_out')
    .map((change) => change.current);
  if (soldOut.length > 0) {
    signals.push({
      id: signalId('ticketed-play-sold-out', retrievedAt, soldOut.map(eventKey).join('-')),
      kind: 'availability_change',
      severity: 'hot',
      title: soldOut.length === 1 ? `${soldOut[0].title || 'Ticketed Play event'} sold out` : `${soldOut.length} Ticketed Play events sold out`,
      affectedEventIds: soldOut.map((event) => event.id),
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', availability: 'sold_out', group: 'sold_out' }
    });
  }

  return signals;
}

async function summarizeTicketedPlayInventory(config, checkedAt) {
  if (!config?.currentSnapshotFile) return ticketedPlayEmptyDiff;

  const currentPath = path.join(root, config.currentSnapshotFile);
  const stateFile = config.stateFile || '.monitoring-state/ticketed-play-inventory.local.json';
  const statePath = path.join(root, stateFile);
  const currentSnapshot = await readJson(currentPath, { events: [] });
  const current = Array.isArray(currentSnapshot) ? currentSnapshot : currentSnapshot.events || [];
  const state = await readJson(statePath, { version: 1, accepted: [] });
  const previous = Array.isArray(state.accepted) ? state.accepted : [];
  const previousByKey = new Map(previous.map((event) => [eventKey(event), event]));
  const currentByKey = new Map(current.map((event) => [eventKey(event), event]));
  const added = current.filter((event) => !previousByKey.has(eventKey(event)));
  const removed = previous.filter((event) => !currentByKey.has(eventKey(event)));
  const changed = current.flatMap((event) => {
    const previousEvent = previousByKey.get(eventKey(event));
    if (!previousEvent) return [];
    const fields = eventChangedFields(previousEvent, event);
    return fields.length > 0 ? [{ previous: previousEvent, current: event, fields }] : [];
  });
  const signals = buildTicketedPlaySignals(added, changed, checkedAt);

  if (accept) {
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, `${JSON.stringify({ version: 1, accepted: current, acceptedAt: checkedAt }, null, 2)}\n`, 'utf8');
  }

  return {
    enabled: true,
    status: current.length > 0 ? 'checked' : 'empty-snapshot',
    currentSnapshotFile: config.currentSnapshotFile,
    stateFile,
    previousEventCount: previous.length,
    currentEventCount: current.length,
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
    signalCount: signals.length,
    signals
  };
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
  const linkRecords = source.trackLinks ? extractLinkRecords(html, source.url) : [];
  const links = linkRecords.map((link) => link.url);

  return {
    id: source.id,
    label: source.label,
    url: source.url,
    status,
    ok,
    title: extractTitle(html),
    textHash: hashText(normalizedText),
    linkHash: hashText(linkRecords.map(compactLinkRecord).join('\n')),
    textSample: normalizedText.slice(0, 500),
    linkCount: links.length,
    linkSample: linkRecords.slice(0, 40),
    links: linkRecords,
    rawHtml: html
  };
}

const watchSet = await readJson(watchSetPath);
const statePath = path.join(root, watchSet.stateFile || '.monitoring-state/watch-state.local.json');
const state = await readJson(statePath, { version: 1, accepted: {} });
const checkedAt = new Date().toISOString();
const results = [];
const changes = [];
const failures = [];
let newsletterIntake = { enabled: false, discoveredCount: 0, fetchedCount: 0, observationCount: 0, failureCount: 0 };
const fetchedSourcePages = [];
let ticketedPlay = ticketedPlayEmptyDiff;

for (const source of watchSet.sources) {
  try {
    const current = await fetchSource(source);
    fetchedSourcePages.push({ id: source.id, url: source.url, html: current.rawHtml });
    delete current.rawHtml;
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
        current: summarizeCurrent(current)
      });
      changes.at(-1).linkDelta = summarizeLinkDelta(previous, current);
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

if (watchSet.newsletterIntake) {
  const config = watchSet.newsletterIntake;
  const policy = {
    allowedHost: config.allowedHost,
    discoverySourceIds: config.discoverySourceIds,
    pathPrefixes: config.pathPrefixes,
    linkPattern: new RegExp(config.linkPattern, 'i'),
  };
  const limits = {
    maxLinks: config.maxLinks,
    maxPages: config.maxPages,
    maxBytes: config.maxBytes,
    timeoutMs: config.timeoutMs,
    maxTextChars: config.maxTextChars,
  };
  const links = discoverNewsletterLinks(fetchedSourcePages, policy, limits);
  const plan = planNewsletterFetch({ links, initialized: state.newsletterIntakeInitialized === true, discoveredUrls: state.discoveredNewsletterUrls, seen: state.seenNewsletters });
  const intake = await fetchNewsletterPages({ links: plan.linksToFetch, policy, limits, seen: state.seenNewsletters ?? {}, observedAt: checkedAt, suppressObservations: plan.initialBaseline });
  state.seenNewsletters = intake.seen;
  state.discoveredNewsletterUrls = [...new Set([...(state.discoveredNewsletterUrls ?? []), ...plan.eligible.map(link => link.url)])].sort();
  const unfingerprintedBaseline = plan.initialBaseline ? plan.eligible.filter(link => !intake.seen[link.url]) : [];
  state.newsletterIntakeInitialized = !plan.initialBaseline || unfingerprintedBaseline.length === 0;
  changes.push(...intake.observations);
  newsletterIntake = {
    enabled: true,
    discoveredCount: plan.eligible.length,
    fetchedCount: intake.fetchedCount,
    observationCount: intake.observations.length,
    rejectedNonAtlantaCount: links.length - plan.eligible.length,
    initialBaseline: plan.initialBaseline,
    baselineRemainingCount: unfingerprintedBaseline.length,
    failureCount: intake.failures.length,
    failures: intake.failures.slice(0, 8),
  };
}

const milestoneResult = dueMonitoringMilestoneChanges(watchSet.scheduledMilestones, state.reachedMilestones, checkedAt);
changes.push(...milestoneResult.changes);
state.reachedMilestones = milestoneResult.reached;

try {
  ticketedPlay = await summarizeTicketedPlayInventory(watchSet.ticketedPlayInventory, checkedAt);
} catch (error) {
  ticketedPlay = {
    ...ticketedPlayEmptyDiff,
    enabled: Boolean(watchSet.ticketedPlayInventory),
    status: 'failed',
    error: error.message
  };
  failures.push({
    id: 'ticketed-play-inventory',
    label: 'Ticketed play inventory snapshot',
    url: watchSet.ticketedPlayInventory?.currentSnapshotFile || '',
    error: error.message
  });
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
  ticketedPlay,
  newsletterIntake,
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
