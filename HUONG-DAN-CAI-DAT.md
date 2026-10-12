# Trò chơi "Ôn bài cũ" - quét QR là chơi

Sinh viên quét mã QR (camera hoặc Zalo), không cần tài khoản, được cấp số 001, 002... kèm linh vật. Màn hình hội trường hiện bảng vàng nhảy hạng trực tiếp và "Mảnh ghép bí ẩn" (chân dung V. I. Lênin + khung chữ Chủ nghĩa duy vật biện chứng).

| File | Dùng để |
|---|---|
| `host.html` | Màn hình lớn (laptop nối máy chiếu) |
| `index.html` | Trang sinh viên mở trên điện thoại (mã QR trỏ vào đây) |
| `cauhoi.js` | Bộ 6 câu hỏi |
| `config.js` | Cấu hình Firebase (dán vào đây) |
| `firestore.rules` | Luật bảo vệ dữ liệu, dán vào Firebase Console |
| `hinh-ghep.svg` | Bức tranh mảnh ghép |
| `kiem-thu/sinh-vien-ao.mjs` | Kịch bản kiểm thử tải 377 sinh viên ảo |

## Chạy thử ngay trên 1 máy (chưa cần Firebase)
Khi `config.js` còn trống, trò chơi tự chạy ở **chế độ thử**:
1. Mở `host.html?demo=1` (cần mở qua một máy chủ web, ví dụ chạy `python3 -m http.server` trong thư mục `tro-choi`).
2. Bấm **+377** để thêm 377 máy ảo, hoặc mở thêm vài tab `index.html?g=<mã phòng>&demo=1` để đóng vai sinh viên.
3. Bấm **Bắt đầu** (hoặc phím Space), chơi hết 6 câu.

## Cài Firebase để chơi thật (khoảng 5 phút, làm 1 lần)
1. Vào https://console.firebase.google.com, bấm **Create a project** (Tạo dự án), đặt tên ví dụ `on-bai-gdct`, tắt Google Analytics rồi bấm Create.
2. Menu trái: **Build > Firestore Database > Create database**. Chọn vị trí **asia-southeast1 (Singapore)** cho nhanh, chế độ **production mode**.
3. Ở thẻ **Rules** của Firestore: xoá hết, dán toàn bộ nội dung file `firestore.rules`, **thay `EMAIL_GIANG_VIEN` bằng Gmail của thầy/cô**, rồi bấm **Publish**.
4. Menu trái: **Build > Authentication > Get started > Sign-in method**:
   - Bật **Anonymous** (cho sinh viên, không cần tài khoản).
   - Bật **Google** (cho giảng viên đăng nhập màn hình lớn).
5. **Authentication > Settings > Authorized domains**: thêm tên miền nơi đặt trang (ví dụ `ten-cua-ban.github.io`).
6. Bánh răng ⚙ **Project settings > General > Your apps**, bấm biểu tượng **Web `</>`**, đặt tên `tro-choi`, bấm Register. Sao chép 4 dòng `apiKey`, `authDomain`, `projectId`, `appId` dán vào `config.js` (hoặc gửi cho Claude dán giúp).
   Đây là mã định danh công khai của dự án, không phải mật khẩu. Dữ liệu được bảo vệ bằng luật ở bước 3.

## Khi đứng lớp
1. Laptop nối máy chiếu, mở `host.html`, đăng nhập Google, bấm F11 để toàn màn hình.
2. Cho sinh viên quét QR **ngay khi ổn định chỗ ngồi**, nhắc dùng **4G/5G** (wifi hội trường dễ quá tải khi 377 máy cùng vào).
3. Khi số người đủ, bấm **Bắt đầu**. Mỗi câu tự chuyển sang đáp án khi hết giờ hoặc khi cả lớp đã trả lời. Bấm **Câu tiếp** (hoặc Space) để đi tiếp.
4. Hết 6 câu, bấm **Tổng kết**: bức tranh lật toàn bộ và bục vinh danh Top 3 hiện lên.
5. Ván sau: bấm **Ván mới** để có mã phòng và mã QR mới.

Lỡ tải lại trang màn hình lớn giữa chừng: điểm và số thứ tự không mất, vì đều được tính lại từ dữ liệu trên Firebase.

## Luật chơi
- Đúng được 500 điểm, cộng thêm tối đa 500 điểm theo tốc độ. Từ câu đúng thứ 3 liên tiếp được thưởng thêm 100 (🔥).
- Câu chọn nhiều đáp án phải chọn đủ và đúng hết mới được tính.
- **Mảnh ghép:** câu nào từ 60% cả lớp trả lời đúng thì lật 2 mảnh, từ 30% thì lật 1 mảnh. Tranh có 12 mảnh.
- Mỗi máy chỉ nộp được 1 lần mỗi câu và chỉ trong thời gian cho phép. Luật bảo vệ trên máy chủ chặn mọi lần nộp lại hay nộp muộn.

## Đổi câu hỏi
Sửa `cauhoi.js`: chữ (`text`), các lựa chọn (`options`), số giây (`limit`). Đáp án đúng `k` được mã hóa nhẹ: `k = encodeKey([vị trí đáp án đúng, đếm từ 0])`. Ví dụ, đáp án đúng là B và D thì `encodeKey([1,3])`. Cách đơn giản nhất là nhờ Claude sửa giúp.

## Sức chịu tải (đã kiểm thử)
Dùng Cloud Firestore gói miễn phí (Spark): không giới hạn số máy kết nối cùng lúc, hạn mức 50.000 lượt đọc/ngày. Một ván 377 sinh viên tốn ước tính 10.000-15.000 lượt.
Thiết kế chống nghẽn: mỗi sinh viên chỉ ghi vào ô của riêng mình. Máy giảng viên cấp số, chấm điểm và gửi kết quả cả lớp trong 1 lần ghi duy nhất mỗi câu.
Đã chạy 377 sinh viên ảo với Firebase Emulator: cả 377 vào lớp và nhận số (chậm nhất 1,9 giây), 0 lỗi nộp đáp án, nộp lần 2 bị chặn đúng. Chi tiết số đo độ trễ nằm trong lịch sử trò chuyện với Claude.
