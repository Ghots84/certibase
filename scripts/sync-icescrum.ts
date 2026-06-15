import fs from 'fs';
import path from 'path';

// Contourne les problèmes de certificat SSL sur Windows en dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PROJECT_ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, '_bmad-output', 'implementation-artifacts');
const SYNC_STATE_FILE = path.join(PROJECT_ROOT, '.icescrum-sync.json');

// Charge .env.local si les variables ne sont pas déjà définies
const envFile = path.join(PROJECT_ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const TOKEN = process.env.ICESCRUM_TOKEN;
// Accepte soit la clé courte ("MYPROJ") soit l'URL complète ("https://cloud.icescrum.com/ws/project/MYPROJ")
const raw = process.env.ICESCRUM_PROJECT_KEY ?? '';
const PROJECT_KEY = raw.startsWith('http') ? raw.split('/').filter(Boolean).at(-1)! : raw;
const BASE_URL = `https://cloud.icescrum.com/ws/project/${PROJECT_KEY}`;

// ── Types ──────────────────────────────────────────────────────────────────

interface LocalStory {
  filePath: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: 'draft' | 'in-progress' | 'review' | 'done';
}

type SyncState = Record<string, number>; // relative path → IceScrum story ID

// ── Status mapping ─────────────────────────────────────────────────────────

// IceScrum story states: 1=suggested, 2=accepted, 3=estimated, 4=planned, 5=in progress, 7=done
function toIceScrumState(status: string): number {
  switch (status) {
    case 'done':        return 7;
    case 'review':      return 5;
    case 'in-progress': return 5;
    default:            return 2; // accepted (backlog)
  }
}

function toLocalStatus(iceScrumState: number): LocalStory['status'] {
  switch (iceScrumState) {
    case 7:  return 'done';
    case 5:
    case 4:  return 'in-progress';
    default: return 'draft';
  }
}

// ── Parser ─────────────────────────────────────────────────────────────────

function parseStoryFile(filePath: string): LocalStory {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  const titleLine = lines.find(l => l.startsWith('# Story') || l.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#+\s+/, '').trim() : path.basename(filePath, '.md');

  const statusLine = lines.find(l => /^Status:/i.test(l));
  const rawStatus = statusLine ? statusLine.replace(/^Status:\s*/i, '').trim().toLowerCase() : 'draft';
  const status = (['draft', 'in-progress', 'review', 'done'].includes(rawStatus)
    ? rawStatus
    : 'draft') as LocalStory['status'];

  // Collect story body (between ## Story and next ##)
  const storyIdx = lines.findIndex(l => /^##\s+Story/i.test(l));
  const nextIdx  = lines.findIndex((l, i) => i > storyIdx + 1 && /^##\s/.test(l));
  const storyBody = storyIdx >= 0
    ? lines.slice(storyIdx + 1, nextIdx > 0 ? nextIdx : undefined).join('\n').trim()
    : '';

  // Acceptance criteria (numbered list under ## Acceptance Criteria)
  const acIdx  = lines.findIndex(l => /^##\s+Acceptance Criteria/i.test(l));
  const acEnd  = lines.findIndex((l, i) => i > acIdx + 1 && /^##\s/.test(l));
  const acLines = acIdx >= 0 ? lines.slice(acIdx + 1, acEnd > 0 ? acEnd : undefined) : [];
  const acceptanceCriteria = acLines
    .filter(l => /^\d+\./.test(l.trim()))
    .map(l => l.replace(/^\d+\.\s+/, '').trim());

  const acBlock = acceptanceCriteria.length > 0
    ? '\n\n**Critères d\'acceptation:**\n' + acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')
    : '';

  return {
    filePath,
    title,
    description: storyBody + acBlock,
    acceptanceCriteria,
    status,
  };
}

// ── IceScrum API ───────────────────────────────────────────────────────────

async function iceScrum<T = unknown>(method: string, endpoint: string, body?: object): Promise<T> {
  const url = `${BASE_URL}/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'x-icescrum-token': TOKEN!,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[IceScrum] ${method} ${endpoint} → HTTP ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ── Sync logic ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pushLocalStories(stories: LocalStory[], syncState: SyncState): Promise<SyncState> {
  for (const story of stories) {
    const relPath = path.relative(PROJECT_ROOT, story.filePath).replace(/\\/g, '/');
    const existingId = syncState[relPath];

    const storyData = {
      name: story.title,
      description: story.description,
      type: 0,                            // user story
    };

    if (existingId) {
      console.log(`  ↑ Updating  "${story.title}" (ID ${existingId})`);
      await iceScrum('PUT', `story/${existingId}`, { story: { ...storyData, state: toIceScrumState(story.status) } });
    } else {
      console.log(`  + Creating  "${story.title}"`);
      const created = await iceScrum<{ id: number } | { id: number }[]>('POST', 'story', { story: storyData });
      const id = Array.isArray(created) ? created[0].id : created.id;
      syncState[relPath] = id;
      console.log(`    → Created with ID ${id}`);
    }

    await sleep(400); // évite le rate-limit IceScrum (429)
  }
  return syncState;
}

// ── Pull: IceScrum → local status update ──────────────────────────────────

async function pullRemoteChanges(syncState: SyncState): Promise<void> {
  console.log('\nPulling remote story states from IceScrum...');
  const remoteStories = await iceScrum<Array<{ id: number; name: string; state: number }>>('GET', 'story/');
  const idToState = Object.fromEntries(remoteStories.map(s => [s.id, s.state]));

  for (const [relPath, id] of Object.entries(syncState)) {
    if (!(id in idToState)) continue;

    const remoteState = idToState[id];
    const newStatus   = toLocalStatus(remoteState);
    const fullPath    = path.join(PROJECT_ROOT, relPath);

    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const updated = content.replace(/^Status:.*$/m, `Status: ${newStatus}`);
    if (updated !== content) {
      fs.writeFileSync(fullPath, updated, 'utf-8');
      console.log(`  ↓ Pulled   "${relPath}" → Status: ${newStatus}`);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN || !PROJECT_KEY) {
    console.error('Missing env vars: ICESCRUM_TOKEN and/or ICESCRUM_PROJECT_KEY');
    process.exit(1);
  }

  const mode = process.argv[2] ?? 'push'; // push | pull | both

  // Load sync state
  let syncState: SyncState = {};
  if (fs.existsSync(SYNC_STATE_FILE)) {
    syncState = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
  }

  if (mode === 'push' || mode === 'both') {
    const storyFiles = fs.readdirSync(ARTIFACTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .map(f => path.join(ARTIFACTS_DIR, f));

    console.log(`\nPushing ${storyFiles.length} local stories to IceScrum (project: ${PROJECT_KEY})...`);
    const stories = storyFiles.map(parseStoryFile);
    syncState = await pushLocalStories(stories, syncState);
  }

  if (mode === 'pull' || mode === 'both') {
    await pullRemoteChanges(syncState);
  }

  // Persist sync state
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(syncState, null, 2), 'utf-8');
  console.log(`\nSync state saved → .icescrum-sync.json`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
