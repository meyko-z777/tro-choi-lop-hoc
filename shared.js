// Dùng chung cho màn hình lớn (host.html) và điện thoại (index.html)
export const ANIMALS = ['🐯','🦊','🐼','🐨','🐸','🦁','🐵','🐰','🐻','🐧','🦄','🐙','🐳','🦉','🐝','🐞','🦋','🐢','🦖','🐹','🐶','🐱','🐮','🐷','🐔','🦜','🦩','🐬','🦔','🐲'];
export const COLORS = ['#E5251B','#F28C28','#D9A400','#2EAD5B','#14A3A3','#2F7BEA','#7A4FD8','#E0489A','#8B5A2B','#5A6B7D','#0E6E5C','#B8325E','#1B3F8B'];
// 30 linh vật x 13 màu = 390 tổ hợp khác nhau, đủ cho 377 sinh viên
export function avatar(n) { const i = Math.max(0, n - 1); return { e: ANIMALS[i % 30], c: COLORS[Math.floor(i / 30) % 13] }; }
export const pad = n => String(n).padStart(3, '0');

// Ô CHỮ BÍ ẨN: cả lớp cùng lật từng chữ cái. Muốn đổi thì sửa dòng dưới (vd 'CAO ĐẲNG TÂY ĐÔ').
export const WORD = 'GIÁO DỤC CHÍNH TRỊ';
export const LETTERS_IN_WORD = [...WORD].filter(c => c !== ' ').length;
export const TOTAL_TILES = LETTERS_IN_WORD;
export const GRACE_MS = 2500;           // chấp nhận trễ mạng sau khi hết giờ (điện thoại mạng yếu nhận câu hỏi chậm vài giây)
// Mỗi câu lật 2 chữ; từ 60% cả lớp trả lời đúng thì lật 3 chữ
export function tilesFor(rate) { return rate >= 0.6 ? 3 : 2; }

// Điểm: ai trả lời cũng có điểm. Đúng: 500 + tối đa 500 theo tốc độ (+100 từ câu đúng thứ 3 liên tiếp).
// Sai: vẫn được 100 điểm tham gia. Không trả lời: 0.
export const PARTICIPATION = 100;
export function points(correct, elapsedMs, limitS, streak) {
  if (!correct) return PARTICIPATION;
  const k = Math.min(1, Math.max(0, elapsedMs / (limitS * 1000)));
  return Math.round(500 + 500 * (1 - k)) + (streak >= 3 ? 100 : 0);
}
export const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const OPT_COLORS = ['#E5251B', '#2F7BEA', '#D9A400', '#2EAD5B', '#7A4FD8', '#E0489A'];
