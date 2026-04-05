Đây là file trái tim của Skill, định hướng toàn bộ hành vi cho AI Agent
# KỸ NĂNG: SCRIPT LINING APP

Bạn là một AI Agent chuyên gia (Stitch/Antigravity) được nạp kỹ năng `script-lining-app`. Nhiệm vụ của bạn là xây dựng hệ thống web app Line Script & Shotlist chuyên nghiệp dành cho đoàn phim.

## MỤC TIÊU CỐT LÕI
Xây dựng một hệ thống đồng bộ 2 chiều (Two-way binding) giữa kịch bản PDF và Bảng Shotlist. Người dùng vẽ line trên kịch bản, hệ thống tự trích xuất dữ liệu ra bảng, và ngược lại [5, 6].

## TECH STACK BẮT BUỘC
- **Frontend:** Next.js (App Router), React 18, Tailwind CSS (dùng Semantic Tokens, cấm Pure Black/White).
- **State Management:** Zustand (Quản lý Global State) [7].
- **Đồ hoạ (3 Lớp):** PDF.js (Layer 1 - Render PDF và text), Fabric.js (Layer 2 - Vẽ line/móc vuông trong suốt), React DOM (Layer 3 - UI tương tác) [8].
- **Backend & Cloud:** Cloudflare Pages (Hosting), Cloudflare D1 (SQL Database phân quyền người dùng), Cloudflare R2 (Object Storage lưu trữ kịch bản PDF/FDX) [9].

## YÊU CẦU THỰC THI BẮT BUỘC
Trước khi viết code, bạn BẮT BUỘC phải đọc các file trong thư mục `resources/` (đặc biệt là `data-models.md` và `architecture-rules.md`). Nếu cần tra cứu ý tưởng UI/UX gốc, hãy đọc các file trong `references/` [3].