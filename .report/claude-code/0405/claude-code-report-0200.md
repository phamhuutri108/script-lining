---                                                                                                                           
  Tổng kết — Auto Detect Engine (Bước 1 Tính năng B)                                                                            
                                                                                                                                
  Files tạo/sửa                                                                                                                 
                                                                                                                                
  ┌─────────────────────────────┬──────────────────────────────────────────────────┐                                          
  │            File             │                     Nội dung                     │                                            
  ├─────────────────────────────┼──────────────────────────────────────────────────┤                                          
  │ lib/utils/autoDetect.ts     │ Mới — Engine chính, ~350 dòng, fully documented  │                                          
  ├─────────────────────────────┼──────────────────────────────────────────────────┤                                          
  │ lib/utils/script-parser.ts  │ Downgrade thành thin re-export (backward compat) │                                            
  ├─────────────────────────────┼──────────────────────────────────────────────────┤                                            
  │ lib/store/useScriptStore.ts │ Import từ autoDetect.ts thay vì script-parser.ts │                                            
  └─────────────────────────────┴──────────────────────────────────────────────────┘                                            
                                                                                                                              
  Kiến trúc autoDetect.ts                                                                                                       
                                                                                                                              
  detectShotlistFields(tramline, pageLines)     ← entry point duy nhất                                                        
      │                                                                                                                         
      ├── filterStraightLines()                 ← Quy Tắc Vàng: chỉ lấy text trong segments straight
      │                                                                                                                         
      └── parseScreenplayContent()             ← State machine: action/char_cue/parenthetical/dialogue                        
              │                                                                                                                 
              ├── detectLineType()             ← X-coordinate + regex classifier                                              
              │       ├── x > 215px → character_cue (center-indented)                                                           
              │       ├── x < 175px → action/scene_header                                                                       
              │       └── regex → scene_header / transition / parenthetical                                                     
              │                                                                                                                 
              ├── parseSceneHeaderText()       ← Regex Scene# · INT/EXT · LOCATION · DAY/NIGHT                                  
              │       └── 8/8 test cases pass (EN + VN formats)                                                                 
              │                                                                                                                 
              └── extractSubjectsFromText()    ← ALL-CAPS names, 3-layer filter                                                 
                      ├── EXCLUDED_CAPS stop-words                                                                              
                      ├── LOCATION_PHRASE_PREFIXES (exact match)                                                                
                      ├── Look-ahead partial location ("VĂN" + "PHÒNG" → skip)                                                  
                      └── Orphan-after-excluded ("PHÒNG" + "HỌP" → skip HỌP)                                                    
                                                                                                                                
  Regex coverage mới (so với v1)                                                                                                
                                                                                                                                
  ┌───────────────────────────┬────────────────┬─────────┐                                                                      
  │          Pattern          │       v1       │   v2    │                                                                    
  ├───────────────────────────┼────────────────┼─────────┤                                                                      
  │ SÁNG SỚM, CHIỀU TỐI       │ ✗              │ ✓       │                                                                    
  ├───────────────────────────┼────────────────┼─────────┤                                                                    
  │ HOÀNG HÔN, BÌNH MINH      │ ✗              │ ✓       │                                                                      
  ├───────────────────────────┼────────────────┼─────────┤                                                                      
  │ I/E, E/I (INT/EXT hybrid) │ partial        │ ✓       │                                                                      
  ├───────────────────────────┼────────────────┼─────────┤                                                                      
  │ SCENE 12B. prefix         │ ✗              │ ✓       │                                                                    
  ├───────────────────────────┼────────────────┼─────────┤                                                                      
  │ VĂN vs VĂN PHÒNG          │ false positive │ ✓ fixed │                                                                    
  ├───────────────────────────┼────────────────┼─────────┤                                                                      
  │ Orphan word sau excluded  │ false positive │ ✓ fixed │                                                                    
  └───────────────────────────┴────────────────┴─────────┘      