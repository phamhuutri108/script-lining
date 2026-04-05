Build passes cleanly. The refactored useFabricCanvas.ts is complete with all Phase 9 features:                                
                                                                                                                                
  What was implemented:                                                                                                         
                                                                                                                                
  1. Module-level fabric cache (_fab) — fabric loads once on first canvas init, all subsequent renders are synchronous        
  2. renderTramlineSync — sync render function using the cached _fab:                                                           
    - Segments tagged with data: { tramlineId, type: 'segment', segmentIndex }                                                
    - Brackets tagged with data: { tramlineId, type: 'bracket', bracketIndex }                                                  
    - Active bracket gets a dashed-circle indicator (radius 14px)           
  3. renderAllSync — replaces async renderAll; uses previewTram during drag instead of Zustand state                            
  4. Split Mode enhanced (mouse:down/move/up):                                                                                  
    - Click bracket → set activeRef + start drag (dragRef)                                                                      
    - Drag bracket → applyBracketDrag updates previewTram, renderAllSync draws preview live                                     
    - mouse:up → updateTramline commits to Zustand (triggers renderAll via store subscription)                                  
    - Click empty area → deselect active                                                                                        
    - Click segment → splitSegment as before                                                                                    
    - Hover over bracket → cursor changes to grab                                                                               
  5. Keyboard Delete — document.addEventListener('keydown') in split mode: Delete/Backspace on active middle bracket →          
  mergeSegments(tramlineId, bracketIndex)                                                                                       
  6. applyBracketDrag — constraint-aware drag that clamps to BRACKET_DRAG_MIN spacing from neighbors, handles start/end/middle  
  brackets correctly                                                                                                            
                                                                                                                                
✻ Baked for 13m 55s                                                                                                             
                                                                                                                                
  1 tasks (0 done, 1 open)                                                                                                    
  ◻ Refactor useFabricCanvas: fabric cache + sync render + bracket data tags