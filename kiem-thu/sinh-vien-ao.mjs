// Kiểm thử tải: N sinh viên ảo, mỗi máy một kết nối Firebase riêng, chạy với Firebase Emulator.
// Cách chạy: node sinh-vien-ao.mjs <số máy> <mã phòng> <nhãn>
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
const N = +process.argv[2] || 50, G = process.argv[3] || '7777', TAG = process.argv[4] || 'A';
const KEYS = [[0, 1, 2], [1], [0], [1], [0, 2], [1]], LIMIT = [25, 15, 20, 15, 25, 20];
const stat = { joined: 0, numbered: 0, numLat: [], ansOk: 0, ansErr: 0, ansLat: [], resLat: [], lateRejected: 0, errors: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function student(i) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-gdct', appId: 'x' }, TAG + i);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = initializeFirestore(app, {}); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  await sleep(Math.random() * 20000);                               // 377 bạn quét QR rải trong ~20 giây
  const uid = (await signInAnonymously(auth)).user.uid;
  const t0 = Date.now();
  await setDoc(doc(db, 'games', G, 'players', uid), { t: serverTimestamp() }); stat.joined++;
  const un = onSnapshot(doc(db, 'games', G, 'pub', 'roster'), s => { const m = s.data()?.m || {}; if (m[uid]) { stat.numbered++; stat.numLat.push(Date.now() - t0); un(); } });
  let lastQ = -1, sentAt = 0, cheatTried = false;
  onSnapshot(doc(db, 'games', G), async s => {
    const d = s.data(); if (!d) return;
    if (d.state === 'question' && d.q !== lastQ) {
      lastQ = d.q; const q = d.q;
      if (Math.random() < 0.05) return;                             // 5% không trả lời
      await sleep(1000 + Math.random() * (LIMIT[q] * 1000 - 3500));
      const a = Math.random() < 0.7 ? KEYS[q] : [3];
      sentAt = Date.now();
      try { await setDoc(doc(db, 'games', G, 'answers', q + '_' + uid), { q, a, t: serverTimestamp() }); stat.ansOk++; stat.ansLat.push(Date.now() - sentAt); }
      catch (e) { stat.ansErr++; stat.errors.push(e.code); }
      if (i === 0 && !cheatTried) {                                 // thử gian lận: nộp lại lần 2 phải bị chặn
        cheatTried = true; try { await setDoc(doc(db, 'games', G, 'answers', q + '_' + uid), { q, a: [0], t: serverTimestamp() }); stat.errors.push('CHEAT-ACCEPTED'); } catch (e) { stat.lateRejected++; }
      }
    }
    if (d.state === 'reveal' && d.results?.[uid] && d.revealAt) { stat.resLat.push(Date.now() - d.revealAt); }
  });
}
const pct = (a, p) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
await Promise.all(Array.from({ length: N }, (_, i) => student(i).catch(e => stat.errors.push(String(e.code || e.message)))));
const report = () => console.log(JSON.stringify({ TAG, N, joined: stat.joined, numbered: stat.numbered,
  numLat_p50: pct(stat.numLat, .5), numLat_p95: pct(stat.numLat, .95), numLat_max: pct(stat.numLat, 1),
  ansOk: stat.ansOk, ansErr: stat.ansErr, ansLat_p50: pct(stat.ansLat, .5), ansLat_p95: pct(stat.ansLat, .95),
  resLat_p50: pct(stat.resLat, .5), resLat_p95: pct(stat.resLat, .95), resultsSeen: stat.resLat.length, cheatBlocked: stat.lateRejected, errors: [...new Set(stat.errors)].slice(0, 5) }));
setInterval(report, 30000); process.on('SIGTERM', () => { report(); process.exit(0); });
