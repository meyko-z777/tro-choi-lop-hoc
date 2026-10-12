// Kết nối của ĐIỆN THOẠI sinh viên - thiết kế "lì đòn":
//  - Không tạo tài khoản; báo danh, gửi đáp án: dùng HTTPS thường (fetch), chạy được cả trong trình duyệt của Zalo/Facebook.
//  - Mỗi lần gửi đáp án đều chờ máy chủ xác nhận; lỗi mạng thì tự gửi lại.
//  - Nhận trạng thái ván chơi: kênh trực tiếp (Firestore) nếu được; kênh này kẹt/lỗi thì tự chuyển sang hỏi định kỳ.
import { firebaseConfig } from './config.js';

const Q = new URLSearchParams(location.search);
export const EMU = Q.has('emu');
export const DEMO = !EMU && (Q.has('demo') || !firebaseConfig.projectId);
const KEY = EMU ? 'demo-key' : firebaseConfig.apiKey, PROJECT = EMU ? 'demo-gdct' : firebaseConfig.projectId;
const FS = (EMU ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com') + `/v1/projects/${PROJECT}/databases/(default)/documents`;
const DOCROOT = `projects/${PROJECT}/databases/(default)/documents`;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- đổi dữ liệu Firestore REST <-> JS ----
export function dec(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return null;
}
export const decFields = f => { const o = {}; for (const k in f) o[k] = dec(f[k]); return o; };

async function fetchJSON(url, opt = {}, timeout = 8000) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), timeout);
  try {
    const r = await fetch(url, { ...opt, signal: ac.signal, cache: 'no-store' });
    let body = null; try { body = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, body };
  } finally { clearTimeout(tm); }
}

/* ======================= CHƠI THẬT ======================= */
export class RestPhone {
  kind = 'firebase';
  mode = 'đang nối';            // 'trực tiếp' | 'dự phòng'
  constructor(g) { this.g = g; this.rev = -1; this.subs = []; }

  // KHÔNG tạo tài khoản: Firebase chỉ cho ~100-150 tài khoản/giờ trên cùng địa chỉ mạng (cả lớp chung Wi-Fi/4G sẽ bị chặn).
  // Mỗi máy tự sinh một mã bí mật ngẫu nhiên (chỉ máy đó và màn hình lớn biết), giữ lại nếu trình duyệt cho lưu.
  async signIn() {
    let id = store.get('gdct-pid');
    if (!id || !/^[A-Za-z0-9]{20}$/.test(id)) {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', r = new Uint8Array(20);
      crypto.getRandomValues(r); id = [...r].map(x => A[x % 62]).join(''); store.set('gdct-pid', id);
    }
    this.uid = id; return id;
  }

  // Tạo tài liệu MỘT lần (có sẵn rồi thì coi như đã nhận). Trả về 'ok' | 'dup' | 'denied' | ném lỗi mạng.
  async create(path, fields) {
    const body = { writes: [{ update: { name: `${DOCROOT}/${path}`, fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 't', setToServerValue: 'REQUEST_TIME' }] }] };
    const r = await fetchJSON(`${FS}:commit?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) return 'ok';
    const st = r.body?.error?.status;
    if (r.status === 409 || st === 'ALREADY_EXISTS' || st === 'FAILED_PRECONDITION') return 'dup';
    if (r.status === 403 || st === 'PERMISSION_DENIED') return 'denied';
    throw new Error('Máy chủ trả lỗi ' + r.status);
  }
  async join() {
    for (let i = 0; i < 30; i++) {
      try { const r = await this.create(`games/${this.g}/players/${this.uid}`, {}); if (r !== 'denied') return r; throw new Error('denied'); }
      catch (e) { await sleep(Math.min(4000, 700 * (i + 1))); }
    }
  }
  // Hỏi số thứ tự (màn hình lớn cấp) cho tới khi có.
  async waitNumber(cb) {
    for (let i = 0; ; i++) {
      try {
        const r = await fetchJSON(`${FS}/games/${this.g}/nums/${this.uid}?key=${KEY}`);
        const n = r.ok ? dec(r.body.fields?.n) : null;
        if (n) { cb(n); return n; }
      } catch (e) {}
      await sleep(i < 10 ? 1500 : 3000);
    }
  }
  // Gửi đáp án: thử lại tới khi máy chủ xác nhận hoặc quá hạn. onStatus('sending'|'retry'|'ok'|'denied'|'late')
  async answer(q, a, deadline, onStatus) {
    onStatus('sending');
    for (let i = 0; ; i++) {
      try {
        const r = await this.create(`games/${this.g}/answers/${q}_${this.uid}`, { q: { integerValue: String(q) }, a: { integerValue: String(a) }, p: { stringValue: this.uid } });
        onStatus(r === 'denied' ? 'denied' : 'ok'); return r;
      } catch (e) {
        if (Date.now() > deadline) { onStatus('late'); return 'late'; }
        onStatus('retry'); await sleep(Math.min(1500, 400 * (i + 1)));
      }
    }
  }

  // ---- trạng thái ván chơi ----
  onState(cb) { this.subs.push(cb); }
  push(d, src) {
    if (!d) return;
    const rev = d.rev ?? 0;
    if (rev <= this.rev) return;
    this.rev = rev; this.subs.forEach(f => f(d, src));
  }
  async pollOnce() {
    try {
      const r = await fetchJSON(`${FS}/games/${this.g}?key=${KEY}`);
      if (r.ok) { this.push(decFields(r.body.fields || {}), 'poll'); return true; }
      if (r.status === 404) { this.subs.forEach(f => f(null, 'poll')); return true; }
    } catch (e) {}
    return false;
  }
  setMode(m) { if (this.mode !== m) { this.mode = m; this.onMode && this.onMode(m); } }
  async watch() {
    this.pollOnce();
    let live = false, lastLive = 0;
    if (!Q.has('poll')) {
      (async () => {
        try {
          const [A, F] = await Promise.all([import('./vendor/firebase-app.js'), import('./vendor/firebase-firestore.js')]);
          const cfg = EMU ? { apiKey: 'demo-key', projectId: 'demo-gdct', appId: 'demo' } : firebaseConfig;
          const app = A.initializeApp(cfg, 'phone');
          const db = F.initializeFirestore(app, {});
          if (EMU) F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
          F.onSnapshot(F.doc(db, 'games', this.g), { includeMetadataChanges: true }, s => {
            if (s.metadata.fromCache) return;
            live = true; lastLive = Date.now(); this.setMode('trực tiếp');
            this.push(s.exists() ? norm(s.data({ serverTimestamps: 'estimate' })) : null, 'live');
          }, () => { live = false; this.setMode('dự phòng'); });
        } catch (e) { live = false; this.setMode('dự phòng'); }
      })();
    }
    // Dự phòng: chưa có kênh trực tiếp sau 6 giây (hoặc kênh lỗi) -> hỏi 2,5 giây/lần.
    // Có kênh trực tiếp rồi vẫn hỏi lại 25 giây/lần cho chắc (phòng khi kênh "đứng hình" mà không báo lỗi).
    const t0 = Date.now(); let lastPoll = Date.now();
    for (;;) {
      await sleep(500);
      const now = Date.now();
      if (!live && now - t0 > 6000) this.setMode('dự phòng');
      const every = live ? 25000 : 2500;
      if (this.wantPoll && this.wantPoll()) { this.wantPoll = null; lastPoll = now; await this.pollOnce(); continue; }
      if (now - lastPoll >= every) { lastPoll = now; await this.pollOnce(); }
    }
  }
}
function norm(d) {
  const o = { ...d };
  for (const k of ['qStart']) if (o[k]?.toMillis) o[k] = o[k].toMillis();
  if (o.starts) { const s = {}; for (const k in o.starts) s[k] = o.starts[k]?.toMillis ? o.starts[k].toMillis() : o.starts[k]; o.starts = s; }
  return o;
}

/* ======================= CHẾ ĐỘ THỬ (1 máy, các tab nói chuyện qua BroadcastChannel) ======================= */
export class DemoPhone {
  kind = 'demo'; mode = 'thử';
  constructor(g) { this.g = g; this.subs = []; this.bc = new BroadcastChannel('gdct-demo'); this.bc.onmessage = e => this.on(e.data); this.rev = -1; }
  on(m) {
    if (m.g !== this.g) return;
    if (m.k === 'game') { const d = m.d; if ((d.rev ?? 0) > this.rev) { this.rev = d.rev ?? 0; this.subs.forEach(f => f(d, 'live')); } }
    if (m.k === 'num' && m.uid === this.uid) this._num && this._num(m.n);
  }
  async signIn() { let u = sessionStorage.getItem('demo-uid'); if (!u) { u = 'u' + Math.random().toString(36).slice(2, 12); sessionStorage.setItem('demo-uid', u); } this.uid = u; return u; }
  async join() { this.bc.postMessage({ k: 'join', g: this.g, uid: this.uid, t: Date.now() }); }
  waitNumber(cb) { return new Promise(res => { this._num = n => { cb(n); res(n); }; const ask = () => { if (this._num) this.bc.postMessage({ k: 'join', g: this.g, uid: this.uid, t: Date.now() }); }; setTimeout(ask, 800); }); }
  async answer(q, a, deadline, onStatus) { onStatus('sending'); this.bc.postMessage({ k: 'ans', g: this.g, uid: this.uid, q, a, t: Date.now() }); await sleep(150); onStatus('ok'); return 'ok'; }
  onState(cb) { this.subs.push(cb); }
  async watch() { this.bc.postMessage({ k: 'hello', g: this.g }); }
}
export const makePhone = g => DEMO ? new DemoPhone(g) : new RestPhone(g);
