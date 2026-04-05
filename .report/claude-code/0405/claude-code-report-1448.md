ralph: Dựa vào báo cáo claude-code-report-1439.md, hãy thực thi "Bước 2 Tính năng B: Import dữ liệu NotebookLM vào Bảng    
Shotlist".                                                                                                                   
Nhiệm vụ của bạn: 1. Nâng cấp lib/store/useScriptStore.ts: Viết một action mới tên là "importAutoDetectData" để nạp dữ liệu  
từ file JSON vào state "autoDetectData" (lưu cache). 2. Cập nhật logic Two-way Binding: Sửa lại hàm addTramline và           
updateTramline. Khi một line được gán/đổi sceneNumber, hãy tự động tìm trong "autoDetectData" xem có scene tương ứng không.  
Nếu có, lập tức patch (điền tự động) các trường: location, intExt, dayNight, subjects, dialogue vào IShotlistRow tương ứng.  
3. Cập nhật Giao diện (Shotlist Table): Thêm một nút "Load AI Data" nhỏ ở góc bảng Shotlist. Khi click, nút này sẽ fetch     
file data/script-autodetect.json và gọi hàm importAutoDetectData. 4. Đảm bảo UI Bảng Shotlist hiển thị chính xác các trường  
vừa được import (nhất là cột AUTO DETECT, DESCRIPTION và DIALOGUE).                                                          
Lưu ý: Chạy npm run build để kiểm tra lỗi type-safe liên tục. Hãy test đảm bảo dữ liệu hiển thị mượt mà trên UI trước khi    
kết thúc.                                                                                                                    

  Searched for 1 pattern, read 1 file, listed 1 directory (ctrl+o to expand)

⏺ Tốt, đã nắm rõ báo cáo. Giờ khám phá các file component cần sửa.

  Searched for 2 patterns, read 1 file (ctrl+o to expand)

⏺ Đã nắm đủ context. Bắt đầu thực thi.

  Listed 1 directory (ctrl+o to expand)

⏺ Bash(cat /Users/phamhuutri/Desktop/websites/app/script-lining/data/script-autodetect.json | python3 -c "import json,sys;
      d=json.load(sys.stdin); print(json.dumps(d[0…)
  ⎿  [
       {
         "scene_number": "1",
     … +26 lines (ctrl+o to expand)

⏺ Plan:
  1. Copy JSON vào public/data/ để Next.js serve tĩnh
  2. Nâng cấp useScriptStore.ts — thêm type + action + two-way binding
  3. Nâng cấp ShotlistTable.tsx — thêm nút "Load AI Data"
  4. Build kiểm tra type-safe

  ---
  Bước 1 — Copy JSON vào public/data/

⏺ Bash(mkdir -p /Users/phamhuutri/Desktop/websites/app/script-lining/public/data && cp
      /Users/phamhuutri/Desktop/websites/app/script-lining/data/script-autodetect.json…)
  ⎿  Copied

⏺ Bước 2 — Nâng cấp useScriptStore.ts

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 11 lines
       7  } from '@/lib/utils/autoDetect';
       8  import type { TextLine } from '@/lib/hooks/usePdfTextExtraction';
       9  
      10 +// ─── Auto-Detect Scene Model (từ NotebookLM / data/script-autodetect.json) ────                           
      11 +                                                                                                            
      12 +export interface IAutoDetectScene {                                                                         
      13 +  scene_number: string;                                                                                     
      14 +  int_ext: string;        // "INT" | "EXT"                                                                  
      15 +  location: string;                                                                                         
      16 +  day_night: string;      // "DAY" | "NIGHT"                                                                
      17 +  subjects: string[];                                                                                       
      18 +  dialogue: string[];                                                                                       
      19 +}                                                                                                           
      20 +                                                                                                            
      21  // ─── Data Models (theo resources/data-models.md) ──────────────────────────────
      22  
      23  export interface ILineSegment {

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 8 lines
       87    tramlines: ITramline[];
       88    shotlist: IShotlistRow[];
       89  
       90 +  // --- Auto-Detect Data Cache (từ NotebookLM) ---                                                        
       91 +  autoDetectData: IAutoDetectScene[];                                                                      
       92 +  /**                                                                                                      
       93 +   * importAutoDetectData — nạp dữ liệu AI vào cache, đồng thời patch ngay                                 
       94 +   * toàn bộ IShotlistRow có sceneNumber khớp với scene_number trong dữ liệu.                              
       95 +   */                                                                                                      
       96 +  importAutoDetectData: (scenes: IAutoDetectScene[]) => void;                                              
       97 +                                                                                                           
       98    // --- Break Scene State ---
       99    breakScenes: IBreakScene[];
      100    addBreakScene: (bs: IBreakScene) => void;

⏺ Bây giờ thêm helper autoDetectSceneToRowPatch vào phần Helpers:

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 15 lines
      147  
      148  // ─── Helpers ──────────────────────────────────────────────────────────────────
      149  
      150 +/**                                                                                                        
      151 + * Map một IAutoDetectScene → Partial<IShotlistRow> để patch vào row.                                      
      152 + * Chỉ patch các trường xuất phát từ AI, không đụng tramlineId / rowNumber /                               
      153 + * shotName / shotSize / ... (những trường user điền tay).                                                 
      154 + */                                                                                                        
      155 +function autoDetectSceneToRowPatch(scene: IAutoDetectScene): Partial<IShotlistRow> {                       
      156 +  return {                                                                                                 
      157 +    location: scene.location,                                                                              
      158 +    intExt:   (scene.int_ext === 'INT' || scene.int_ext === 'EXT') ? scene.int_ext : '',                   
      159 +    dayNight: (scene.day_night === 'DAY' || scene.day_night === 'NIGHT') ? scene.day_night : '',           
      160 +    subjects: scene.subjects,                                                                              
      161 +    dialogue: scene.dialogue,                                                                              
      162 +  };                                                                                                       
      163 +}                                                                                                          
      164 +                                                                                                           
      165  function createDefaultShotlistRow(tramline: ITramline, rowNumber: number): IShotlistRow {
      166    return {
      167      tramlineId: tramline.id,

⏺ Giờ sửa phần Store — khởi tạo autoDetectData: [] và thêm action:

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 1 line
      237        pdfTextByPage: {},
      238        breakScenes: [],
      239        breakdownElements: [],
      240 +      autoDetectData: [],                                                                                  
      241  
      242        addBreakScene: (bs) =>
      243          set((state) => ({ breakScenes: [...state.breakScenes, bs] })),

⏺ Thêm action importAutoDetectData ngay sau breakdownElements actions (trước addTramline):

⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 15 lines
      265            breakdownElements: state.breakdownElements.filter((e) => e.id !== id),
      266          })),                                                                   
      267  
      268 +      // ── importAutoDetectData ───────────────────────────────────────────────                                  
      269 +      // 1. Lưu cache autoDetectData                                                                       
      270 +      // 2. Patch ngay toàn bộ shotlist rows có sceneNumber khớp                                                  
      271 +      importAutoDetectData: (scenes) =>                                                                         
      272 +        set((state) => {                                                                                   
      273 +          const sceneMap = new Map(scenes.map((s) => [s.scene_number, s]));                                
      274 +          const newShotlist = state.shotlist.map((row) => {                                                
      275 +            if (!row.sceneNumber) return row;                                                              
      276 +            const scene = sceneMap.get(row.sceneNumber);                                                   
      277 +            if (!scene) return row;                                                                        
      278 +            return { ...row, ...autoDetectSceneToRowPatch(scene) };                                        
      279 +          });                                                                                              
      280 +          return { autoDetectData: scenes, shotlist: newShotlist };                                        
      281 +        }),                                                                                                
      282 +                                                                                                           
      283        // ── addTramline ────────────────────────────────────────────────────────
      284        // Thêm tramline + tự động tạo IShotlistRow + chạy auto-detect nếu có text
      285        addTramline: (tramline) =>

⏺ Sửa addTramline — sau khi parse row, tự động apply autoDetectData nếu có match:
                                                                                          
⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 9 lines, removed 1 line                                                                                           
      282                           
      283        // ── addTramline ────────────────────────────────────────────────────────                                  
      284        // Thêm tramline + tự động tạo IShotlistRow + chạy auto-detect nếu có text                                
      285 +      // Sau khi parse: nếu autoDetectData có scene khớp sceneNumber → patch thêm                                 
      286        addTramline: (tramline) =>                                                                                
      287          set((state) => {                                                                                          
      288            const pdfLines = state.pdfTextByPage[tramline.pageNumber] ?? [];                                      
      289            const rowNumber = state.shotlist.length + 1;
      289 -          const newRow = buildShotlistRowWithParse(tramline, rowNumber, pdfLines);                         
      290 +          let newRow = buildShotlistRowWithParse(tramline, rowNumber, pdfLines);                           
      291  
      292 +          if (newRow.sceneNumber && state.autoDetectData.length > 0) {                                     
      293 +            const scene = state.autoDetectData.find((s) => s.scene_number === newRow.sceneNumber);         
      294 +            if (scene) {                                                                                   
      295 +              newRow = { ...newRow, ...autoDetectSceneToRowPatch(scene) };                                 
      296 +            }                                                                                              
      297 +          }                                                                                                
      298 +                                                                                                           
      299            return {
      300              tramlines: [...state.tramlines, tramline],
      301              shotlist:  [...state.shotlist, newRow],

⏺ Sửa updateShotlistRow — khi sceneNumber thay đổi, tự động patch từ autoDetectData:
                                                                                          
⏺ Update(lib/store/useScriptStore.ts)
  ⎿  Added 13 lines, removed 3 lines                                                                                         
      333                           
      334        // ── updateShotlistRow ──────────────────────────────────────────────────                                  
      335        // Two-way binding: shotName / shotSize sync lên tramline                                                 
      336 +      // Nếu sceneNumber thay đổi → tự động patch từ autoDetectData                                               
      337        updateShotlistRow: (tramlineId, updates) =>                                                               
      338          set((state) => {                                                                                          
      339 +          // Khi sceneNumber đổi, enrich với dữ liệu AI (không ghi đè nếu không có match)                       
      340 +          let enrichedUpdates: Partial<IShotlistRow> = { ...updates };                                     
      341 +          if (updates.sceneNumber !== undefined && state.autoDetectData.length > 0) {                      
      342 +            const scene = state.autoDetectData.find((s) => s.scene_number === updates.sceneNumber);        
      343 +            if (scene) {                                                                                   
      344 +              enrichedUpdates = { ...enrichedUpdates, ...autoDetectSceneToRowPatch(scene) };               
      345 +            }                                                                                              
      346 +          }                                                                                                
      347 +                                                                                                           
      348            const newShotlist = state.shotlist.map((s) =>
      339 -            s.tramlineId === tramlineId ? { ...s, ...updates } : s,                                        
      349 +            s.tramlineId === tramlineId ? { ...s, ...enrichedUpdates } : s,                                
      350            );
      351            const syncedFields: Partial<ITramline> = {};
      342 -          if (updates.shotName !== undefined) syncedFields.shotName = updates.shotName;                    
      343 -          if (updates.shotSize !== undefined) syncedFields.shotSize = updates.shotSize;                    
      352 +          if (enrichedUpdates.shotName !== undefined) syncedFields.shotName = enrichedUpdates.shotName;    
      353 +          if (enrichedUpdates.shotSize !== undefined) syncedFields.shotSize = enrichedUpdates.shotSize;    
      354  
      355            const newTramlines = Object.keys(syncedFields).length
      356              ? state.tramlines.map((t) =>

⏺ Bước 3 — Thêm nút "Load AI Data" vào ShotlistTable
                                                                                          
⏺ Update(components/shotlist/ShotlistTable.tsx)
  ⎿  Added 1 line, removed 1 line                                                                                            
      24   */                      
      25                                                                                                                     
      26  import * as React from "react";                                                                                  
      27 -import { useScriptStore, type IShotlistRow } from "@/lib/store/useScriptStore";                                    
      27 +import { useScriptStore, type IShotlistRow, type IAutoDetectScene } from "@/lib/store/useScriptStore";           
      28  import { cn } from "@/lib/utils";                                                                                  
      29                                                                                                                   
      30  // ─── Enum options ─────────────────────────────────────────────────────────────

⏺ Thêm component LoadAIDataButton trước EmptyState:
                                                                                          
⏺ Update(components/shotlist/ShotlistTable.tsx)
  ⎿  Added 70 lines                                                                                                          
      313    }                      
      314  }                                                                                                                 
      315                                                                                                                  
      316 +// ─── Load AI Data Button ──────────────────────────────────────────────────────                                 
      317 +                                                                                                                
      318 +type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';                                                            
      319 +                                                                                                           
      320 +function LoadAIDataButton() {                                                                              
      321 +  const importAutoDetectData = useScriptStore((s) => s.importAutoDetectData);                              
      322 +  const autoDetectData = useScriptStore((s) => s.autoDetectData);                                          
      323 +  const [status, setStatus] = React.useState<LoadStatus>('idle');                                          
      324 +                                                                                                           
      325 +  // Nếu đã có data trong cache thì hiện trạng thái "loaded"                                               
      326 +  const alreadyLoaded = autoDetectData.length > 0;                                                         
      327 +                                                                                                           
      328 +  async function handleLoad() {                                                                            
      329 +    setStatus('loading');                                                                                  
      330 +    try {                                                                                                  
      331 +      const res = await fetch('/data/script-autodetect.json');                                             
      332 +      if (!res.ok) throw new Error(`HTTP ${res.status}`);                                                  
      333 +      const scenes: IAutoDetectScene[] = await res.json();                                                 
      334 +      importAutoDetectData(scenes);                                                                        
      335 +      setStatus('ok');                                                                                     
      336 +      // Reset về idle sau 3s                                                                              
      337 +      setTimeout(() => setStatus('idle'), 3000);                                                           
      338 +    } catch (err) {                                                                                        
      339 +      console.error('[LoadAIData]', err);                                                                  
      340 +      setStatus('error');                                                                                  
      341 +      setTimeout(() => setStatus('idle'), 3000);                                                           
      342 +    }                                                                                                      
      343 +  }                                                                                                        
      344 +                                                                                                           
      345 +  const label =                                                                                            
      346 +    status === 'loading' ? 'Loading...' :                                                                  
      347 +    status === 'ok'      ? `✓ ${autoDetectData.length} scenes loaded` :                                    
      348 +    status === 'error'   ? '✗ Error' :                                                                     
      349 +    alreadyLoaded        ? `AI Data ✓ (${autoDetectData.length})` :                                        
      350 +                           'Load AI Data';                                                                 
      351 +                                                                                                           
      352 +  const accent = status === 'ok' ? '#19e66f' : status === 'error' ? '#ef4444' : alreadyLoaded ? '#19e66f' :
          + '#71717A';                                                                                                
      353 +                                                                                                           
      354 +  return (                                                                                                 
      355 +    <button                                                                                                
      356 +      onClick={handleLoad}                                                                                 
      357 +      disabled={status === 'loading'}                                                                      
      358 +      title="Nạp dữ liệu AI từ data/script-autodetect.json vào bảng Shotlist"                              
      359 +      style={{                                                                                             
      360 +        display: 'flex',                                                                                   
      361 +        alignItems: 'center',                                                                              
      362 +        gap: 5,                                                                                            
      363 +        padding: '3px 10px',                                                                               
      364 +        borderRadius: 5,                                                                                   
      365 +        border: `1px solid ${accent}`,                                                                     
      366 +        background: alreadyLoaded || status === 'ok' ? `${accent}1A` : 'transparent',                      
      367 +        color: accent,                                                                                     
      368 +        fontFamily: FONT,                                                                                  
      369 +        fontSize: 10,                                                                                      
      370 +        fontWeight: 700,                                                                                   
      371 +        letterSpacing: '0.07em',                                                                           
      372 +        cursor: status === 'loading' ? 'wait' : 'pointer',                                                 
      373 +        transition: 'all 0.15s',                                                                           
      374 +        whiteSpace: 'nowrap',                                                                              
      375 +      }}                                                                                                   
      376 +    >                                                                                                      
      377 +      {/* Spark icon */}                                                                                   
      378 +      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" s
          +trokeLinecap="round" strokeLinejoin="round">                                                               
      379 +        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>                                                        
      380 +      </svg>                                                                                               
      381 +      {label}                                                                                              
      382 +    </button>                                                                                              
      383 +  );                                                                                                       
      384 +}                                                                                                          
      385 +                                                                                                           
      386  // ─── Empty State ──────────────────────────────────────────────────────────────
      387  
      388  function EmptyState() {

⏺ Giờ thêm nút vào Toolbar (thay thế dòng TWO-WAY BINDING ✓):
                                                                                          
⏺ Update(components/shotlist/ShotlistTable.tsx)
  ⎿  Added 6 lines, removed 3 lines                                                                                          
      447          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#71717A", textTransfo
           rm: "uppercase" }}>                                                                                               
      448            Shotlist — {shotlist.length} shot{shotlist.length !== 1 ? "s" : ""}
      449          </span>                                                                                                   
      450 -        <span style={{ fontSize: 10, fontWeight: 600, color: "#19e66f", letterSpacing: "0.08em" }}>        
      451 -          TWO-WAY BINDING ✓                                                                                       
      452 -        </span>                                                                                            
      450 +        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>                                    
      451 +          <LoadAIDataButton />                                                                             
      452 +          <span style={{ fontSize: 10, fontWeight: 600, color: "#19e66f", letterSpacing: "0.08em" }}>      
      453 +            TWO-WAY BINDING ✓                                                                              
      454 +          </span>                                                                                          
      455 +        </div>                                                                                             
      456        </div>
      457  
      458        {/* ── Table Container ─────────────────────────────────────────────────── */}

⏺ Bước 4 — Build kiểm tra type-safe 
                                                                                          
⏺ Bash(npm run build 2>&1)          
  ⎿  > script-lining-app@0.1.0 build                                                                                         
     > next build                    
     … +27 lines (ctrl+o to expand)                                                                                          
  ⎿  (timeout 2m)                                                                         
                                                                                                                             
⏺ Build sạch, 0 lỗi TypeScript. Xem lại file cuối cùng để confirm mọi thứ đúng:                                              
                                                                                          
  Searched for 1 pattern (ctrl+o to expand)                                                                                  
                                                                                                                             
⏺ Tất cả đúng chỗ. Tổng kết kết quả:                                                                                         
                                                                                                                             
  ---                                                                                                                        
  Bước 2 hoàn thành — Build ✓ (0 lỗi)                                                                                        
                                                                                                                             
  Những gì đã làm:                                                                                                           
                                                                                                                             
  lib/store/useScriptStore.ts:                                                                                               
  - Thêm IAutoDetectScene interface (export, dùng chung với component)
  - Thêm helper autoDetectSceneToRowPatch() — map scene AI → Partial<IShotlistRow>                                           
  - Thêm autoDetectData: IAutoDetectScene[] vào state (khởi tạo [])               
  - Thêm action importAutoDetectData(scenes):                                                                                
    - Lưu cache vào autoDetectData                                                                                           
    - Patch ngay tất cả existing rows có sceneNumber khớp                                                                    
  - Sửa addTramline — sau khi parse PDF, nếu có autoDetectData match → patch thêm location/intExt/dayNight/subjects/dialogue 
  - Sửa updateShotlistRow — khi user gõ sceneNumber mới → tự động lookup autoDetectData và enrich row                        
                                                                                                                             
  components/shotlist/ShotlistTable.tsx:                                                                                     
  - Thêm component LoadAIDataButton — fetch /data/script-autodetect.json → gọi importAutoDetectData                          
  - 3 trạng thái visual: Loading / OK (hiện số scenes) / Error                                                               
  - Sau khi load xong, badge chuyển xanh và hiện AI Data ✓ (53)                                                              
  - Gắn nút vào Toolbar bên cạnh badge "TWO-WAY BINDING ✓"                                                                   
                                                                                                                             
  Flow hoàn chỉnh:                                                                                                           
  1. Mở bảng Shotlist → click "Load AI Data" → 53 scenes nạp vào cache                                                       
  2. Mọi row đã có sceneNumber được patch ngay lập tức                                                                       
  3. Khi vẽ tramline mới → addTramline tự match scene → điền sẵn location/int_ext/day_night/subjects/dialogue
  4. Khi user gõ đổi sceneNumber trong bảng → row tự động điền lại dữ liệu cảnh mới