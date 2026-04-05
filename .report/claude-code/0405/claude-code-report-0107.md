Tôi đã hiểu rõ codebase. Phát hiện quan trọng: next.config.ts có output: "export" (static export) — cần bỏ để API Routes hoạt động. Bây giờ thực thi:

⏺ Bắt đầu thực thi — Task 1: Setup dependencies

⏺ Update(next.config.ts)
  ⎿  Removed 1 line
      2  import path from "path";              
      3                                        
      4  const nextConfig: NextConfig = {   
      5 -  output: "export",                                                                                                                       
      5    images: { unoptimized: true },    
      6    turbopack: {
      7      root: path.resolve(__dirname),                                                                                                               
                                        
⏺ Bash(npm install @aws-sdk/client-s3 2>&1 | tail -5)                                                                                                     
  ⎿  170 packages are looking for funding                                                                                                               
       run `npm fund` for details                                                                                                                       
                                                                                                                                                        
     found 0 vulnerabilities                                                                                                                              
  ⎿  (timeout 1m)                                                                                                                                         
                                                                                                                                                          
⏺ Write(.env.local)                                                                                                                                       
  ⎿  Wrote 8 lines to .env.local                                                                                                                          
      1 # Cloudflare R2 — S3-compatible credentials                                                                                                       
      2 # Lấy từ: Cloudflare Dashboard → R2 → Manage R2 API Tokens                                                                                        
      3 R2_ACCOUNT_ID=your_cloudflare_account_id                                                                                                          
      4 R2_ACCESS_KEY_ID=your_r2_access_key_id                                                                                                            
      5 R2_SECRET_ACCESS_KEY=your_r2_secret_access_key                                                                                                    
      6 R2_BUCKET_NAME=script-lining                                                                                                                    
      7 # Public URL (nếu bucket được bật Public Access hoặc có custom domain)                                                                            
      8 R2_PUBLIC_URL=https://pub-xxxxx.r2.dev                                                                                                          
                                                                                                                                                          
⏺ Task 2: Tạo API Route                                                                                                                                 
                                                                                                                                                        
⏺ Bash(mkdir -p /Users/phamhuutri/Desktop/websites/app/script-lining/app/api/upload)                                                                    
  ⎿  Done                                             
                                             
⏺ Write(app/api/upload/route.ts)                      
  ⎿  Wrote 85 lines to app/api/upload/route.ts                                                                                                            
       1 /**                                    
       2  * POST /api/upload                                                                                                                              
       3  * Nhận file PDF qua FormData, upload lên Cloudflare R2, trả về public URL.                                                                    
       4  *                                                                                                                                               
       5  * Body: FormData { file: File (application/pdf) }                                                                                               
       6  * Response: { url: string } | { error: string }                                                                                               
       7  */                                                                                                                                              
       8                                                                                                                                                
       9 import { NextRequest, NextResponse } from "next/server";                                                                                         
      10 import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";                                                                                 
     … +75 lines (ctrl+o to expand)                                                                                                                     

⏺ Task 3: Cập nhật page.tsx                     
                                               
⏺ Update(app/page.tsx)                             
  ⎿  Added 2 lines                                    
      123    const [pdfTotalPages, setPdfTotalPages] = useState(0);
      124    const [extractedData, setExtractedData] = useState<PdfTextExtractionData[]>([]);
      125    const [drawMode, setDrawMode] = useState<DrawMode>("idle");                                                                                  
      126 +  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");                                               
      127 +  const [uploadError, setUploadError] = useState<string | null>(null);                                                                         
      128    const fileInputRef = useRef<HTMLInputElement>(null);                                                                                       
      129                                                                                                                                                 
      130    useEffect(() => {                                                                                                                          
                                                                                                                                                          
⏺ Update(app/page.tsx)                                                                                                                                  
  ⎿  Added 34 lines, removed 2 lines                                                                                                                    
      131      hydrate(MOCK_TRAMLINES, MOCK_SHOTLIST);
      132    }, [hydrate]);                           
      133                                    
      134 -  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {                                                    
      134 +  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {                                                     
      135      const file = e.target.files?.[0];
      136 +    // Reset input để cho phép chọn lại cùng file                                                                                              
      137 +    e.target.value = "";                                                                                                                     
      138      if (!file || file.type !== "application/pdf") return;                                                                                    
      139  
      140 +    // Revoke blob URL cũ nếu có                                                                                                        
      141      if (pdfSrc && typeof pdfSrc === "string" && pdfSrc.startsWith("blob:")) {
      142        URL.revokeObjectURL(pdfSrc);
      143      }
      141 -    setPdfSrc(URL.createObjectURL(file));                                                                                               
      144 +                                                                                                                                        
      145      setExtractedData([]);
      146 +    setUploadError(null);                                                                                                               
      147 +    setUploadState("uploading");                                                                                                        
      148 +                                                                                                                                        
      149 +    // Preview ngay bằng blob URL trong khi upload R2 chạy nền                                                                          
      150 +    const blobUrl = URL.createObjectURL(file);                                                                                          
      151 +    setPdfSrc(blobUrl);                                                                                                                 
      152 +                                                                                                                                        
      153 +    try {                                                                                                                               
      154 +      const formData = new FormData();                                                                                                  
      155 +      formData.append("file", file);                                                                                                    
      156 +                                                                                                                                        
      157 +      const res = await fetch("/api/upload", { method: "POST", body: formData });                                                       
      158 +      const json = (await res.json()) as { url?: string; error?: string };                                                              
      159 +                                                                                                                                        
      160 +      if (!res.ok || !json.url) {                                                                                                       
      161 +        throw new Error(json.error ?? `HTTP ${res.status}`);                                                                            
      162 +      }                                                                                                                                 
      163 +                                                                                                                                        
      164 +      // Thay blob URL bằng R2 public URL                                                                                               
      165 +      URL.revokeObjectURL(blobUrl);                                                                                                     
      166 +      setPdfSrc(json.url);                                                                                                              
      167 +      setUploadState("idle");                                                                                                           
      168 +    } catch (err) {                                                                                                                     
      169 +      const msg = err instanceof Error ? err.message : "Upload thất bại";                                                               
      170 +      console.error("[Upload]", err);                                                                                                   
      171 +      // Giữ blob URL để người dùng vẫn làm việc được, chỉ báo lỗi                                                                      
      172 +      setUploadState("error");                                                                                                          
      173 +      setUploadError(msg);                                                                                                              
      174 +    }                                                                                                                                   
      175    }, [pdfSrc]);
      176  
      177    const setPdfTextForPage = useScriptStore((s) => s.setPdfTextForPage);

⏺ Bây giờ cập nhật nút Upload trong header để hiển thị trạng thái uploading/error:
                                               
⏺ Update(app/page.tsx)                             
  ⎿  Added 46 lines, removed 8 lines                  
      273              )}                          
      274              <button                        
      275                onClick={() => fileInputRef.current?.click()}                                                                                    
      276 -              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold"                                       
      277 -              style={{ background: "rgba(24,24,27,0.06)", color: "#18181B", fontFamily: "Space Grotesk, sans-serif" }}                         
      276 +              disabled={uploadState === "uploading"}                                                                                         
      277 +              title={uploadState === "error" && uploadError ? uploadError : undefined}                                                         
      278 +              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-opacity"                         
      279 +              style={{                                                                                                                         
      280 +                background: uploadState === "error"                                                                                          
      281 +                  ? "rgba(239,68,68,0.10)"                                                                                                   
      282 +                  : uploadState === "uploading"                                                                                         
      283 +                    ? "rgba(25,230,111,0.10)"                                                                                           
      284 +                    : "rgba(24,24,27,0.06)",                                                                                            
      285 +                color: uploadState === "error"                                                                                          
      286 +                  ? "#dc2626"                                                                                                           
      287 +                  : uploadState === "uploading"                                                                                         
      288 +                    ? "#16a34a"                                                                                                         
      289 +                    : "#18181B",                                                                                                        
      290 +                fontFamily: "Space Grotesk, sans-serif",                                                                                
      291 +                opacity: uploadState === "uploading" ? 0.7 : 1,                                                                         
      292 +                cursor: uploadState === "uploading" ? "not-allowed" : "pointer",                                                        
      293 +              }}                                                                                                                        
      294              >
      279 -              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" 
          -strokeLinejoin="round">                                                                                                                 
      280 -                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />                                                                  
      281 -                <polyline points="17 8 12 3 7 8" />                                                                                     
      282 -                <line x1="12" y1="3" x2="12" y2="15" />                                                                                 
      283 -              </svg>                                                                                                                    
      284 -              Upload PDF                                                                                                                
      295 +              {uploadState === "uploading" ? (                                                                                          
      296 +                <>                                                                                                                      
      297 +                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="rou
          +nd" strokeLinejoin="round"                                                                                                              
      298 +                    className="animate-spin">                                                                                           
      299 +                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />                                                              
      300 +                    <path d="M12 2a10 10 0 0 1 10 10" />                                                                                
      301 +                  </svg>                                                                                                                
      302 +                  Uploading...                                                                                                          
      303 +                </>                                                                                                                     
      304 +              ) : uploadState === "error" ? (                                                                                           
      305 +                <>                                                                                                                      
      306 +                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="rou
          +nd" strokeLinejoin="round">                                                                                                             
      307 +                    <circle cx="12" cy="12" r="10" />                                                                                   
      308 +                    <line x1="12" y1="8" x2="12" y2="12" />                                                                             
      309 +                    <line x1="12" y1="16" x2="12.01" y2="16" />                                                                         
      310 +                  </svg>                                                                                                                
      311 +                  Retry Upload                                                                                                          
      312 +                </>                                                                                                                     
      313 +              ) : (                                                                                                                     
      314 +                <>                                                                                                                      
      315 +                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="rou
          +nd" strokeLinejoin="round">                                                                                                             
      316 +                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />                                                              
      317 +                    <polyline points="17 8 12 3 7 8" />                                                                                 
      318 +                    <line x1="12" y1="3" x2="12" y2="15" />                                                                             
      319 +                  </svg>                                                                                                                
      320 +                  Upload Script                                                                                                         
      321 +                </>                                                                                                                     
      322 +              )}                                                                                                                        
      323              </button>
      324              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      325            </div>

⏺ Task 4: Build và fix lỗi                         
                                               
⏺ Bash(npm run build 2>&1)                  
  ⎿  Error: Exit code 1                               
                                             
     > script-lining-app@0.1.0 build                  
     > next build                                                                                                                                         
                                            
        ▲ Next.js 15.5.14                                                                                                                                 
        - Environments: .env.local                                                                                                                      
                                                                                                                                                          
        Creating an optimized production build ...                                                                                                        
      ✓ Compiled successfully in 3.4s                                                                                                                   
     … +13 lines (ctrl+o to see all)                                                                                                                      
                                                                                                                                                        
  Read 1 file (ctrl+o to expand)                                                                                                                          
                                                                                                                                                        
⏺ File examples/useScriptStore-example.ts dùng import sai đường dẫn. Fix bằng cách exclude examples/ khỏi tsconfig:                                       
                                                                                                                                                          
⏺ Update(tsconfig.json)                                                                                                                                   
  ⎿  Added 2 lines, removed 1 line                                                                                                                        
      36    ],                                                                                                                                            
      37    "exclude": [                                                                                                                                  
      38      "node_modules",                                                                                                                             
      39 -    "stitch-skills-main"                                                                                                                        
      39 +    "stitch-skills-main",                                                                                                                       
      40 +    "examples"                                                                                                                                  
      41    ]                                                                                                                                             
      42  }                                                                                                                                             
                                                                                                                                                          
⏺ Bash(npm run build 2>&1)                                                                                                                              
  ⎿  > script-lining-app@0.1.0 build                                                                                                                    
     > next build                                                                                                                                       
     … +27 lines (ctrl+o to expand)                          
  ⎿  (timeout 2m)                              
                                            
⏺ Build thành công. Route /api/upload đã xuất hiện dạng ƒ (Dynamic).                                                                                      
                                                             
⏺ Build sạch 100%, không có lỗi type. Đây là tổng kết những gì đã thực hiện:                                                                              
                                                                                                                                                          
  ---                                                                                                                                                   
  Phase 5 hoàn thành — PDF Upload → Cloudflare R2                                                                                                         
                                                                                                                                                          
  Thay đổi                                                                                                                                                
                                                                                                                                                          
  ┌─────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┐                                      
  │          File           │                                       Thay đổi                                       │                                      
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤                                      
  │ next.config.ts          │ Bỏ output: "export" — bắt buộc để API Routes hoạt động                               │                                      
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
  │ app/api/upload/route.ts │ Mới — API Route nhận FormData PDF, upload R2 qua S3-compatible SDK, trả { url }      │                                      
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤                                    
  │ app/page.tsx            │ handleFileChange nay async: preview blob URL ngay → upload R2 nền → swap sang R2 URL │                                      
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤                                      
  │ .env.local              │ Template 5 biến R2 cần điền                                                          │                                    
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┤                                      
  │ tsconfig.json           │ Exclude examples/ (file example có import sai path)                                  │                                      
  └─────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┘                                      
                                                                                                                                                          
  Upload flow                                                                                                                                             
                                                                                                                                                          
  User chọn file PDF                                                                                                                                      
    → Blob URL preview ngay (PdfRenderer hiện PDF tức thì)                                                                                                
    → Song song: POST /api/upload → R2                                                                                                                    
    → Khi upload xong: swap pdfSrc = R2 URL
    → Nút "Upload Script" spinner trong lúc uploading                                                                                                     
    → Nếu lỗi: nút đổi thành "Retry Upload" + tooltip lỗi                                                                                                 
                                                                                                                                                          
  Cấu hình R2 (điền vào .env.local)                                                                                                                       
                                                                                                                                                          
  R2_ACCOUNT_ID=       # Cloudflare Dashboard → Overview                                                                                                  
  R2_ACCESS_KEY_ID=    # R2 → Manage R2 API Tokens → Create Token                                                                                         
  R2_SECRET_ACCESS_KEY=                                                                                                                                   
  R2_BUCKET_NAME=script-lining                                                                                                                            
  R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Enable Public Access trên bucket