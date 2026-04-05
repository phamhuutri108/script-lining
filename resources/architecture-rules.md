Chứa các quy tắc bất di bất dịch về logic thuật toán
.
# QUY TẮC KIẾN TRÚC & LOGIC

## 1. Logic Vẽ Line & Móc Vuông (Canvas)
- **Base Logic:** Đường line-straight chứa nội dung sẽ ghi hình. Đường line-zigzag chứa phần nội dung không ghi hình [5].
- **Thao tác Split:** Click vào line sẽ tạo móc vuông, chia thành 2 đoạn (đoạn trên straight, đoạn dưới tự động thành zigzag) [14].
- **Thao tác Merge:** Xóa một móc vuông ở giữa, nếu 2 đoạn liền kề trở nên giống nhau (2 đoạn zigzag hoặc 2 đoạn straight), chúng tự động gộp thành 1 và mất móc nối [15].

## 2. Quy tắc Vàng Auto Detect (Data Parser)
- Thuật toán trích xuất chỉ được lấy các dòng text lọt vào khoảng tọa độ Y của `segment` có `type: 'straight'` [13]. 
- TUYỆT ĐỐI bỏ qua mọi text nằm ở đoạn `type: 'zigzag'` [13].
- **Bóc tách Scene:** Cắt regex cấu trúc "Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT..." [13].

## 3. Kiến trúc Đồ họa (3-Tier Layer)
- Đặt `PdfRenderer` ở dưới cùng [8].
- Đặt `FabricTramlineCanvas` đè lên trên (trong suốt) [8]. Fabric.js không được render trực tiếp mà phải bọc qua Custom Hook.