// Lớp kết nối: FirebaseNet (chơi thật, nhiều máy) hoặc DemoNet (chạy thử trên 1 máy tính, các tab nói chuyện qua BroadcastChannel).
// Cả hai có cùng giao diện để host.html và index.html không cần biết đang chạy chế độ nào.
import { firebaseConfig } from './config.js';

const Q = new URLSearchParams(location.search);
export const EMU = Q.has('emu');                       // dùng Firebase Emulator (kiểm thử tải)
export const DEMO = !EMU && (Q.has('demo') || !firebaseConfig.projectId);

export async function makeNet() { return DEMO ? new DemoNet() : await FirebaseNet.create(); }

/* ======================= FIREBASE ======================= */
class FirebaseNet {
  static async create() {
    const [A, U, F] = await Promise.all([import('./vendor/firebase-app.js'), import('./vendor/firebase-auth.js'), import('./vendor/firebase-firestore.js')]);
    const n = new FirebaseNet(); n.U = U; n.F = F;
    const cfg = EMU ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-gdct', appId: 'demo' } : firebaseConfig;
    n.app = A.initializeApp(cfg);
    n.auth = U.getAuth(n.app);
    n.db = F.initializeFirestore(n.app, { experimentalAutoDetectLongPolling: true });
    if (EMU) { U.connectAuthEmulator(n.auth, 'http://127.0.0.1:9099', { disableWarnings: true }); F.connectFirestoreEmulator(n.db, '127.0.0.1', 8080); }
    n.offset = 0;
    return n;
  }
  kind = 'firebase';
  G(g) { return this.F.doc(this.db, 'games', g); }

  // ---------- phía sinh viên ----------
  async signInStudent() { const r = await this.U.signInAnonymously(this.auth); this.uid = r.user.uid; return this.uid; }
  async join(g) {
    const { F } = this, ref = F.doc(this.db, 'games', g, 'players', this.uid);
    try { await F.setDoc(ref, { t: F.serverTimestamp() }); } catch (e) { /* đã vào trước đó (tải lại trang) */ }
    try { const s = await F.getDoc(ref); if (s.exists()) this.offset = s.data().t.toMillis() - Date.now(); } catch (e) {}
  }
  now() { return Date.now() + this.offset; }
  onGame(g, cb, meta = false) { return this.F.onSnapshot(this.G(g), { includeMetadataChanges: meta }, s => cb(s.exists() ? norm(s.data({ serverTimestamps: 'estimate' })) : null, s.metadata.hasPendingWrites)); }
  onRoster(g, cb) { return this.F.onSnapshot(this.F.doc(this.db, 'games', g, 'pub', 'roster'), s => cb(s.exists() ? s.data().m || {} : {})); }
  answer(g, q, a) { const F = this.F; return F.setDoc(F.doc(this.db, 'games', g, 'answers', q + '_' + this.uid), { q, a, t: F.serverTimestamp() }); }

  // ---------- phía giảng viên ----------
  async signInHost(interactive) {
    const U = this.U;
    if (this.auth.currentUser && !this.auth.currentUser.isAnonymous) return this.auth.currentUser;
    if (EMU) { const c = U.GoogleAuthProvider.credential(JSON.stringify({ sub: 'host', email: 'host@test.vn', email_verified: true })); return (await U.signInWithCredential(this.auth, c)).user; }
    await this.auth.authStateReady();
    if (this.auth.currentUser && !this.auth.currentUser.isAnonymous) return this.auth.currentUser;
    if (!interactive) return null;
    return (await U.signInWithPopup(this.auth, new U.GoogleAuthProvider())).user;
  }
  setGame(g, data, merge = true) {
    const F = this.F, d = { ...data };
    if (d.qStart === 'SERVER') d.qStart = F.serverTimestamp();
    if (d.starts) for (const k in d.starts) if (d.starts[k] === 'SERVER') d.starts[k] = F.serverTimestamp();
    return F.setDoc(this.G(g), d, { merge });
  }
  onGameHost(g, cb) { return this.onGame(g, cb, true); }
  getRoster(g) { return this.F.getDoc(this.F.doc(this.db, 'games', g, 'pub', 'roster')).then(s => s.exists() ? s.data().m || {} : {}); }
  setRoster(g, m) { return this.F.setDoc(this.F.doc(this.db, 'games', g, 'pub', 'roster'), { m }); }
  onPlayers(g, cb) {
    return this.F.onSnapshot(this.F.collection(this.db, 'games', g, 'players'), s => {
      cb(s.docChanges().filter(c => c.type === 'added').map(c => ({ uid: c.doc.id, t: c.doc.data({ serverTimestamps: 'estimate' }).t?.toMillis?.() ?? Date.now() })));
    });
  }
  onAnswers(g, cb) {
    return this.F.onSnapshot(this.F.collection(this.db, 'games', g, 'answers'), s => {
      cb(s.docChanges().filter(c => c.type === 'added').map(c => { const d = c.doc.data({ serverTimestamps: 'estimate' }); return { uid: c.doc.id.slice(String(d.q).length + 1), q: d.q, a: d.a, t: d.t.toMillis() }; }));
    });
  }
}
function norm(d) {
  if (d && d.qStart && d.qStart.toMillis) d.qStartMs = d.qStart.toMillis();
  if (d && d.starts) { d.startsMs = {}; for (const k in d.starts) if (d.starts[k]?.toMillis) d.startsMs[k] = d.starts[k].toMillis(); }
  return d;
}

/* ======================= CHẾ ĐỘ THỬ (1 máy) ======================= */
class DemoNet {
  kind = 'demo';
  constructor() { this.bc = new BroadcastChannel('gdct-demo'); this.subs = []; this.bc.onmessage = e => this.subs.forEach(f => f(e.data)); this.offset = 0; }
  on(f) { this.subs.push(f); return () => { this.subs = this.subs.filter(x => x !== f); }; }
  send(m) { this.bc.postMessage(m); }
  now() { return Date.now(); }
  // sinh viên
  async signInStudent() { let u = sessionStorage.getItem('demo-uid'); if (!u) { u = 'u' + Math.random().toString(36).slice(2, 12); sessionStorage.setItem('demo-uid', u); } this.uid = u; return u; }
  async join(g) { this.send({ k: 'join', g, uid: this.uid, t: Date.now() }); }
  onGame(g, cb) { const off = this.on(m => m.g === g && m.k === 'game' && cb(m.d)); this.send({ k: 'hello', g }); return off; }
  onRoster(g, cb) { return this.on(m => m.g === g && m.k === 'roster' && cb(m.m)); }
  async answer(g, q, a) { this.send({ k: 'ans', g, uid: this.uid, q, a, t: Date.now() }); }
  // giảng viên
  async signInHost() { return { email: 'chế độ thử' }; }
  setGame(g, data, merge = true) {
    this.game = merge ? { ...(this.game || {}), ...data } : { ...data };
    if (data.qStart === 'SERVER') { this.game.qStart = Date.now(); this.game.qStartMs = this.game.qStart; }
    if (data.starts) { this.game.starts = { ...(this.game.startsMs || {}) }; for (const k in data.starts) this.game.starts[k] = data.starts[k] === 'SERVER' ? Date.now() : data.starts[k]; this.game.startsMs = this.game.starts; }
    this.send({ k: 'game', g, d: this.game }); this._hostGame && this._hostGame(this.game, false); return Promise.resolve();
  }
  onGameHost(g, cb) { this._hostGame = cb; this.on(m => { if (m.g === g && m.k === 'hello' && this.game) { this.send({ k: 'game', g, d: this.game }); this.send({ k: 'roster', g, m: this.roster || {} }); } }); return () => {}; }
  async getRoster() { return {}; }
  setRoster(g, m) { this.roster = m; this.send({ k: 'roster', g, m }); return Promise.resolve(); }
  onPlayers(g, cb) { this._players = cb; return this.on(m => m.g === g && m.k === 'join' && cb([{ uid: m.uid, t: m.t }])); }
  onAnswers(g, cb) { this._answers = cb; return this.on(m => m.g === g && m.k === 'ans' && cb([{ uid: m.uid, q: m.q, a: m.a, t: m.t }])); }
  // máy ảo (chỉ có ở chế độ thử): đi thẳng vào bộ xử lý của host
  botJoin(list) { this._players && this._players(list); }
  botAnswer(list) { this._answers && this._answers(list); }
}
