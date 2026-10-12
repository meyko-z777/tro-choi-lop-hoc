// BỘ CÂU HỎI ÔN BÀI CŨ (Buổi 1 - Bài 1 phần 1), lấy đúng 4 ý ở slide "Buổi trước chúng ta đã học gì?"
// Câu hỏi DỄ, ai cũng làm được: cuộc đua tốc độ. type: 'mc' = chọn 1 đáp án, 'tf' = Đúng/Sai ('multi' = chọn nhiều, hạn chế dùng)
// limit: số giây cho mỗi câu
// k: đáp án đúng đã được mã hóa nhẹ (để sinh viên khó "soi" trong mã nguồn).
//    Muốn đổi câu hỏi: sửa text/options, rồi tạo mã k mới bằng encodeKey([chỉ số đáp án đúng]) (đếm từ 0).
export const TITLE = 'Buổi trước chúng ta đã học gì?';
export const QUESTIONS = [
  { type: 'tf', limit: 15,
    text: 'Chủ nghĩa Mác - Lênin gồm 3 bộ phận: Triết học, Kinh tế chính trị, Chủ nghĩa xã hội khoa học.',
    options: ['ĐÚNG', 'SAI'], k: 'WzBd' },
  { type: 'mc', limit: 15,
    text: 'Bộ phận nào KHÔNG thuộc chủ nghĩa Mác - Lênin?',
    options: ['Triết học', 'Kinh tế chính trị', 'Chủ nghĩa xã hội khoa học', 'Tâm lý học'], k: 'WzNd' },
  { type: 'mc', limit: 15,
    text: 'Theo chủ nghĩa duy vật, cái gì có trước?',
    options: ['Vật chất', 'Ý thức'], k: 'WzBd' },
  { type: 'tf', limit: 15,
    text: 'Vật chất quyết định ý thức.',
    options: ['ĐÚNG', 'SAI'], k: 'WzBd' },
  { type: 'mc', limit: 15,
    text: 'Phép biện chứng duy vật có mấy nguyên lý?',
    options: ['1', '2', '3', '4'], k: 'WzFd' },
  { type: 'mc', limit: 15,
    text: 'Quan hệ sản xuất phải ______ với trình độ của lực lượng sản xuất.',
    options: ['đối lập', 'phù hợp', 'tách rời', 'đi trước'], k: 'WzFd' },
];
export const decodeKey = k => JSON.parse(atob(k.replace(/-/g, '+').replace(/_/g, '/')));
export const encodeKey = arr => btoa(JSON.stringify(arr)).replace(/=+$/, '');
