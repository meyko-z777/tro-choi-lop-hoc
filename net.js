// Kết nối của MÀN HÌNH LỚN (laptop giảng viên): FirebaseHost (chơi thật) hoặc DemoHost (chạy thử trên 1 máy).
// Giảng viên đăng nhập bằng MÃ PIN (không cần Google). Máy đã nhập PIN đúng một lần thì lần sau tự vào.
import { firebaseConfig } from './config.js';

const Q = new URLSearchParams(location.search);
const DBG = window.__dbg = {};
const cnt = (k, n = 1) => DBG[k] = (DBG[k] || 0) + n;
export const EMU = Q.has('emu');
export const DEMO = !EMU && (Q.has('demo') || !firebaseConfig.projectId);

export async function makeNet() { return DEMO ? new DemoHost() : await FirebaseHost.create(); }

/* ======================= FIREBASE ======================= */
class FirebaseHost {
  static async create() {
    const [A, U, F] = await Promise.all([import('./vendor/firebase-app.js'), import('./vendor/firebase-auth.js'), import('./vendor/firebase-firestore.js')]);
    const n = new FirebaseHost(); n.U = U; n.F = F;
    const cfg = EMU ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-gdct', appId: 'demo' } : firebaseConfig;
    n.app = A.initializeApp(cfg);
    n.auth = U.getAuth(n.app);
    n.db = F.initializeFirestore(n.app, {});
    if (EMU) { U.connectAuthEmulator(n.auth, 'http://127.0.0.1:9099', { disableWarnings: true }); F.connectFirestoreEmulator(n.db, '127.0.0.1', 8080); }
    return n;
  }
  kind = 'firebase';
  G(g) { return this.F.doc(this.db, 'games', g); }

  // Đăng nhập ẩn danh, rồi kiểm tra máy này đã có "chìa khóa giảng viên" (đã nhập đúng PIN) chưa.
  async signInHost() {
    await this.auth.authStateReady();
    if (!this.auth.currentUser) await this.U.signInAnonymously(this.auth);
    this.uid = this.auth.currentUser.uid;
    try { const s = await this.F.getDoc(this.F.doc(this.db, 'hostKeys', this.uid)); return s.exists(); } catch (e) { return false; }
  }
  // Nhập PIN: luật trên máy chủ chỉ cho tạo chìa khóa khi PIN đúng.
  async unlock(pin) { await this.F.setDoc(this.F.doc(this.db, 'hostKeys', this.uid), { pin: String(pin) }); }

  // Ghi trạng thái ván. Dùng "update" để mỗi trường (vd bảng điểm results) được thay NGUYÊN KHỐI:
  // ghi kiểu "trộn" (merge) bắt thư viện xử lý từng ô nhỏ trong bảng 377 người, làm màn hình lớn khựng hàng chục giây.
  setGame(g, data, merge = true) {
    const F = this.F, d = { ...data, rev: F.increment(1) };
    if (d.qStart === 'SERVER') d.qStart = F.serverTimestamp();
    if (d.starts) { for (const k in d.starts) { d['starts.' + k] = d.starts[k] === 'SERVER' ? F.serverTimestamp() : d.starts[k]; } delete d.starts; }
    if (!merge) { d.rev = Date.now(); for (const k in d) if (k.startsWith('starts.')) delete d[k]; return F.setDoc(this.G(g), { ...d, starts: {} }); }
    return F.updateDoc(this.G(g), d);
  }
  onGameHost(g, cb) {
    return this.F.onSnapshot(this.G(g), { includeMetadataChanges: true }, s => { cnt('gameSnap'); cb(s.exists() ? norm(s.data({ serverTimestamps: 'estimate' })) : null, s.metadata.hasPendingWrites); });
  }
  // Danh sách sinh viên báo danh (chỉ nghe bạn MỚI vào; số thứ tự ghi ở chỗ khác để không phải nghe lại chính mình)
  onPlayers(g, cb) {
    return this.F.onSnapshot(this.F.collection(this.db, 'games', g, 'players'), s => {
      cnt('playerSnap'); cnt('playerChanges', s.docChanges().length); cnt('playerSize', 0); DBG.playerSizeNow = s.size;
      cb(s.docChanges().filter(c => c.type === 'added').map(c => { const d = c.doc.data({ serverTimestamps: 'estimate' }); return { uid: c.doc.id, t: d.t?.toMillis?.() ?? Date.now() }; }));
    });
  }
  // Số đã cấp (đọc 1 lần khi mở/tải lại màn hình lớn)
  async getNums(g) { const s = await this.F.getDocs(this.F.collection(this.db, 'games', g, 'nums')); const m = {}; s.forEach(d => m[d.id] = d.data().n); return m; }
  // Cấp số: ghi gộp nhiều bạn trong 1 lần (tối đa 400/lần)
  async assign(g, pairs) {
    const F = this.F;
    for (let i = 0; i < pairs.length; i += 400) {
      const b = F.writeBatch(this.db);
      for (const [uid, n] of pairs.slice(i, i + 400)) b.set(F.doc(this.db, 'games', g, 'nums', uid), { n });
      await b.commit();
    }
  }
  // Đáp án: mỗi câu nghe riêng (tối đa ~377 tài liệu/lần nghe, không phình theo số câu)
  onAnswersQ(g, q, cb) {
    const F = this.F;
    return F.onSnapshot(F.query(F.collection(this.db, 'games', g, 'answers'), F.where('q', '==', q)), s => (cnt('ansSnap'), cnt('ansChanges', s.docChanges().length), cb(s.docChanges().filter(c => c.type === 'added').map(c => ans(c.doc)))));
  }
  async getAllAnswers(g) { const s = await this.F.getDocs(this.F.collection(this.db, 'games', g, 'answers')); const l = []; s.forEach(d => l.push(ans(d))); return l; }
}
function ans(doc) {
  const d = doc.data({ serverTimestamps: 'estimate' });
  return { uid: doc.id.slice(String(d.q).length + 1), q: d.q, a: Array.isArray(d.a) ? d.a : [d.a], t: d.t.toMillis() };
}
function norm(d) {
  if (d && d.qStart && d.qStart.toMillis) d.qStartMs = d.qStart.toMillis();
  if (d && d.starts) { d.startsMs = {}; for (const k in d.starts) if (d.starts[k]?.toMillis) d.startsMs[k] = d.starts[k].toMillis(); }
  return d;
}

/* ======================= CHẾ ĐỘ THỬ (1 máy) ======================= */
class DemoHost {
  kind = 'demo';
  constructor() { this.bc = new BroadcastChannel('gdct-demo'); this.subs = []; this.bc.onmessage = e => this.subs.forEach(f => f(e.data)); this.rev = 0; this.nums = {}; }
  on(f) { this.subs.push(f); return () => { this.subs = this.subs.filter(x => x !== f); }; }
  send(m) { this.bc.postMessage(m); }
  async signInHost() { return true; }
  async unlock() {}
  setGame(g, data, merge = true) {
    this.game = merge ? { ...(this.game || {}), ...data } : { ...data };
    this.game.rev = ++this.rev;
    if (data.qStart === 'SERVER') { this.game.qStart = Date.now(); this.game.qStartMs = this.game.qStart; }
    if (data.starts) { this.game.starts = { ...(this.game.startsMs || {}) }; for (const k in data.starts) this.game.starts[k] = data.starts[k] === 'SERVER' ? Date.now() : data.starts[k]; this.game.startsMs = this.game.starts; }
    this.send({ k: 'game', g, d: this.game }); this._hostGame && this._hostGame(this.game, false); return Promise.resolve();
  }
  onGameHost(g, cb) { this._hostGame = cb; this.on(m => { if (m.g === g && m.k === 'hello' && this.game) this.send({ k: 'game', g, d: this.game }); }); return () => {}; }
  onPlayers(g, cb) {
    this._players = cb;
    return this.on(m => {
      if (m.g !== g || m.k !== 'join') return;
      if (this.nums[m.uid]) this.send({ k: 'num', g, uid: m.uid, n: this.nums[m.uid] });
      else cb([{ uid: m.uid, t: m.t }]);
    });
  }
  async assign(g, pairs) { for (const [uid, n] of pairs) { this.nums[uid] = n; this.send({ k: 'num', g, uid, n }); } }
  async getNums() { return {}; }
  async getAllAnswers() { return []; }
  onAnswersQ(g, q, cb) { const f = m => m.g === g && m.k === 'ans' && m.q === q && cb([{ uid: m.uid, q: m.q, a: [m.a], t: m.t }]); if (q === 0) this._answers = cb; return this.on(f); }
  // máy ảo (chỉ có ở chế độ thử): đi thẳng vào bộ xử lý của host
  botJoin(list) { this._players && this._players(list); }
  botAnswer(list) { this._answers && this._answers(list); }
}
