ralph: Khởi động Bước 1 Tính năng B: Dùng NotebookLM bóc tách dữ liệu kịch bản.                                            
Đường dẫn kịch bản: /Users/phamhuutri/Desktop/websites/app/script-lining/materials/280624_BODND_Screenplay_MASTER.pdf        
LƯU Ý KỸ THUẬT QUAN TRỌNG: Công cụ notebooklm được cài trong môi trường ảo tại home directory. Bạn BẮT BUỘC phải dùng lệnh:  
"source ~/venv/bin/activate && notebooklm [lệnh_của_bạn]" trong mọi thao tác gọi CLI để không bị lỗi command not found.      
Nhiệm vụ của bạn: 1. Dùng CLI/API tạo notebook mới tên "Script Auto Detect". 2. Upload file PDF từ đường dẫn trên lên làm    
source. 3. Chạy truy vấn (Query) yêu cầu đọc sâu kịch bản và trả về DUY NHẤT một chuỗi JSON chuẩn (không markdown, không     
giải thích). 4. Cấu trúc JSON là mảng các scenes, mỗi scene gồm: "scene_number", "int_ext" (NỘI/NGOẠI), "location",          
"day_night", "subjects" (danh sách nhân vật/đồ vật), và "dialogue" (danh sách các câu thoại). 5. Lưu chuỗi JSON đó vào file: 
 data/script-autodetect.json trong thư mục dự án. 6. Đọc file lib/store/useScriptStore.ts, kiểm tra xem JSON vừa tạo có map  
mượt mà vào IShotlistRow không và báo cáo.                                                                                   

⏺ Notebook đã tạo xong ở bước trước (id: c6f2aa88). Tiến hành upload PDF và kiểm tra thư mục data/.

⏺ Bash(source ~/venv/bin/activate && notebooklm source add
      /Users/phamhuutri/Desktop/websites/app/script-lining/materials/280624_BODND_Screenplay_MASTER.pdf --notebook…)
  ⎿  {
       "source": {
         "id": "69df0d2d-b7fd-499d-bbe3-f522769a0c95",
     … +5 lines (ctrl+o to expand)

  Listed 1 directory (ctrl+o to expand)

⏺ PDF đã upload (source_id: 69df0d2d). Chờ source xử lý xong.

⏺ Bash(source ~/venv/bin/activate && notebooklm source wait 69df0d2d-b7fd-499d-bbe3-f522769a0c95 --notebook
      c6f2aa88-d2bc-404c-a7d1-3d66b281fc10 --timeout 300)
  ⎿  Waiting for source 69df0d2d-b7fd-499d-bbe3-f522769a0c95...
     ✓ Source ready: 69df0d2d-b7fd-499d-bbe3-f522769a0c95
     Title: 280624_BODND_Screenplay_MASTER.pdf

⏺ Source đã sẵn sàng. Chạy query bóc tách dữ liệu cảnh.

⏺ Bash(source ~/venv/bin/activate && notebooklm ask 'Read the entire screenplay thoroughly. Extract ALL scenes from beginning
       to end. Return ONLY a raw JSON array (no…)
  ⎿  Running in the background (↓ to manage)
  ⎿  (timeout 2m)

⏺ Bash(sleep 30 && cat /private/tmp/claude-501/-Users-phamhuutri-Desktop-websites-app-script-lining/e91d6229-bea1-4a26-b0c3-a
      2218a3facf7/tasks/b8n1kid4m.output 2>/dev/…)
  ⎿  Continuing conversation 9f583dc6...
     Answer:
     [
     … +47 lines (ctrl+o to expand)
  ⎿  (timeout 1m)

⏺ Dữ liệu đang trả về tốt. Đợi thêm để lấy toàn bộ JSON.

⏺ Bash(sleep 20 && cat /private/tmp/claude-501/-Users-phamhuutri-Desktop-websites-app-script-lining/e91d6229-bea1-4a26-b0c3-a
      2218a3facf7/tasks/b8n1kid4m.output 2>/dev/…)
  ⎿  897
  ⎿  (timeout 40s)

  Read 1 file (ctrl+o to expand)

⏺ Output hoàn chỉnh. Bây giờ tách JSON và lưu file.

⏺ Bash(OUTPUT_FILE="/private/tmp/claude-501/-Users-phamhuutri-Desktop-websites-app-script-lining/e91d6229-bea1-4a26-b0c3-a221
      8a3facf7/tasks/b8n1kid4m.output"
      # Extract…)
  ⎿  Error: Exit code 1
     Traceback (most recent call last):
       File "<string>", line 1, in <module>
         import json; data = json.load(open('/tmp/script-autodetect-raw.json')); print(f'Valid JSON: {len(data)} scenes')
                             ~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       File "/Library/Frameworks/Python.framework/Versions/3.14/lib/python3.14/json/__init__.py", line 293, in load
         return loads(fp.read(),
             cls=cls, object_hook=object_hook,
             parse_float=parse_float, parse_int=parse_int,
             parse_constant=parse_constant, object_pairs_hook=object_pairs_hook, **kw)
     … +10 lines (ctrl+o to see all)

⏺ Bash(python3 -c "
      import re, json…)
  ⎿  Error: Exit code 1
     Traceback (most recent call last):
       File "<string>", line 10, in <module>
         json_str = re.sub(r'(?<!\)\n(?=[^\"]*")', ' ', json_str)
       File "/Library/Frameworks/Python.framework/Versions/3.14/lib/python3.14/re/__init__.py", line 208, in sub
         return _compile(pattern, flags).sub(repl, string, count)
                ~~~~~~~~^^^^^^^^^^^^^^^^
       File "/Library/Frameworks/Python.framework/Versions/3.14/lib/python3.14/re/__init__.py", line 350, in _compile
         p = _compiler.compile(pattern, flags)
       File "/Library/Frameworks/Python.framework/Versions/3.14/lib/python3.14/re/_compiler.py", line 762, in compile
     … +12 lines (ctrl+o to see all)

⏺ Bash(cat > /tmp/fix_json.py << 'PYEOF'
      import json…)
  ⎿  Valid JSON: 53 scenes
     Saved!
                                     
⏺ 53 scenes. Tạo thư mục data/ và lưu file.                                               
                                                                                          
⏺ Bash(mkdir -p /Users/phamhuutri/Desktop/websites/app/script-lining/data && cp /tmp/script-autodetect-clean.json            
      /Users/phamhuutri/Desktop/websites/app/script-lining/…)                                                                
  ⎿  Done                                                                                                                    
          870 /Users/phamhuutri/Desktop/websites/app/script-lining/data/script-autodetect.json                               
                                                                                                                             
⏺ Xem vài scene mẫu để kiểm tra chất lượng dữ liệu.                                                                          
                                                                                                                           
  Read 1 file (ctrl+o to expand)                                                                                             
                                                                                                                             
⏺ Dữ liệu sạch và đúng cấu trúc. Giờ phân tích mapping vào IShotlistRow.                                                     
                                                                                                                             
  ---                                                                                                                        
  Báo cáo: Mapping JSON → IShotlistRow                                                                                       
                                                                                                                             
  Kết quả bóc tách                                                                                                           
                                                                                                                             
  - 53 scenes được extract thành công từ kịch bản                                                                            
  - File đã lưu tại: data/script-autodetect.json (870 dòng)                                                                  
                                                                                                                             
  ---                                                                                                                        
  Phân tích mapping vào IShotlistRow                                                                                         
                                                                                                                             
  ┌──────────────┬────────────────────────────────┬───────────────────────────────────────────────────┐                    
  │ Trường JSON  │      Trường IShotlistRow       │                    Tương thích                    │                      
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤
  │ scene_number │ sceneNumber: string            │ Map trực tiếp — VD: "1", "4A"                     │                      
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤                    
  │ int_ext      │ intExt: 'INT' | 'EXT' | ''     │ Map trực tiếp — JSON dùng "INT"/"EXT" đúng khớp   │                      
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤                      
  │ location     │ location: string               │ Map trực tiếp                                     │                      
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤                      
  │ day_night    │ dayNight: 'DAY' | 'NIGHT' | '' │ Map trực tiếp — JSON dùng "DAY"/"NIGHT" đúng khớp │                    
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤                      
  │ subjects     │ subjects: string[]             │ Map trực tiếp                                     │                    
  ├──────────────┼────────────────────────────────┼───────────────────────────────────────────────────┤                      
  │ dialogue     │ dialogue: string[]             │ Map trực tiếp                                     │                    
  └──────────────┴────────────────────────────────┴───────────────────────────────────────────────────┘

  Các trường IShotlistRow không có trong JSON (cần fill sau)                                                                 
  
  Đây là các trường dành cho người dùng điền khi vẽ tramline, không cần bóc tách từ kịch bản:                                
                                                                                                                           
  - tramlineId, rowNumber — sinh tự động khi tạo tramline                                                                    
  - shotName, shotSize, shotType, side, angle, movement, lens — điền tay trên canvas                                       
  - description, autoDetectText — sẽ do autoDetect.ts parser tự fill từ PDF text extraction                                  
  - scriptTime, note — điền tay                                                                                              
                                                                                                                             
  Kết luận                                                                                                                   
                                                                                                                           
  Mapping hoàn toàn mượt mà — 0 xung đột kiểu dữ liệu. Tất cả 6 trường JSON đều map 1:1 vào các trường tương ứng trong       
  IShotlistRow. Bước tiếp theo (Bước 2) chỉ cần viết một hàm import nhỏ: với mỗi scene trong JSON, tìm các IShotlistRow có 
  sceneNumber khớp và patch các trường location, intExt, dayNight, subjects, dialogue vào.                                   
                                                                                                                           
✻ Brewed for 4m 14s                  
                                                                                          
⏺ Background command "Query NotebookLM to extract all scenes as JSON" completed (exit code 0)
                                                                                                                             
⏺ Background task đã hoàn thành (exit code 0) — đây chỉ là thông báo xác nhận, dữ liệu đã được xử lý và lưu file thành công ở
   bước trước rồi. Không cần thao tác thêm.