TÀI LIỆU 2: UI/UX Component Tree
Dựa trên ui-reference-spec.md và triết lý kiến trúc của React 18 / Next.js (App Router), dưới đây là cấu trúc Component phân rã.
Ký hiệu:
(SC): Server Component - Tối ưu hóa fetch dữ liệu ban đầu, không chứa state.
(CC): Client Component - Chứa tương tác người dùng, state, DOM manipulation (như Fabric.js).
app/
├── layout.tsx (SC) - Root layout, theme provider
└── workspace/
    ├── page.tsx (SC) - Chứa layout tổng quát của ứng dụng
    └── WorkspaceContainer (CC) - Quản lý State chung (Zustand/Redux) và 3 Tab chính
        ├── TopNavigationTab (CC) - Chuyển đổi giữa [Breakdown | Line Script | Shotlist] [11]
        │
        ├── BreakdownMode (CC) - Lấy cảm hứng từ StudioBinder [11, 12]
        │   ├── SplitPanelLayout (CC) [12]
        │   ├── ScriptViewer (CC) - Hiển thị text/PDF tĩnh để bôi đen
        │   └── ElementsManagerSidebar (CC) - Quản lý màu tag (cast, props, v.v.) [13]
        │
        ├── LineScriptMode (CC) - Hybrid giữa Scriptation & Script Evolution [11]
        │   ├── LiningSidebar (CC) - Thanh công cụ chứa Draw, Split, Note, Color [13]
        │   ├── PdfRenderer (CC) - Base layer hiển thị file PDF (sử dụng PDF.js) [14]
        │   └── CanvasOverlay (CC) - Layer đồ họa trong suốt nằm đè lên trên [14]
        │       ├── FabricTramlineCanvas (CC) - Component lõi chứa Fabric.js [13]
        │       │   ├── StraightSegment (CC)
        │       │   ├── ZigzagSegment (CC)
        │       │   ├── BracketNode (CC) - Các móc vuông thao tác kéo thả [6]
        │       │   └── SlateHeaderLabel (CC) - Box label hiển thị Scene/Shot info [13]
        │       └── AnnotationLayer (CC) - Ghi chú tự do, shape, highlighter [15]
        │
        └── ShotlistMode (CC) - Chế độ bảng tổng hợp [11]
            ├── TableControls (CC) - Nút export, filter, sync
            └── ShotlistTableData (CC) - Bảng hiển thị dạng Google Sheets [16]
                ├── TableHeader (CC) - Frozen rows, header 2 tầng [16]
                └── ShotRow (CC) - Data row có Two-way binding với Fabric canvas [9, 17]