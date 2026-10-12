# Trò chơi "Ôn bài cũ" - quét QR là chơi (bản 2: lì đòn cho lớp 377 người)

Sinh viên quét mã QR (camera hoặc Zalo), không cần tài khoản, được cấp số 001, 002... kèm linh vật. Màn hình hội trường hiện bảng vàng nhảy hạng trực tiếp và "Ô chữ bí ẩn" GIÁO DỤC CHÍNH TRỊ. Giảng viên điều khiển bằng **mã PIN** (không cần đăng nhập Google).

| File | Dùng để |
|---|---|
| `host.html` | Màn hình lớn (laptop nối máy chiếu) |
| `index.html` + `phone-net.js` | Trang sinh viên trên điện thoại (mã QR trỏ vào đây) |
| `net.js` | Kết nối của màn hình lớn |
| `cauhoi.js` | Bộ 6 câu hỏi |
| `config.js` | Cấu hình Firebase |
| `firestore.rules` | Luật bảo vệ dữ liệu (bản mẫu, mã PIN thật Claude gửi riêng) |
| `kiem-thu/tong-duyet.mjs` | Tổng duyệt: giả lập hàng trăm điện thoại đi đúng đường của điện thoại thật |

## Vì sao làm lại (bản 1 hỏng khi chơi thật)
Ba ván thử ngày 12/10: mọi máy đều vào lớp và có số, nhưng chỉ đúng 1 máy gửi được đáp án lên máy chủ. Bản 1 chỉ được thử trên máy giả lập, chưa từng thử trên máy chủ thật với nhiều máy. Bản 2 sửa tận gốc:
- **Điện thoại gửi đáp án bằng HTTPS thường** (chạy được trong trình duyệt của Zalo/Facebook), có **biên nhận "✓ Máy chủ đã nhận"**, lỗi mạng thì tự gửi lại.
- **Nhận câu hỏi qua kênh trực tiếp**; kênh kẹt thì tự chuyển sang **"dự phòng"** (hỏi máy chủ 2,5 giây/lần). Góc trên điện thoại có chấm xanh "trực tiếp" hoặc vàng "dự phòng".
- **Màn hình lớn đăng nhập bằng PIN**, nên Claude tự chạy được tổng duyệt trên máy chủ thật.
- **Sinh viên không cần tạo tài khoản:** Firebase chỉ cho tạo ~150 tài khoản ẩn danh/giờ trên cùng một mạng (phát hiện khi tổng duyệt trên máy chủ thật 12/10). Mỗi điện thoại tự sinh một mã bí mật; bảng điểm công khai chỉ ghi theo số thứ tự.
- **Thẻ màu dự phòng:** mạng sập hẳn thì sinh viên bấm "Dùng THẺ MÀU" trên điện thoại, giơ màn hình màu A/B/C/D hoặc ĐÚNG/SAI lên.

## Cập nhật luật bảo vệ (làm 1 lần, khoảng 2 phút)
1. Vào https://console.firebase.google.com, chọn dự án `tro-choi-on-bai-gdct-buoi-1`.
2. Gõ `Firestore` vào ô **🔍 Search for products** ở đầu menu trái, mở **Firestore Database**.
3. Mở thẻ **Rules**, bấm vào ô soạn luật, **xóa hết** (Ctrl+A rồi Delete).
4. Dán toàn bộ đoạn luật Claude gửi trong cuộc trò chuyện (đã có sẵn mã PIN được mã hóa), bấm **Publish**.
5. Kiểm tra **Authentication > Sign-in method**: mục **Anonymous** phải đang **Enabled** (chỉ màn hình lớn dùng). Mục Google không cần nữa.

## Khi đứng lớp
1. Laptop nối máy chiếu, mở https://meyko-z777.github.io/tro-choi-lop-hoc/host.html, nhập **mã PIN** (máy này chỉ cần nhập 1 lần), bấm F11.
2. Cho sinh viên quét QR **ngay khi ổn định chỗ ngồi**, nhắc dùng **4G/5G** và **không tải lại trang**.
3. Bấm **Bắt đầu** lúc nào cũng được. Mỗi câu tự công bố đáp án khi hết giờ hoặc khi cả lớp đã trả lời. Bấm **Câu tiếp** (hoặc phím Space).
4. Hết 6 câu, bấm **Tổng kết**: ô chữ lật toàn bộ và bục vinh danh Top 3 hiện lên.
5. Ván sau / lớp khác: bấm **Ván mới** để có mã phòng và mã QR mới.

Lỡ tải lại màn hình lớn giữa chừng: điểm và số thứ tự không mất (tính lại từ dữ liệu trên máy chủ).

## Luật chơi
- **Cuộc đua tốc độ, câu dễ:** đúng 500-1000 điểm (càng nhanh càng cao), từ câu đúng thứ 3 liên tiếp +100 (🔥). **Sai vẫn được 100 điểm tham gia.**
- **Ô chữ bí ẩn:** mỗi câu lật 2 chữ, câu nào từ 60% cả lớp đúng thì lật 3 chữ. Đổi ô chữ: dòng `WORD` trong `shared.js`.
- Ai vào muộn vẫn chơi các câu còn lại. Mỗi máy nộp 1 lần mỗi câu; giờ nộp do máy chủ đóng dấu, nộp quá giờ không tính.

## Đổi câu hỏi
Sửa `cauhoi.js` (`text`, `options`, `limit`), đáp án đúng mã hóa trong `k`. Cách đơn giản nhất: nhắn Claude "đổi câu hỏi trò chơi cho buổi X".

## Sức chịu tải (gói miễn phí Spark: 50.000 lượt đọc, 20.000 lượt ghi mỗi ngày)
Ước tính 1 ván 377 người: khoảng 20.000 lượt đọc, 3.500 lượt ghi. Đủ cho 1 ván chính thức + 1 lần thử trong cùng ngày; tránh thử nhiều ván 377 người trong ngày có tiết.
Đã tổng duyệt trên máy giả lập (12/10): 371 máy ảo + 6 trình duyệt điện thoại (có máy bị chặn kênh trực tiếp, máy không cho lưu dữ liệu, máy vào muộn): 371/371 máy ảo được xác nhận đủ 6/6 câu, 0 bị từ chối, màn hình lớn đếm 377/377, cả 6 điện thoại hiện đúng kết quả và hạng.
