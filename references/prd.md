TÀI LIỆU 1: PRD (Product Requirements Document) - Logic Cốt Lõi Lớp Vẽ Line & Đồng Bộ
1. Luồng Logic Cốt Lõi Tính Năng Vẽ Line (Tramline)
Nguyên tắc cơ bản: Đường thẳng (line-straight) đại diện cho nội dung shot sẽ được ghi hình, trong khi đường zíc-zắc (line-zigzag) đại diện cho phần nội dung không được ghi hình
. Một đường line thường chứa cả hai loại này
.
Draw Mode (Khởi tạo): Người dùng kéo chuột dọc trang kịch bản để tạo một đường thẳng đứng hoàn hảo (snap to straight vertical line)
. Thao tác này tạo ra 2 móc vuông (nodes) ở điểm bắt đầu và kết thúc, kèm theo một Box Label nằm trên móc vuông đầu tiên chứa thông tin Tên Shot (VD: Scene#/Shot#) và Màu sắc
.
Split Mode (Chia cắt): Công cụ này dùng để định nghĩa phần nội dung không ghi hình. Khi click vào một đường line, một móc vuông mới được tạo ra chia đường line cũ thành 2 đoạn: đoạn trên giữ nguyên là line-straight, đoạn dưới tự động biến thành line-zigzag
. Nếu tiếp tục click vào đoạn dưới, nó chia thành 3 đoạn: straight - zigzag - straight
.
Merge & Delete Logic (Gộp/Xóa): Khi một móc vuông bị xóa, hệ thống tự động nối và nhận diện lại đường line dựa trên móc vuông kết thúc
. Nếu 2 đoạn liền kề trở nên giống nhau (ví dụ 2 đường zigzag hoặc 2 đường straight liền kề), chúng sẽ tự động merge lại thành 1 đường duy nhất và xóa bỏ móc vuông ở giữa
.
Active & Movement (Tương tác):
Móc vuông dùng để kéo dài hoặc thu ngắn đoạn line dọc tương ứng
.
Toàn bộ thân đường line có thể kéo di chuyển tự do theo chiều ngang, nhưng hệ thống chống chèn ép (không được chiếm chỗ đường line khác)
.
2. Đồng Bộ Dữ Liệu 2 Chiều (Two-way Binding)
Cấu trúc dữ liệu: Mỗi đường line không phải nét vẽ vô tri mà là một Object JSON với định dạng { id, pageNumber, startY, endY, shotName, shotSize, color }
.
Cơ chế đồng bộ: Hệ thống quét qua mảng (Array) chứa các Object Line, gom nhóm theo trang và render ra UI Bảng Shotlist
. Bất kỳ thay đổi nào từ bảng Shotlist (VD: đổi tên shot từ "1A" thành "1B") sẽ ngay lập tức được cập nhật lên Box label của đường line trên PDF, và ngược lại
. Xóa một line trên kịch bản cũng sẽ xóa shot tương ứng trong Shotlist
.