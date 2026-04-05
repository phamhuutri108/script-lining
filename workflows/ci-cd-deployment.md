# WORKFLOW TRIỂN KHAI & HẠ TẦNG CLOUD

1. **Local Development:** Code React/Next.js phải luôn vượt qua `npm run build` (Type-safe).
2. **MCP Stitch Gen UI:** Chạy tool tạo component giao diện theo chuẩn shadcn-ui.
3. **Database (Cloudflare D1):** 
   - Quản lý cấu trúc người dùng: Super Admin, Project Owner, User [9].
   - Project Owner có quyền set Role (View/Edit) cho từng User trên từng Tab [9].
4. **Storage (Cloudflare R2):** Xử lý luồng tải file kịch bản lên bucket, trả về PDF link để layer PDF.js đọc.
5. **Real-time Sync:** Cho phép nhiều co-worker làm việc song song (người kẻ line, người edit shotlist) [9].