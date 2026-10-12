// TỔNG DUYỆT: giả lập nhiều điện thoại sinh viên, đi ĐÚNG đường mà trang điện thoại dùng (HTTPS, không tạo tài khoản,
// báo danh, chờ số, gửi đáp án và chờ máy chủ xác nhận). Mở màn hình lớn ở nơi khác rồi chạy:
//   node kiem-thu/tong-duyet.mjs <mã phòng> <số máy> [--emu]
// Một bộ theo dõi chung đọc trạng thái ván 1 lần/giây cho tất cả máy ảo (đỡ tốn lượt đọc của gói miễn phí).
const [, , G, NARG, ...rest] = process.argv;
const EMU = rest.includes('--emu'), N = +NARG || 50;
const KEY = EMU ? 'demo-key' : 'AIzaSyCnEr1oMO2PDe0Q4iOQjsfm-_DiXxfmNJE', PROJECT = EMU ? 'demo-gdct' : 'tro-choi-on-bai-gdct-buoi-1';
const AUTH = EMU ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1' : 'https://identitytoolkit.googleapis.com/v1';
const FS = (EMU ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com') + `/v1/projects/${PROJECT}/databases/(default)/documents`;
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dec = v => !v ? null : 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : 'timestampValue' in v ? Date.parse(v.timestampValue)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec) : 'doubleValue' in v ? v.doubleValue : null;
async function j(url, opt = {}) { const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(10000) }); let b = null; try { b = await r.json(); } catch (e) {} return { ok: r.ok, status: r.status, b }; }

const stat = { signin: 0, joined: 0, numbered: 0, nums: new Set(), sent: {}, ack: {}, denied: {}, retries: 0, late: {}, ackMs: [], errors: [] };
let game = null;
async function create(bot, path) {
  const fields = path.includes('/answers/') ? { q: { integerValue: String(bot.q) }, a: { integerValue: String(bot.a) }, p: { stringValue: bot.uid } } : {};
  const body = { writes: [{ update: { name: `${ROOT}/${path}`, fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 't', setToServerValue: 'REQUEST_TIME' }] }] };
  const r = await j(`${FS}:commit?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.ok) return 'ok';
  if (r.status === 409 || r.b?.error?.status === 'ALREADY_EXISTS' || r.b?.error?.status === 'FAILED_PRECONDITION') return 'dup';
  if (r.status === 403) return 'denied';
  throw new Error('HTTP ' + r.status);
}
async function bot(i) {
  await sleep(Math.random() * 8000);                              // sinh viên quét QR rải rác
  const b = { i };
  b.uid = Array.from({ length: 20 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
  stat.signin++;
  for (let k = 0; ; k++) { try { await create(b, `games/${G}/players/${b.uid}`); break; } catch (e) { stat.retries++; if (k > 10) { stat.errors.push('join'); return; } await sleep(800); } }
  stat.joined++;
  for (let k = 0; k < 60; k++) {
    await sleep(1500);
    try { const r = await j(`${FS}/games/${G}/nums/${b.uid}?key=${KEY}`); const n = r.ok ? dec(r.b.fields?.n) : null; if (n) { b.n = n; stat.numbered++; stat.nums.add(n); break; } } catch (e) {}
  }
  const done = new Set();
  while (!game || game.state !== 'end') {
    await sleep(200);
    if (game?.state === 'question' && !done.has(game.q)) {
      const q = game.q, limit = game.question.limit; done.add(q);
      await sleep(800 + Math.random() * (limit - 4) * 1000);
      b.q = q; b.a = Math.floor(Math.random() * game.question.options.length);
      stat.sent[q] = (stat.sent[q] || 0) + 1; const t0 = Date.now(), deadline = t0 + limit * 1000;
      for (let k = 0; ; k++) {
        try { const r = await create(b, `games/${G}/answers/${q}_${b.uid}`); if (r === 'denied') stat.denied[q] = (stat.denied[q] || 0) + 1; else { stat.ack[q] = (stat.ack[q] || 0) + 1; stat.ackMs.push(Date.now() - t0); } break; }
        catch (e) { stat.retries++; if (Date.now() > deadline) { stat.late[q] = (stat.late[q] || 0) + 1; break; } await sleep(500); }
      }
    }
  }
}
(async () => {
  console.log(`Tổng duyệt phòng ${G}: ${N} máy ảo ${EMU ? '(giả lập)' : '(MÁY CHỦ THẬT)'}`);
  const watch = (async () => { for (;;) { try { const r = await j(`${FS}/games/${G}?key=${KEY}`); if (r.ok) game = Object.fromEntries(Object.entries(r.b.fields).map(([k, v]) => [k, dec(v)])); } catch (e) {} if (game?.state === 'end') return; await sleep(1000); } })();
  const rep = setInterval(() => console.log(`vào ${stat.joined}/${N} · có số ${stat.numbered} · trạng thái ${game?.state}:${game?.q} · đã gửi ${JSON.stringify(stat.sent)} · xác nhận ${JSON.stringify(stat.ack)} · thử lại ${stat.retries}`), 5000);
  await Promise.all(Array.from({ length: N }, (_, i) => bot(i)));
  await watch; clearInterval(rep);
  const ms = stat.ackMs.sort((a, b) => a - b), p = x => ms[Math.min(ms.length - 1, Math.floor(ms.length * x))];
  const results = game?.results || {};
  console.log(JSON.stringify({ N, signin: stat.signin, joined: stat.joined, numbered: stat.numbered, uniqueNumbers: stat.nums.size, sent: stat.sent, ack: stat.ack, denied: stat.denied, late: stat.late, retries: stat.retries,
    ackMs: { p50: p(.5), p95: p(.95), max: ms[ms.length - 1] }, hostTotal: game?.total, resultsCount: Object.keys(results).length, errors: stat.errors.slice(0, 5) }, null, 1));
})();
