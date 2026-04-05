Task 5: Mở rộng Zustand Store

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 11 lines
      27    segments: ILineSegment[];
      28  }
      29  
      30 +// ─── Breakdown Data Model ──────────────────────────────────────────────────────                             
      31 +                                                                                                               
      32 +export interface IBreakdownElement {                                                                           
      33 +  id: string;                                                                                                  
      34 +  text: string;          // Đoạn text được bôi đen                                                             
      35 +  categoryId: string;    // 'cast' | 'props' | 'stunts' | ...                                                  
      36 +  color: string;         // Màu hex của category (highlight bg)                                                
      37 +  pageNumber: number;    // Trang PDF chứa text này                                                            
      38 +  addedAt: number;       // Date.now() để sort                                                                 
      39 +}                                                                                                              
      40 +                                                                                                               
      41  export interface IShotlistRow {
      42    tramlineId: string; // KHÓA NGOẠI - binding 2 chiều với Canvas
      43    rowNumber: number;

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 5 lines
      60    tramlines: ITramline[];
      61    shotlist: IShotlistRow[];
      62  
      63 +  // --- Breakdown State ---                                                                                   
      64 +  breakdownElements: IBreakdownElement[];                                                                      
      65 +  addBreakdownElement: (element: Omit<IBreakdownElement, 'id' | 'addedAt'>) => void;                           
      66 +  removeBreakdownElement: (id: string) => void;                                                                
      67 +                                                                                                               
      68    /**
      69     * PDF text data keyed by pageNumber (1-indexed).
      70     * Được feed bởi usePdfTextExtraction qua action setPdfTextForPage.

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 14 lines
      173        tramlines: [],
      174        shotlist: [],
      175        pdfTextByPage: {},
      176 +      breakdownElements: [],                                                                                  
      177  
      178 +      addBreakdownElement: (element) =>                                                                       
      179 +        set((state) => ({                                                                                     
      180 +          breakdownElements: [                                                                                
      181 +            ...state.breakdownElements,                                                                       
      182 +            { ...element, id: `bd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: Date.now(
          +) },                                                                                                          
      183 +          ],                                                                                                  
      184 +        })),                                                                                                  
      185 +                                                                                                              
      186 +      removeBreakdownElement: (id) =>                                                                         
      187 +        set((state) => ({                                                                                     
      188 +          breakdownElements: state.breakdownElements.filter((e) => e.id !== id),                              
      189 +        })),                                                                                                  
      190 +                                                                                                              
      191        // ── addTramline ────────────────────────────────────────────────────────
      192        // Thêm tramline + tự động tạo IShotlistRow + chạy auto-detect nếu có text
      193        addTramline: (tramline) =>

⏺ Task 6: useTextSelection hook + CategoryMenu

⏺ Bash(mkdir -p /Users/phamhuutri/Desktop/websites/app/script-lining/lib/hooks && mkdir -p
      /Users/phamhuutri/Desktop/websites/app/script-lining/components/breakdown)
  ⎿  Done

⏺ Write(lib/hooks/useTextSelection.ts)
  ⎿  Wrote 99 lines to lib/hooks/useTextSelection.ts
      1 /**
      2  * useTextSelection — Phase 6: Breakdown Mode
      3  * ─────────────────────────────────────────────────────────────────────────────
      4  * Lắng nghe sự kiện mouseup trong container ref để phát hiện khi user
      5  * bôi đen (select) text. Trả về text đã chọn và vị trí popup.
      6  *
      7  * Popup được hiện tại điểm cuối của selection (getBoundingClientRect).
      8  * Trả về null khi selection trống hoặc user click ra ngoài.
      9  */
     … +89 lines (ctrl+o to expand)

⏺ Bây giờ tạo constants file cho categories, rồi CategoryMenu:

⏺ Write(lib/breakdown-categories.ts)
  ⎿  Wrote 30 lines to lib/breakdown-categories.ts
       1 /**
       2  * Industry-standard breakdown categories cho film production.
       3  * Màu sắc theo yêu cầu Phase 6 + tham chiếu ui-reference-spec.md §1.3
       4  */
       5
       6 export interface BreakdownCategory {
       7   id: string;
       8   name: string;
       9   color: string;           // hex màu chữ/viền
      10   bgHighlight: string;     // rgba nền highlight trên PDF text
     … +20 lines (ctrl+o to expand)

⏺ Write(components/breakdown/CategoryMenu.tsx)
  ⎿  Wrote 212 lines to components/breakdown/CategoryMenu.tsx
       1 /**
       2  * CategoryMenu.tsx — Phase 6: Breakdown Mode
       3  * ─────────────────────────────────────────────────────────────────────────────
       4  * Popup context menu hiện ra khi user bôi đen text trên PDF.
       5  * Hiển thị 12 categories theo màu chuẩn industry.
       6  * Vị trí: fixed, tính theo viewport coordinates từ useTextSelection.
       7  *
       8  * Thiết kế: "The Editorial Minimalist" — nền trắng tinh, viền nhẹ,
       9  * mỗi category là một row có dot màu + tên.
      10  */
     … +202 lines (ctrl+o to expand)

⏺ Task 7: BreakdownPanel + BreakdownView

⏺ Write(components/breakdown/BreakdownPanel.tsx)
  ⎿  Wrote 372 lines to components/breakdown/BreakdownPanel.tsx
       1 /**                                     
       2  * BreakdownPanel.tsx — Phase 6: Breakdown Mode (Right Panel)
       3  * ─────────────────────────────────────────────────────────────────────────────
       4  * Hiển thị danh sách tất cả elements đã được tag, nhóm theo Category.
       5  * Mỗi category = 1 section với viền trái màu tương ứng.
       6  *
       7  * Layout tham chiếu: ui-reference-spec.md §1.2 (StudioBinder Breakdown Panel)                                         
       8  */
       9                                                                                                                        
      10 "use client";                                                                                                        
     … +362 lines (ctrl+o to expand)

⏺ Bây giờ tạo BreakdownView — split panel chính: 
                                                         
⏺ Write(components/breakdown/BreakdownView.tsx)      
  ⎿  Wrote 149 lines to components/breakdown/BreakdownView.tsx
       1 /**                                         
       2  * BreakdownView.tsx — Phase 6: Breakdown Mode (Full Tab Layout)
       3  * ─────────────────────────────────────────────────────────────────────────────                                       
       4  * Split panel layout:                              
       5  *   LEFT (55%): PDF hiển thị với text selection + highlight elements                                                  
       6  *   RIGHT (45%): BreakdownPanel — danh sách elements đã tag                                                         
       7  *                                                                                                                     
       8  * Khi user bôi đen text trong PDF:                                                                                  
       9  *   1. useTextSelection detect → CategoryMenu popup hiện                                                              
      10  *   2. User chọn category → addBreakdownElement vào store                                                           
     … +139 lines (ctrl+o to expand)

⏺ Giờ wire vào app/page.tsx — thay BREAKDOWN tab placeholder bằng BreakdownView:
                                                         
  Read 1 file (ctrl+o to expand)                     
                                                             
⏺ Update(app/page.tsx)                               
  ⎿  Added 1 line                                            
       7  import { type DrawMode } from "@/lib/hooks/useFabricCanvas";                                                          
       8  import { useScriptStore, type ITramline, type IShotlistRow } from "@/lib/store/useScriptStore";
       9  import { generateStressData } from "@/lib/utils/stress-test";                                                         
      10 +import { BreakdownView } from "@/components/breakdown/BreakdownView";                                               
      11                                                                                                                        
      12  // ─── Tab type ─────────────────────────────────────────────────────────────────                                     
      13                                                                                                                        
                                                                                                                                
⏺ Bây giờ tìm và thay phần BREAKDOWN tab placeholder:                                                                           
                                                                                                                                
  Searched for 2 patterns (ctrl+o to expand)                                                                                    
                                                             
⏺ Update(app/page.tsx)                               
  ⎿  Added 5 lines, removed 5 lines                          
      331        <div className="flex-1 overflow-hidden relative">                                                              
      332                                                    
      333          {activeTab === "BREAKDOWN" && (                                                                              
      334 -          <div className="flex items-center justify-center h-full">                                                
      335 -            <p className="text-[13px] text-[#A1A1AA]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>           
      336 -              Breakdown Mode — Phase 4                                                                               
      337 -            </p>                                                                                                     
      338 -          </div>                                                                                                     
      334 +          <BreakdownView                                                                                             
      335 +            pdfSrc={pdfSrc}                                                                                        
      336 +            onTextExtracted={handleTextExtracted}                                                             
      337 +            onDocumentLoaded={setPdfTotalPages}                                                               
      338 +          />                                                                                                  
      339          )}
      340  
      341          {activeTab === "LINE SCRIPT" && (

⏺ Task 8: Build + fix loop                       
                                                         
⏺ Bash(npm run build 2>&1)                           
  ⎿  > script-lining-app@0.1.0 build                         
     > next build                                    
     … +27 lines (ctrl+o to expand)                          
  ⎿  (timeout 2m)                                                                                                               
                                                     
⏺ Build sạch ngay lần đầu — 0 lỗi.                                                                                              
                                                                                                                              
⏺ Phase 6 hoàn thành. Build sạch 100%.                                                                                          
                                                                                                                                
  ---                                                        
  Tổng kết Phase 6 — Script Breakdown Mode                                                                                      
                                                                                                                                
  Files tạo mới                                                                                                                 
                                                                                                                                
  ┌─────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────┐            
  │                  File                   │                               Vai trò                                │            
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤            
  │ lib/breakdown-categories.ts             │ 12 categories + màu chuẩn industry                                   │            
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ lib/hooks/useTextSelection.ts           │ Hook detect bôi đen text, trả {text, x, y} viewport-relative         │            
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤            
  │ components/breakdown/CategoryMenu.tsx   │ Popup portal 12 categories, tự điều chỉnh vị trí tránh tràn viewport │            
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤            
  │ components/breakdown/BreakdownPanel.tsx │ Right panel — elements nhóm theo category, có nút xóa                │          
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤            
  │ components/breakdown/BreakdownView.tsx  │ Split layout PDF 58% + Panel 42%, kết nối toàn bộ                    │            
  └─────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘            
                                                                                                                                
  Files sửa đổi                                                                                                                 
                                                                                                                                
  ┌─────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐    
  │            File             │                                         Thay đổi                                         │
  ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤    
  │ lib/store/useScriptStore.ts │ Thêm IBreakdownElement, breakdownElements[], addBreakdownElement, removeBreakdownElement │  
  ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ app/page.tsx                │ Import BreakdownView, thay BREAKDOWN tab placeholder bằng BreakdownView thật             │    
  └─────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘    
                                                                                                                                
  Luồng hoạt động                                                                                                               
                                                                                                                              
  User mở tab BREAKDOWN
    → BreakdownView render (PDF bên trái, BreakdownPanel bên phải)
    → User upload PDF → xem kịch bản, bôi đen 1 từ/cụm từ                                                                       
    → useTextSelection phát hiện selection → CategoryMenu popup xuất hiện                                                       
    → User click vào category (ví dụ "Props" màu tím)                                                                           
    → addBreakdownElement() → Zustand store update                                                                              
    → BreakdownPanel auto re-render: "Props (1) — tên element"                                                                  
    → Click × để xóa element bất kỳ lúc nào                                                                                     
                                                                                                                                
  12 Categories với màu chuẩn                                                                                                   
                                                                                                                              
  ┌────────────┬─────────┬─────┬──────────┬─────────┐                                                                           
  │  Category  │   Màu   │     │ Category │   Màu   │                                                                         
  ├────────────┼─────────┼─────┼──────────┼─────────┤                                                                           
  │ Cast       │ #FF0000 │     │ Vehicle  │ #FF69B4 │                                                                         
  ├────────────┼─────────┼─────┼──────────┼─────────┤
  │ Stunts     │ #FF8C00 │     │ Wardrobe │ #00BFFF │                                                                           
  ├────────────┼─────────┼─────┼──────────┼─────────┤                                                                           
  │ Extras-Atm │ #228B22 │     │ Makeup   │ #FF6600 │                                                                           
  ├────────────┼─────────┼─────┼──────────┼─────────┤                                                                           
  │ Extras-Sil │ #FFD700 │     │ Sound    │ #8B4513 │                                                                         
  ├────────────┼─────────┼─────┼──────────┼─────────┤                                                                           
  │ SFX        │ #0066CC │     │ Equip    │ #C8950A │                                                                         
  ├────────────┼─────────┼─────┼──────────┼─────────┤                                                                           
  │ Props      │ #8B00FF │     │ Notes    │ #555555 │
  └────────────┴─────────┴─────┴──────────┴─────────┘        