// BỘ CÂU HỎI ÔN BÀI CŨ (Buổi 1 - Bài 1 phần 1), lấy đúng 4 ý ở slide "Buổi trước chúng ta đã học gì?"
// type: 'mc' = chọn 1 đáp án, 'tf' = Đúng/Sai, 'multi' = chọn tất cả đáp án đúng
// limit: số giây cho mỗi câu
// k: đáp án đúng đã được mã hóa nhẹ (để sinh viên khó "soi" trong mã nguồn).
//    Muốn đổi câu hỏi: sửa text/options, rồi tạo mã k mới bằng encodeKey([chỉ số đáp án đúng]) (đếm từ 0).
export const TITLE = 'Buổi trước chúng ta đã học gì?';
export const QUESTIONS = [
  { type: 'multi', limit: 25,
    text: 'Chủ nghĩa Mác - Lênin gồm những bộ phận nào? (chọn TẤT CẢ đáp án đúng)',
    options: ['Triết học', 'Kinh tế chính trị', 'Chủ nghĩa xã hội khoa học', 'Tâm lý học'],
    k: 'WzAsMSwyXQ' },
  { type: 'tf', limit: 15,
    text: 'Ý thức có trước, vật chất có sau.',
    options: ['ĐÚNG', 'SAI'],
    k: 'WzFd' },
  { type: 'mc', limit: 20,
    text: 'Theo chủ nghĩa duy vật biện chứng, cái nào quyết định cái nào?',
    options: ['Vật chất quyết định ý thức', 'Ý thức quyết định vật chất', 'Hai cái không liên quan nhau', 'Cái nào mạnh hơn thì quyết định'],
    k: 'WzBd' },
  { type: 'mc', limit: 15,
    text: 'Phép biện chứng duy vật có mấy nguyên lý?',
    options: ['1 nguyên lý', '2 nguyên lý', '3 nguyên lý', '4 nguyên lý'],
    k: 'WzFd' },
  { type: 'multi', limit: 25,
    text: 'Đâu là các nguyên lý của phép biện chứng duy vật? (chọn TẤT CẢ đáp án đúng)',
    options: ['Mối liên hệ phổ biến', 'Sự đứng im tuyệt đối', 'Sự phát triển', 'Sự ngẫu nhiên'],
    k: 'WzAsMl0' },
  { type: 'mc', limit: 20,
    text: 'Quan hệ sản xuất phải ______ với trình độ của lực lượng sản xuất.',
    options: ['đối lập', 'phù hợp', 'tách rời', 'đi trước'],
    k: 'WzFd' },
];
export const decodeKey = k => JSON.parse(atob(k.replace(/-/g, '+').replace(/_/g, '/')));
export const encodeKey = arr => btoa(JSON.stringify(arr)).replace(/=+$/, '');
