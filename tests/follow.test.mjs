// Playwright check for the "Follow sonde ascent" mode (and that the classic app still works).
// Run: node tests/follow.test.mjs
//   env PLAYWRIGHT_MODULE=/path/to/playwright  PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers
// Serves the repo folder with a tiny static server and the mock Worker from
// tests/follow-mock-server.mjs (SimGroundLink telemetry from the s2ground repo).
// Screenshots land in tests/shots/ (git-ignored).

import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startMockServer } from './follow-mock-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const shots = path.resolve(new URL('./shots', import.meta.url).pathname);
await mkdir(shots, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try { const data = await readFile(path.join(root, p)); res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const mock = await startMockServer({ speed: 40 });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1380, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|ERR_TUNNEL|403|unpkg|openstreetmap|nominatim/.test(m.text())) errors.push(`console: ${m.text()}`); });
const shot = (name, full) => page.screenshot({ path: path.join(shots, name), fullPage: !!full });
const step = (s) => console.log(`» ${s}`);
const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT: ' + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

try {
  step('page loads, empty state');
  await page.goto(`${base}/?s2api=${encodeURIComponent(mock.base)}`);
  await page.waitForSelector('#emptyState');
  assert(await page.isVisible('#followBtn'), 'Follow button in the toolbar');
  assert(await page.isHidden('#dataView'), 'no data view before loading');

  step('Sample data renders as before');
  await page.click('#resetBtn');
  await page.waitForSelector('#dataView', { state: 'visible' });
  const sample = await page.evaluate(() => ({
    rows: state.rows.length, stats: document.querySelectorAll('#statStrip .stat').length,
    canvasW: document.getElementById('chart').width, canvasH: document.getElementById('chart').height,
    hodo: getComputedStyle(document.getElementById('hodoCard')).display, rise: getComputedStyle(document.getElementById('riseCard')).display,
    map: getComputedStyle(document.getElementById('mapCard')).display, subtitle: document.getElementById('subtitle').textContent,
    legend: document.querySelectorAll('#legend .item').length, follow: document.body.classList.contains('follow-live'),
  }));
  console.log('  sample:', sample);
  assert(sample.rows > 100 && sample.stats === 8 && sample.canvasW > 500 && sample.canvasH > 400, 'sample data drew the diagram');
  assert(sample.hodo === 'block' && sample.rise === 'block' && sample.map === 'block', 'side panels visible');
  assert(/Sample data/.test(sample.subtitle) && !sample.follow, 'classic mode untouched');
  await shot('01-sample-data.png');

  step('Follow dialog: wrong code, revoked code');
  await page.click('#followBtn');
  await page.waitForSelector('#followDialogOverlay', { state: 'visible' });
  await shot('02-follow-dialog.png');
  await page.fill('#followCodeInput', 'ab0o1i');          // 0/O/1/I are filtered out
  assert((await page.inputValue('#followCodeInput')) === 'AB', 'code input filters 0/O/1/I and upper-cases');
  await page.fill('#followCodeInput', 'ZZZZZZ');
  await page.fill('#followNameInput', 'Hans Muster');
  await page.click('#followDialogGo');
  await page.waitForFunction(() => /Code nicht gültig/.test(document.getElementById('followDialogErr').textContent));
  await page.fill('#followCodeInput', 'RVKDXX');
  await page.click('#followDialogGo');
  await page.waitForFunction(() => /Code nicht mehr gültig/.test(document.getElementById('followDialogErr').textContent));
  await shot('02b-follow-dialog-error.png');

  step('Follow dialog: valid code lists the running ascent');
  await page.fill('#followCodeInput', 'TEST42');
  await page.click('#followDialogGo');
  await page.waitForFunction(() => document.querySelectorAll('.follow-ascent.sel').length === 1 || document.body.classList.contains('follow-live'));
  if (!(await page.evaluate(() => document.body.classList.contains('follow-live')))) {
    await shot('03-follow-dialog-list.png');
    await page.click('#followDialogGo');
  }
  await page.waitForFunction(() => document.body.classList.contains('follow-live') && document.body.classList.contains('follow-docked'));
  const remembered = await page.evaluate(() => JSON.parse(localStorage.getItem('s2stueve.follow')));
  assert(remembered.code === 'TEST42' && remembered.name === 'Hans Muster', 'code + Klarname remembered');

  step('live: history replayed, diagram builds up');
  await page.waitForFunction(() => FOLLOW.records.length > 50 && state.source && state.source.startsWith('LIVE'), null, { timeout: 30000 });
  const n1 = await page.evaluate(() => state.rows.length);
  await sleep(4000);
  const live = await page.evaluate(() => ({
    rows: state.rows.length, recs: FOLLOW.records.length, source: state.source, subtitle: document.getElementById('subtitle').textContent,
    pills: [...document.querySelectorAll('#followPills .follow-pill')].map((p) => p.textContent.trim()),
    chatVisible: getComputedStyle(document.getElementById('followChat')).display, fabVisible: getComputedStyle(document.getElementById('followFab')).display,
    appMargin: getComputedStyle(document.querySelector('.app')).marginRight, canvasCssW: document.getElementById('chart').getBoundingClientRect().width,
    stopBtn: getComputedStyle(document.getElementById('followStopBtn')).display, sampleBtn: getComputedStyle(document.getElementById('resetBtn')).display,
    quick: [...document.querySelectorAll('#followQuick button')].map((b) => b.textContent), joined: /Hans Muster joined/.test(document.getElementById('followChatMsgs').textContent),
    sondeId: state.sondeId,
  }));
  console.log('  live:', live);
  assert(live.rows > n1, `rows grow live (${n1} → ${live.rows})`);
  assert(/^LIVE · \d{4}-\d{2}-\d{2} · Rümlang · Bodenstation bwicki$/.test(live.source), 'state.source label: ' + live.source);
  assert(live.subtitle.includes('LIVE ·'), 'subtitle shows LIVE');
  assert(live.pills.some((p) => /letzte Daten vor \d+ s/.test(p)) && live.pills.some((p) => /Signal −\d+ dBm · [\d']+ Pakete/.test(p)) && live.pills.some((p) => /^1 verbunden/.test(p)), 'header pills: ' + live.pills.join(' | '));
  assert(live.chatVisible === 'flex' && live.fabVisible === 'none' && live.appMargin === '340px', 'chat docked right, app shrunk');
  assert(live.canvasCssW < 1380 - 340 && live.canvasCssW > 500, 'diagram scaled into remaining width: ' + live.canvasCssW);
  assert(live.stopBtn !== 'none' && live.sampleBtn === 'none', 'toolbar switched to follow mode');
  assert(live.quick.length === 3 && live.quick[0] === 'Bitte jetzt auslösen', 'default quick replies');
  assert(live.joined, 'system line "joined" in chat');
  assert(live.sondeId === '123', 'sonde id from ascent meta');
  await shot('04-follow-docked.png', true);

  step('mapping check: followRecordsToCsv == S2 Ground csvText, parseCSV rows == followRecordToRow');
  const { csvText } = await import(pathToFileURL(process.env.S2GROUND_FILES || '/home/claude/s2ground/src/files.js').href);
  const recs = mock.history.slice(0, 400);
  const expectedCsv = csvText(recs, 432);
  const mapCheck = await page.evaluate((recs) => {
    const csv = followRecordsToCsv(recs, 432);
    const rowsDirect = recs.map(followRecordToRow).filter(Boolean);
    // parseCSV fills single dropped packets with interpolated rows (flag stays false for short gaps – only
    // long gaps are flagged), trims the ground phase and cuts at the peak – so compare on matching timestamps
    // and merely count the interpolated extras.
    const parsed = parseCSV(csv);
    const byT = new Map(rowsDirect.map((r) => [r[0], r]));
    let mismatches = 0, compared = 0, interpolated = 0;
    for (const r of parsed) {
      const d = byT.get(r[0]); if (!d) { interpolated++; continue; }
      compared++;
      for (let i = 1; i <= 10; i++) { const a = r[i], b = d[i]; if (!((a == null && b == null) || Math.abs(a - b) < 1e-6)) { mismatches++; break; } }
    }
    return { csv, compared, mismatches, interpolated, parsedN: parsed.length };
  }, recs);
  assert(mapCheck.csv === expectedCsv, 'CSV text byte-identical to s2ground files.js csvText()');
  assert(mapCheck.compared > 100 && mapCheck.mismatches === 0, `row mapping agrees (${mapCheck.compared} rows, ${mapCheck.mismatches} mismatches)`);
  assert(mapCheck.interpolated <= Math.ceil(mapCheck.parsedN / 40), `only the sim's 1-in-97 dropped packets are interpolated (${mapCheck.interpolated})`);
  console.log(`  csv identical (${expectedCsv.length} bytes), ${mapCheck.compared} rows compared, 0 mismatches, ${mapCheck.interpolated} gap-filled rows`);

  step('chat round trip: observer → mock → echo; ground reply');
  await page.fill('#followChatInput', 'Profil reicht uns – bitte jetzt auslösen.');
  await page.press('#followChatInput', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('#followChatMsgs .follow-msg.me .t')].some((e) => e.textContent.includes('bitte jetzt auslösen')));
  assert((await page.inputValue('#followChatInput')) === '', 'input cleared after send');
  assert(mock.chat.some((m) => m.role === 'observer' && m.user === 'Hans Muster' && /bitte jetzt auslösen/.test(m.text)), 'mock received the observer chat');
  mock.groundChat('Verstanden, löse aus.');
  await page.waitForFunction(() => [...document.querySelectorAll('#followChatMsgs .follow-msg:not(.me) .who')].some((e) => /Ground · bwicki/.test(e.textContent)));
  await page.click('#followQuick button:first-child');
  await page.waitForFunction(() => document.querySelectorAll('#followChatMsgs .follow-msg.me').length >= 2);
  await shot('05-follow-chat.png');

  step('maximise: chat → floating button with unread badge + preview; re-dock');
  await page.click('#followMaxBtn');
  await page.waitForFunction(() => !document.body.classList.contains('follow-docked'));
  await sleep(600);
  const maxed = await page.evaluate(() => ({ chat: getComputedStyle(document.getElementById('followChat')).display, fab: getComputedStyle(document.getElementById('followFab')).display, margin: getComputedStyle(document.querySelector('.app')).marginRight, canvasCssW: document.getElementById('chart').getBoundingClientRect().width, btn: document.getElementById('followMaxBtn').textContent }));
  assert(maxed.chat === 'none' && /flex/.test(maxed.fab) && maxed.margin === '0px' && maxed.canvasCssW > 1000, 'maximised layout: ' + JSON.stringify(maxed));
  assert(/Verkleinern/.test(maxed.btn), 'button toggles to Verkleinern');
  mock.groundChat('OK, Steigrate stabil.');
  await page.waitForFunction(() => document.getElementById('followFabBadge').textContent === '1' && getComputedStyle(document.getElementById('followFabPreview')).display === 'block');
  await shot('06-follow-maximised.png', true);
  await page.click('#followFab');
  await page.waitForFunction(() => document.body.classList.contains('follow-docked') && getComputedStyle(document.getElementById('followFabBadge')).display === 'none');

  step('narrow viewport: chat becomes a bottom sheet');
  await page.setViewportSize({ width: 820, height: 1000 });
  await sleep(800);
  const narrow = await page.evaluate(() => { const r = document.getElementById('followChat').getBoundingClientRect(); return { w: r.width, top: r.top, bottom: r.bottom, pad: getComputedStyle(document.querySelector('.app')).paddingBottom, margin: getComputedStyle(document.querySelector('.app')).marginRight }; });
  assert(narrow.w === 820 && narrow.top > 400 && Math.round(narrow.bottom) === 1000, 'bottom sheet: ' + JSON.stringify(narrow));
  await shot('07-follow-mobile.png');
  await page.setViewportSize({ width: 1380, height: 1000 });

  step('Folgen beenden keeps the data, Export CSV / Save flight stay enabled');
  await page.click('#followStopBtn');
  await page.waitForFunction(() => !document.body.classList.contains('follow-live'));
  const after = await page.evaluate(() => ({ rows: state.rows.length, source: state.source, exportDisabled: document.getElementById('exportBtn').disabled, saveDisabled: document.getElementById('saveFlightBtn').disabled, dataView: getComputedStyle(document.getElementById('dataView')).display, chat: getComputedStyle(document.getElementById('followChat')).display, sample: getComputedStyle(document.getElementById('resetBtn')).display, ws: !!FOLLOW.ws }));
  console.log('  after stop:', after);
  assert(after.rows > 100 && /^S2 Ground .* \(Follow beendet\)$/.test(after.source) && !after.exportDisabled && !after.saveDisabled && after.dataView === 'block' && after.chat === 'none' && after.sample !== 'none' && !after.ws, 'stop state');
  await shot('08-follow-stopped.png');

  step('re-join (remembered code pre-filled) and kick → notice, follow mode left, data kept');
  await page.click('#followBtn');
  await page.waitForFunction(() => document.getElementById('followCodeInput').value === 'TEST42' && document.getElementById('followNameInput').value === 'Hans Muster');
  await page.waitForFunction(() => document.querySelectorAll('.follow-ascent.sel').length === 1, null, { timeout: 10000 });
  await page.click('#followDialogGo');
  await page.waitForFunction(() => document.body.classList.contains('follow-live') && FOLLOW.ws && FOLLOW.ws.readyState === 1);
  await sleep(1500);
  mock.kick();
  await page.waitForFunction(() => !document.body.classList.contains('follow-live') && /Bodenstation hat Dich entfernt/.test(document.getElementById('followNotice').textContent) && getComputedStyle(document.getElementById('followNotice')).display === 'block');
  assert(await page.evaluate(() => state.rows.length > 100 && getComputedStyle(document.getElementById('dataView')).display === 'block'), 'data kept after kick');
  await shot('09-follow-kicked.png');

  step('classic flows still work after follow mode: Sample data, Export CSV click');
  await page.click('#resetBtn');
  await page.waitForFunction(() => /Sample data/.test(document.getElementById('subtitle').textContent));
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('#exportBtn');
  const d = await dl;
  assert(d && /^stueve_17354_/.test(d.suggestedFilename()), 'Export CSV download: ' + (d && d.suggestedFilename()));

  if (errors.length) { console.log('page errors:', errors); throw new Error('console/page errors'); }
  console.log('\nALL FOLLOW CHECKS PASSED');
} catch (e) {
  failed = true;
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error('page errors:', errors);
  try { await shot('99-failure.png'); } catch { /* ignore */ }
} finally {
  await browser.close();
  await mock.close();
  server.close();
  process.exit(failed ? 1 : 0);
}
