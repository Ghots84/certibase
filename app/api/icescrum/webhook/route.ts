import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// IceScrum story states: 1=suggested, 2=accepted, 3=estimated, 4=planned, 5=in progress, 7=done
function toLocalStatus(state: number): string {
  if (state === 7)       return 'done';
  if (state === 5 || state === 4) return 'in-progress';
  return 'draft';
}

const SYNC_STATE_FILE = path.join(process.cwd(), '.icescrum-sync.json');

// IceScrum sends a POST when a story changes.
// Payload shape: { story: { id, name, state, ... } }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const story: { id?: number; state?: number } = body?.story ?? body;
  if (!story?.id || story?.state === undefined) {
    return NextResponse.json({ error: 'Payload must include story.id and story.state' }, { status: 400 });
  }

  if (!fs.existsSync(SYNC_STATE_FILE)) {
    return NextResponse.json({ ok: true, message: 'No sync state — nothing to update' });
  }

  const syncState: Record<string, number> = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
  const entry = Object.entries(syncState).find(([, id]) => id === story.id);

  if (!entry) {
    return NextResponse.json({ ok: true, message: `Story ${story.id} not tracked locally` });
  }

  const [relPath] = entry;
  const fullPath  = path.join(process.cwd(), relPath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ ok: true, message: `Local file not found: ${relPath}` });
  }

  const newStatus = toLocalStatus(story.state);
  const content   = fs.readFileSync(fullPath, 'utf-8');
  const updated   = content.replace(/^Status:.*$/m, `Status: ${newStatus}`);
  fs.writeFileSync(fullPath, updated, 'utf-8');

  return NextResponse.json({ ok: true, updated: relPath, newStatus });
}
