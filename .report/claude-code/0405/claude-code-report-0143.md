Phase 7 hoàn thành — build sạch 0 lỗi.                                                                                        
                                                                
  ---                                                                                                                           
  Tổng kết Phase 7 — Shotlist Table (Tính năng B)                                                                               
                                                                                                                                
  Files thay đổi                                                                                                                
                                                                                                                                
  ┌───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐    
  │                 File                  │                               Nội dung thay đổi                                │    
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤    
  │ lib/store/useScriptStore.ts           │ Thêm 6 field mới vào IShotlistRow: shotType, side, angle, movement, lens, note │
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤    
  │ lib/utils/stress-test.ts              │ Sinh random data cho 6 field mới                                               │  
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤    
  │ app/page.tsx                          │ MOCK_SHOTLIST cập nhật đủ 6 field                                              │    
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤    
  │ components/shotlist/ShotlistTable.tsx │ Viết lại hoàn toàn — Google Sheets layout                                      │    
  └───────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘    
                                                                                                                                
  Cấu trúc bảng mới (18 cột đúng PRD)                                                                                           
                                                                                                                                
  ┌─────────────────────────────────────────────────────────────────┐                                                           
  │  SCRIPT LINING                         ← Film title row (sticky) │                                                          
  ├────┬────────┬──────────┬───────┬───────┬─────╥────────────────────                                                          
  │ #  │SCENE # │ LOCATION │SHOT # │INT/EXT│ D/N ║ DESCRIPTION │ ...                                                            
  │    │        │          │       │       │     ║             │                                                                
  ├────┴────────┴──────────┴───────┴───────┴─────╫────────────────────                                                          
  │  ← 6 FROZEN cols (sticky left) →      ║  ← 11 cols scrollable →                                                             
                                                                                                                                
  Dropdowns chuẩn PRD                                                                                                           
                                                                                                                                
  ┌─────────┬──────────────────────────────────────────────────────────────────────────┐                                        
  │ Trường  │                                 Lựa chọn                                 │                                      
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤
  │ SIZE    │ EWS, WS, FS, MFS, MS, MCU, CU, ECU, WIDE, OTS, INSERT, Random            │
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤
  │ TYPE    │ Observe, Single, Two, Three, Four, Group, OTS, POV, Insert, B-roll       │                                        
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤                                        
  │ MOV     │ Static, Pan, Tilt, Dolly In, Dolly Out, Handheld, Steadicam, Crane, Zoom │                                        
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤                                        
  │ ANGLE   │ Eye Level, Low Angle, High Angle, Dutch, Bird's Eye, Worm's Eye          │                                      
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤                                        
  │ INT/EXT │ INT, EXT                                                                 │                                      
  ├─────────┼──────────────────────────────────────────────────────────────────────────┤                                        
  │ D/N     │ DAY, NIGHT                                                               │                                      
  └─────────┴──────────────────────────────────────────────────────────────────────────┘                                        
                                                                                                                              
  Two-way Binding

  - Edit SHOT # → sync lên ITramline.shotName qua updateShotlistRow                                                             
  - Edit SIZE → sync lên ITramline.shotSize
  - Edit bất kỳ cell khác → persist vào IShotlistRow trong Zustand store