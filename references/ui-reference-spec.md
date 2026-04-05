# UI Reference Spec — StudioBinder × Scriptation × Script Evolution
## Dành cho Line Script App — Tài liệu mô tả giao diện để AI implement

> **Nguyên tắc áp dụng:**
> - StudioBinder → mode **Breakdown** (tab breakdown trong Line Script App)
> - Scriptation + Script Evolution → mode **Line Script** + **Shotlist** (kết hợp cả 3)

---

## PHẦN 1: STUDIOBINDER — BREAKDOWN MODE

### 1.1 Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP NAV BAR (height: 56px, bg: #1a1a2e, position: fixed)     │
│  ┌──────┐  ┌──────────────────┐  ┌─────┐  ┌──────┐  ┌──────┐ │
│  │ Logo │  │ Project Selector │  │Write│  │Break │  │Plan  │ │
│  │      │  │    ▼ dropdown    │  │down │  │ down │  │      │ │
│  └──────┘  └──────────────────┘  └─────┘  └──────┘  └──────┘ │
│                                           ▲ active             │
│                                          (accent underline)    │
└─────────────────────────────────────────────────────────────────┘
```

**CSS tương đương:**
```css
.top-nav {
  display: flex;
  align-items: center;
  height: 56px;
  background: #1a1a2e;
  color: white;
  padding: 0 16px;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
}
.nav-tab.active {
  border-bottom: 3px solid #e74c3c; /* StudioBinder accent red */
}
```

### 1.2 Breakdown Page — Split Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                          TOP NAV                                │
├─────────────────────────────┬───────────────────────────────────┤
│                             │                                   │
│   SCRIPT PANEL (LEFT)       │   BREAKDOWN PANEL (RIGHT)        │
│   width: 55% | resizable    │   width: 45% | resizable         │
│                             │                                   │
│  ┌───────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ Scene Header Bar      │  │  │ Scene Title + Scene #       │ │
│  │ "Sc 1 - INT. HOUSE"  │  │  │ ┌───────────────────────┐   │ │
│  │ ◄ prev | # | next ►  │  │  │ │ CAST          (red)   │   │ │
│  └───────────────────────┘  │  │ │ • Nhân vật A  #1      │   │ │
│                             │  │ │ • Nhân vật B  #2      │   │ │
│  ┌───────────────────────┐  │  │ └───────────────────────┘   │ │
│  │                       │  │  │ ┌───────────────────────┐   │ │
│  │   SCRIPT TEXT         │  │  │ │ PROPS        (purple) │   │ │
│  │                       │  │  │ │ • Điện thoại          │   │ │
│  │   Highlighted words   │  │  │ │ • Cốc cà phê         │   │ │
│  │   with category       │  │  │ └───────────────────────┘   │ │
│  │   colors (see 1.3)    │  │  │ ┌───────────────────────┐   │ │
│  │                       │  │  │ │ WARDROBE     (orange) │   │ │
│  │   User selects text   │  │  │ │ • Áo sơ mi trắng     │   │ │
│  │   → context menu      │  │  │ └───────────────────────┘   │ │
│  │   appears to tag      │  │  │ ┌───────────────────────┐   │ │
│  │                       │  │  │ │ SET DRESSING (green)  │   │ │
│  │                       │  │  │ │ • Bàn gỗ              │   │ │
│  │                       │  │  │ └───────────────────────┘   │ │
│  │                       │  │  │                             │ │
│  └───────────────────────┘  │  │  + Add Element button       │ │
│                             │  └─────────────────────────────┘ │
├─────────────────────────────┴───────────────────────────────────┤
│  BOTTOM BAR: Scene list thumbnails (horizontal scroll)         │
└─────────────────────────────────────────────────────────────────┘
```

**React component structure:**
```tsx
<BreakdownPage>
  <ResizableSplitPane defaultSplit={55}>
    {/* LEFT: Script with tagging */}
    <ScriptPanel>
      <SceneNavigator currentScene={scene} onNavigate={setScene} />
      <ScriptTextView
        scriptId={scriptId}
        pageNumber={pageNum}
        highlightedElements={elements}  // array of tagged elements
        onTextSelect={handleTagElement}  // user selects text → show dropdown
      />
    </ScriptPanel>

    {/* RIGHT: Breakdown sheet */}
    <BreakdownPanel>
      <SceneHeader scene={scene} />
      <ElementCategoryList>
        {categories.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}            // { name, color, elements[] }
            borderLeftColor={cat.color}
            onAddElement={handleAdd}
            onRemoveElement={handleRemove}
          />
        ))}
      </ElementCategoryList>
      <AddElementButton onClick={showElementModal} />
    </BreakdownPanel>
  </ResizableSplitPane>
</BreakdownPage>
```

### 1.3 Element Category Colors (Industry Standard)

```typescript
const BREAKDOWN_CATEGORIES = [
  { id: 'cast',           name: 'Cast',            color: '#E74C3C', bgHighlight: 'rgba(231,76,60,0.25)' },
  { id: 'extras',         name: 'Extras',          color: '#F39C12', bgHighlight: 'rgba(243,156,18,0.25)' },
  { id: 'props',          name: 'Props',           color: '#9B59B6', bgHighlight: 'rgba(155,89,182,0.25)' },
  { id: 'wardrobe',       name: 'Wardrobe',        color: '#E67E22', bgHighlight: 'rgba(230,126,34,0.25)' },
  { id: 'makeup_hair',    name: 'Makeup/Hair',     color: '#E91E63', bgHighlight: 'rgba(233,30,99,0.25)' },
  { id: 'vehicles',       name: 'Vehicles',        color: '#FF9800', bgHighlight: 'rgba(255,152,0,0.25)' },
  { id: 'set_dressing',   name: 'Set Dressing',    color: '#27AE60', bgHighlight: 'rgba(39,174,96,0.25)' },
  { id: 'greenery',       name: 'Greenery',        color: '#2ECC71', bgHighlight: 'rgba(46,204,113,0.25)' },
  { id: 'special_effects',name: 'Special Effects',  color: '#3498DB', bgHighlight: 'rgba(52,152,219,0.25)' },
  { id: 'vfx',            name: 'VFX',             color: '#2980B9', bgHighlight: 'rgba(41,128,185,0.25)' },
  { id: 'sound',          name: 'Sound',           color: '#1ABC9C', bgHighlight: 'rgba(26,188,156,0.25)' },
  { id: 'stunts',         name: 'Stunts',          color: '#E74C3C', bgHighlight: 'rgba(231,76,60,0.25)' },
  { id: 'animals',        name: 'Animals',         color: '#F1C40F', bgHighlight: 'rgba(241,196,15,0.25)' },
  { id: 'music',          name: 'Music',           color: '#8E44AD', bgHighlight: 'rgba(142,68,173,0.25)' },
  { id: 'notes',          name: 'Notes',           color: '#95A5A6', bgHighlight: 'rgba(149,165,166,0.25)' },
] as const;
```

### 1.4 Tagging Interaction (Context Menu khi Select Text)

```
User selects "điện thoại" trên script text
          ↓
┌─────────────────────────┐
│  Tag as:                │  ← dropdown/popover
│  ┌─ ● Cast          ─┐ │
│  │  ● Extras          │ │
│  │  ● Props       ←───┤─── user clicks
│  │  ● Wardrobe        │ │
│  │  ● Set Dressing    │ │
│  │  ● Special Effects │ │
│  │  ● ...             │ │
│  └────────────────────┘ │
│  [+ New Category]       │
└─────────────────────────┘
          ↓
"điện thoại" gets highlighted in Props purple color
AND appears in Breakdown Panel → Props section
```

**Implementation:**
```tsx
// Khi user select text trên script
const handleTextSelect = (selectedText: string, position: { x: number, y: number }) => {
  setContextMenu({
    visible: true,
    text: selectedText,
    position,
    categories: BREAKDOWN_CATEGORIES,
  });
};

// Khi user chọn category
const handleTagElement = (text: string, categoryId: string) => {
  // 1. Highlight text trong script view
  addHighlight({ text, categoryId, color: category.bgHighlight });
  // 2. Add element to breakdown panel
  addElement({ name: text, categoryId, sceneId: currentScene.id });
  // 3. Save to API
  api.post('/elements', { text, categoryId, sceneId, scriptId });
};
```

### 1.5 Scene Navigator

```
┌──────────────────────────────────────────────┐
│  ◄  │  Scene 3 of 42  │  ►                  │
│     │ INT. NHÀ BẾP - ĐÊM                    │
│     │ Pages: 5-7 | 2 4/8 pages               │
├──────────────────────────────────────────────┤
│ Filter: [All] [Tagged] [Untagged]  🔍 Search │
└──────────────────────────────────────────────┘
```

### 1.6 Elements Manager (Sidebar/Modal)

```
┌──────────────────────────────────────┐
│  ELEMENTS MANAGER            🔍     │
│  ─────────────────────────────────── │
│  Total: 127 elements                │
│                                      │
│  ▼ Cast (12)                         │
│    ┌────────────────────────────┐    │
│    │ #1 Nhân vật A   Sc: 1-42  │    │
│    │ #2 Nhân vật B   Sc: 1,3,5 │    │
│    │ ...                        │    │
│    └────────────────────────────┘    │
│                                      │
│  ▼ Props (23)                        │
│    ┌────────────────────────────┐    │
│    │ Điện thoại      Sc: 1,5   │    │
│    │ Cốc cà phê      Sc: 3     │    │
│    │ ...                        │    │
│    └────────────────────────────┘    │
│                                      │
│  ► Wardrobe (8)                      │
│  ► Set Dressing (15)                 │
│  ...                                 │
│                                      │
│  [Export CSV] [Export PDF]            │
└──────────────────────────────────────┘
```

---

## PHẦN 2: SCRIPTATION — LINE SCRIPT MODE

### 2.1 Layout tổng thể (iPad Landscape)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP TOOLBAR (height: 44px, bg: #333)                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌────┐ │
│  │ ☰  │ │ ✏️ │ │ 🖍 │ │ 📌 │ │ 🏷 │ │LINE │ │LAYERS│ │ ⋯ │ │
│  │Menu│ │Pen │ │High│ │Note│ │Tag │ │TOOL│ │      │ │More│ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └─────┘ └──────┘ └────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    PDF SCRIPT PAGE                              │
│                    (full viewport)                               │
│                                                                 │
│    ┌─────────────────────────────────────────────────┐          │
│    │  Sc 1 - INT. NHÀ - ĐÊM                         │          │
│    │                                                  │          │
│    │  ║  │  ┃  │  ╏     ← tramlines (vertical)      │          │
│    │  ║  │  ┃  │  ╏                                   │          │
│    │  ║  │  ┃  │  ╏     ║ = solid line (on camera)   │          │
│    │  ║  │  ┃  │  ╏     ╏ = squiggle (off camera)    │          │
│    │  ║  │  ┃  │  ╏                                   │          │
│    │  ║  │  ┃  │  ╏     Each line has a SLATE HEADER │          │
│    │  ║  │  ┃  │  ╏     at top: "1A" "2A" "3B" etc   │          │
│    │  ║  │  ┃  │  ╏                                   │          │
│    │  ║  │  ┃  │  ╏     Lines can be SPLIT           │          │
│    │  ║  │  ┃  │  ╏     with different styles        │          │
│    │  ║  │  ┃  │  ╏     per segment                   │          │
│    │                                                  │          │
│    └─────────────────────────────────────────────────┘          │
│                                                                 │
│  Page 5 of 42                              [◄] [►]             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Lining Tool — Sidebar (khi bấm LINE TOOL)

```
┌──────────────────────────────────────┐
│  LINING                        ✕    │
│  ─────────────────────────────────── │
│                                      │
│  Scene: [Sc 1 - INT. NHÀ - ĐÊM ▼] │  ← auto-detected scenes dropdown
│                                      │
│  Slate: [1A_____________]            │  ← editable text field
│                                      │
│  Camera: [A ▼]  [B] [C] [D]         │  ← multi-camera toggle buttons
│                                      │
│  Color: [🟥][🟦][🟩][🟨][⬛][🟪]   │  ← color picker dots
│         [Custom...]                   │
│                                      │
│  Characters:                          │
│  ┌────────────────────────────────┐  │
│  │ ☑ NHÂN VẬT A  ── (straight)  │  │  ← toggle ON = straight line
│  │ ☐ NHÂN VẬT B  ∿∿ (squiggle) │  │  ← toggle OFF = squiggle
│  │ ☐ NHÂN VẬT C  ∿∿ (squiggle) │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌──────────────────────────────┐    │
│  │       [GENERATE]             │    │  ← auto-generate tramlines
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**React implementation:**
```tsx
<LiningSidebar>
  <SceneDropdown
    scenes={detectedScenes}         // auto-parsed from PDF text
    selected={currentScene}
    onChange={setCurrentScene}
  />

  <SlateInput
    value={slateName}               // "1A", "2A", etc.
    onChange={setSlateName}
  />

  <CameraSelector
    cameras={['A','B','C','D']}
    selected={selectedCameras}       // multi-select
    onChange={setSelectedCameras}
  />

  <ColorPicker
    colors={['#E74C3C','#3498DB','#27AE60','#F1C40F','#000','#9B59B6']}
    selected={lineColor}
    onChange={setLineColor}
    allowCustom={true}
  />

  <CharacterToggles>
    {characters.map(char => (
      <CharacterToggle
        key={char.id}
        name={char.name}
        isOnCamera={char.isOnCamera}   // true = straight, false = squiggle
        onToggle={() => toggleCharacter(char.id)}
      />
    ))}
  </CharacterToggles>

  <GenerateButton onClick={generateTramlines} />
</LiningSidebar>
```

### 2.3 Tramline Rendering (Fabric.js trên canvas)

```typescript
// Tramline types
type TramlineStyle = 'straight' | 'squiggle' | 'dirty';

interface TramlineSegment {
  id: string;
  slateId: string;
  style: TramlineStyle;        // straight = on camera, squiggle = off camera
  color: string;               // hex color
  xPosition: number;           // normalized 0-1 (% from left edge)
  yStart: number;              // normalized 0-1 (% from top)
  yEnd: number;                // normalized 0-1 (% from bottom)
  lineWidth: number;           // default 2px
  splitPoints: number[];       // y positions where style changes
}

interface Slate {
  id: string;
  name: string;                // "1A", "2B", etc.
  sceneId: string;
  cameraId: string;            // 'A' | 'B' | 'C' | 'D'
  color: string;
  segments: TramlineSegment[];
  arrowIn: boolean;            // incoming arrow (multi-scene continuation)
  arrowOut: boolean;           // outgoing arrow
}

// Fabric.js rendering
function renderTramline(canvas: fabric.Canvas, segment: TramlineSegment, pageHeight: number, pageWidth: number) {
  const x = segment.xPosition * pageWidth;
  const yStart = segment.yStart * pageHeight;
  const yEnd = segment.yEnd * pageHeight;

  if (segment.style === 'straight') {
    // Solid vertical line = character is ON CAMERA
    const line = new fabric.Line([x, yStart, x, yEnd], {
      stroke: segment.color,
      strokeWidth: segment.lineWidth,
      selectable: true,
      data: { type: 'tramline', segmentId: segment.id },
    });
    canvas.add(line);

  } else if (segment.style === 'squiggle') {
    // Wavy/squiggle line = character is OFF CAMERA
    const points = generateSquigglePoints(x, yStart, yEnd, amplitude: 4, frequency: 8);
    const path = new fabric.Path(pointsToSVGPath(points), {
      stroke: segment.color,
      strokeWidth: segment.lineWidth,
      fill: 'transparent',
      selectable: true,
      data: { type: 'tramline', segmentId: segment.id },
    });
    canvas.add(path);
  }
}

// Squiggle path generator
function generateSquigglePoints(x: number, yStart: number, yEnd: number, amplitude: number, frequency: number): string {
  let path = `M ${x} ${yStart}`;
  const length = yEnd - yStart;
  const steps = Math.floor(length / frequency);

  for (let i = 1; i <= steps; i++) {
    const y = yStart + (i * frequency);
    const xOffset = (i % 2 === 0) ? amplitude : -amplitude;
    path += ` Q ${x + xOffset} ${y - frequency/2} ${x} ${y}`;
  }
  return path;
}
```

### 2.4 Slate Header (trên đỉnh mỗi tramline)

```
          ┌─────┐
          │ 1A  │  ← Slate header badge
          ├─────┤
          │     │
          ║     │  ← tramline extends down
          ║     │
```

```tsx
// Slate header badge component
<SlateHeaderBadge
  style={{
    position: 'absolute',
    left: `${xPosition}px`,
    top: `${yStart - 24}px`,    // above the tramline
    width: '36px',
    height: '20px',
    backgroundColor: lineColor,
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: '20px',
    borderRadius: '3px',
    cursor: 'pointer',
    zIndex: 10,
  }}
  onClick={() => openSlateMenu(slate)}
>
  {slate.name}
</SlateHeaderBadge>
```

### 2.5 Tramline Edit Menu (tap trên segment)

```
┌─────────────────────────────────┐
│  Line Segment Options           │
│  ───────────────────────────── │
│  Style: [Straight] [Squiggle] [Dirty] │
│                                  │
│  ┌─ Split Here ─┐               │  ← split 1 segment thành 2
│  ├─ Move Start ─┤               │  ← drag yStart lên/xuống
│  ├─ Move End   ─┤               │  ← drag yEnd lên/xuống
│  ├─ Change Color ┤              │
│  ├─ Duplicate   ─┤              │
│  └─ Delete      ─┘              │
└─────────────────────────────────┘
```

### 2.6 Layers System

```typescript
interface Layer {
  id: string;
  name: string;             // "Lining", "Director Notes", "Camera Notes"
  visible: boolean;         // toggle show/hide
  locked: boolean;          // prevent edits
  type: 'lining' | 'annotation' | 'info';
  color: string;            // layer indicator color
  annotations: Annotation[];
}

// Layer panel UI
// ┌──────────────────────────────┐
// │ LAYERS                   ✕  │
// │ ─────────────────────────── │
// │ 👁 🔒 ● Lining          ← │  active layer (highlighted bg)
// │ 👁 🔓 ● Director Notes     │
// │ 👁 🔓 ● Camera Notes       │
// │ 🚫 🔓 ● Sound Notes        │  ← hidden (eye crossed)
// │                              │
// │ [+ Add Layer]                │
// └──────────────────────────────┘
```

### 2.7 Annotation Toolbar (Scriptation-style)

```
┌──────────────────────────────────────────────┐
│  ANNOTATION TOOLS                             │
│                                               │
│  ✏️ Pen     │ Size: [1][2][3][4][5]           │
│  🖍 Highlight│ Colors: ⬛🟥🟦🟩🟡🟪        │
│  📝 Text    │ Opacity: ████████░░ 80%        │
│  📌 Sticky  │                                 │
│  ↗️ Arrow   │                                 │
│  ⭕ Shape   │ [□ Rectangle] [○ Ellipse]       │
│  📷 Photo   │                                 │
│  🎤 Audio   │                                 │
│                                               │
│  ↩️ Undo    ↪️ Redo   🗑 Delete Selected      │
└──────────────────────────────────────────────┘
```

```tsx
type AnnotationTool =
  | 'pen'          // freehand drawing (Apple Pencil optimized)
  | 'highlight'    // text highlight (recognizes text bounds)
  | 'text'         // text box
  | 'sticky'       // sticky note (icon + hidden text)
  | 'arrow'        // directional arrow
  | 'rectangle'    // shape
  | 'ellipse'      // shape
  | 'photo'        // insert image
  | 'audio';       // record audio note

interface AnnotationToolConfig {
  tool: AnnotationTool;
  color: string;
  opacity: number;        // 0-1
  strokeWidth: number;    // 1-5
  fontSize?: number;      // for text tool
}
```

---

## PHẦN 3: SCRIPT EVOLUTION — DATA LOGGING MODE

### 3.1 Layout chính (iPad)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR: Project Name + Shooting Day selector                  │
│  [◄ Day 1] [Day 2] [Day 3 ►]   │ Episode: [Ep 1 ▼]           │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│   SCRIPT PDF VIEW    │   SHOT / TAKE PANEL                     │
│   (LEFT 50%)         │   (RIGHT 50%)                           │
│                      │                                          │
│   ┌──────────────┐   │   ┌────────────────────────────────┐    │
│   │              │   │   │ Scene: [Sc 1 ▼]                │    │
│   │   PDF page   │   │   │ Shot:  [1A___] Camera: [A ▼]   │    │
│   │   with       │   │   │ Description: [WS - Living rm]  │    │
│   │   lining     │   │   │                                 │    │
│   │   overlay    │   │   │ ─── TAKES ─────────────────── │    │
│   │              │   │   │ T1  00:42  ✓  "Good take"      │    │
│   │              │   │   │ T2  00:38  ✗  "Boom in frame"  │    │
│   │              │   │   │ T3  00:45  ✓✓ "Print!"         │    │
│   │              │   │   │                                 │    │
│   │              │   │   │ [▶ START TAKE]                  │    │  ← timer
│   │              │   │   │                                 │    │
│   │              │   │   │ Camera: A     Roll: 12          │    │
│   │              │   │   │ Lens: 50mm    T-Stop: 2.8       │    │
│   │              │   │   │ Filter: ND6                     │    │
│   └──────────────┘   │   │                                 │    │
│                      │   │ Notes: [_________________]      │    │
│                      │   └────────────────────────────────┘    │
│                      │                                          │
│  [Pg 5/42]           │   [+ New Shot]  [Generate Reports]      │
└──────────────────────┴──────────────────────────────────────────┘
```

### 3.2 Take Logging Flow

```typescript
interface ShootingDay {
  id: string;
  dayNumber: number;
  date: string;                  // ISO date
  scenes: SceneInDay[];
  firstShot: string;             // timestamp
  lunchIn: string;
  lunchOut: string;
  lastShot: string;
  wrap: string;
}

interface Shot {
  id: string;
  sceneId: string;
  slateName: string;             // "1A", "2B"
  cameraIds: string[];           // ['A', 'B'] for multi-cam
  description: string;           // "WS - Living room"
  shotSize: ShotSize;
  takes: Take[];
}

interface Take {
  id: string;
  shotId: string;
  takeNumber: number;
  duration: number;              // seconds (auto-timed)
  isCircled: boolean;            // circled = print / good take
  isPrint: boolean;              // double-circled = definitely use
  cameraInfo: CameraInfo;
  notes: string;
  startTimecode: string;
  endTimecode: string;
}

interface CameraInfo {
  cameraId: string;              // 'A' | 'B' | 'C'
  roll: string;                  // camera roll number
  clipNumber: number;            // auto-increment per camera
  lens: string;                  // "50mm"
  tStop: string;                 // "2.8"
  filter: string;                // "ND6"
  iso: number;
  focalLength: string;
}

type ShotSize = 'EWS' | 'WS' | 'FS' | 'MWS' | 'MS' | 'MCU' | 'CU' | 'ECU' | 'INSERT' | 'OTS' | '2S' | '3S' | 'GS';
```

### 3.3 Lining trên Script (Script Evolution style)

```
Khác với Scriptation (generate tự động), Script Evolution
cho phép VẼ TAY tramlines trực tiếp lên PDF bằng ngón tay:

1. Chọn Shot (ví dụ: "1A")
2. Chạm điểm đầu trên script page
3. Kéo xuống điểm cuối
4. Line tự động snap to vertical
5. Tạo slate header ở trên cùng
6. Chuyển solid ↔ squiggle bằng tap segment
```

### 3.4 Report Generation

```
Script Evolution auto-generates các report sau:
┌─────────────────────────────────────────────┐
│  REPORTS                             📤     │
│  ─────────────────────────────────────────  │
│                                              │
│  📄 Production Report    [View] [Export PDF] │
│  📄 Editing Report       [View] [Export PDF] │
│  📄 Facing Pages         [View] [Export PDF] │
│  📄 Lined Script         [View] [Export PDF] │
│  📄 Log Report           [View] [Export PDF] │
│  📄 Wild Tracks          [View] [Export PDF] │
│  📄 Picture Report       [View] [Export PDF] │
│                                              │
│  [📦 Export All as ZIP]                      │
│  [📧 Email Reports]                         │
└─────────────────────────────────────────────┘
```

---

## PHẦN 4: KẾT HỢP — LINE SCRIPT APP UI

### 4.1 Tab Navigation (3 main modes)

```
┌─────────────────────────────────────────────────────────────────┐
│  LINE SCRIPT APP                                                │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐                  │
│  │ 🏷 BREAK  │  │ ✏️ LINE    │  │ 📋 SHOT  │                  │
│  │   DOWN    │  │  SCRIPT   │  │  LIST    │                  │
│  │ (Studio   │  │ (Scriptat │  │ (cả 3    │                  │
│  │  Binder   │  │ ion+Evol) │  │  kết hợp)│                  │
│  │  style)   │  │           │  │          │                  │
│  └───────────┘  └────────────┘  └──────────┘                  │
│       ▲ active tab has accent border-bottom                    │
└─────────────────────────────────────────────────────────────────┘
```

```tsx
// Main App Layout
<AppShell>
  <TopNavbar>
    <Logo />
    <ProjectSelector />
    <TabBar>
      <Tab id="breakdown" icon={<TagIcon />} label="Breakdown" />
      <Tab id="linescript" icon={<PenIcon />} label="Line Script" />
      <Tab id="shotlist" icon={<ListIcon />} label="Shotlist" />
    </TabBar>
    <UserMenu />
  </TopNavbar>

  <MainContent>
    {activeTab === 'breakdown' && <BreakdownMode />}    {/* StudioBinder style */}
    {activeTab === 'linescript' && <LineScriptMode />}   {/* Scriptation + ScriptEvolution */}
    {activeTab === 'shotlist' && <ShotlistMode />}       {/* Combined */}
  </MainContent>
</AppShell>
```

### 4.2 BREAKDOWN MODE (StudioBinder-inspired)

```tsx
<BreakdownMode>
  <ResizableSplitPane direction="horizontal" defaultSplit={55}>
    {/* LEFT: PDF with taggable text */}
    <PDFScriptView
      pdfUrl={scriptPdfUrl}
      renderMode="text-selectable"        // PDF.js text layer ON
      highlights={breakdownHighlights}     // colored overlays on tagged text
      onTextSelect={(text, rect) => showTagDropdown(text, rect)}
    />

    {/* RIGHT: Breakdown sheet per scene */}
    <BreakdownSheet>
      <SceneSelector scenes={scenes} current={currentScene} />
      <SceneMetadata>
        <Field label="INT/EXT" value={scene.intExt} />
        <Field label="Location" value={scene.location} />
        <Field label="Day/Night" value={scene.dayNight} />
        <Field label="Pages" value={scene.pageCount} />
        <Field label="Est. Time" value={scene.estimatedTime} />
      </SceneMetadata>

      <CategoryGrid>
        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            title={cat.name}
            borderColor={cat.color}
            items={elementsForScene.filter(e => e.categoryId === cat.id)}
            onAdd={() => openAddElementModal(cat.id)}
            onRemove={(elementId) => removeElement(elementId)}
          />
        ))}
      </CategoryGrid>
    </BreakdownSheet>
  </ResizableSplitPane>
</BreakdownMode>
```

### 4.3 LINE SCRIPT MODE (Scriptation + Script Evolution hybrid)

```tsx
<LineScriptMode>
  {/* Full-page PDF with Fabric.js canvas overlay */}
  <PDFCanvasViewer
    pdfUrl={scriptPdfUrl}
    renderMode="image"                    // PDF.js render to canvas (no text layer)
    fabricCanvas={fabricCanvasRef}
  >
    {/* Toolbar floats on top */}
    <FloatingToolbar position="top">
      <ToolGroup label="Draw">
        <ToolButton icon="pen" active={tool === 'pen'} />
        <ToolButton icon="highlight" active={tool === 'highlight'} />
        <ToolButton icon="eraser" active={tool === 'eraser'} />
      </ToolGroup>

      <ToolGroup label="Line Script">
        <ToolButton icon="tramline" active={tool === 'tramline'} />
        <ToolButton icon="slate" label="Add Slate" />
      </ToolGroup>

      <ToolGroup label="Style">
        <ColorPicker colors={lineColors} selected={currentColor} />
        <LineStylePicker styles={['solid','dashed','squiggle']} />
        <StrokeWidthPicker values={[1,2,3,4]} />
      </ToolGroup>

      <ToolGroup label="Actions">
        <UndoButton />
        <RedoButton />
        <LayerSwitcher layers={layers} />
      </ToolGroup>
    </FloatingToolbar>

    {/* Lining sidebar (toggle) */}
    <LiningSidebar visible={showLiningSidebar}>
      <SceneDropdown scenes={autoDetectedScenes} />
      <SlateNameInput />
      <CameraButtons cameras={['A','B','C','D']} />
      <ColorSwatches />
      <CharacterToggles characters={sceneCharacters}>
        {/* Toggle = straight (on cam) or squiggle (off cam) */}
      </CharacterToggles>
      <GenerateTramlines onClick={autoGenerateTramlines} />
    </LiningSidebar>
  </PDFCanvasViewer>

  {/* Shot data panel (collapsible from right) */}
  <ShotDataDrawer>
    <CurrentShotInfo shot={selectedShot}>
      <ShotSizeDropdown />
      <CameraAngleDropdown />
      <MovementDropdown />
      <LensInput />
      <NotesTextarea />
    </CurrentShotInfo>

    <TakesList takes={currentShot.takes}>
      <TakeRow take={take}>
        <TakeNumber />
        <Duration />
        <CircledBadge />     {/* tap to circle = good take */}
        <TakeNote />
      </TakeRow>
    </TakesList>

    <StartTakeButton />      {/* timer starts on tap */}
  </ShotDataDrawer>
</LineScriptMode>
```

### 4.4 SHOTLIST MODE (Combined table view)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SHOTLIST — Ba Ơi, Đừng Nói Dối                   [Export ▼] [Share 🔗]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filter: [All Scenes ▼] [All Sizes ▼]  🔍 Search    [Group by Scene]     │
├─────┬──────┬───────┬──────┬──────────────────┬──────┬──────┬──────┬───────┤
│  #  │Scene │Slate  │Size  │Description       │Angle │Move  │Lens  │Notes  │
├─────┼──────┼───────┼──────┼──────────────────┼──────┼──────┼──────┼───────┤
│  1  │Sc 1  │ 1A    │ WS   │Establishing shot │Eye   │Static│24mm  │       │
│  2  │Sc 1  │ 1B    │ MS   │Dad at table      │Eye   │Dolly │50mm  │Slow   │
│  3  │Sc 1  │ 1C    │ CU   │Dad's hands       │High  │Static│85mm  │Detail │
│  4  │Sc 1  │ 1D    │ OTS  │Over son's shldr  │Eye   │Static│50mm  │       │
│  5  │Sc 2  │ 2A    │ WS   │Kitchen wide      │Low   │Pan   │35mm  │       │
│ ... │ ...  │ ...   │ ...  │ ...              │ ...  │ ...  │ ...  │ ...   │
├─────┴──────┴───────┴──────┴──────────────────┴──────┴──────┴──────┴───────┤
│  Total: 42 shots │ 12 scenes │ Est. time: 3h 20m                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

```tsx
<ShotlistMode>
  <ShotlistToolbar>
    <SceneFilter />
    <ShotSizeFilter />
    <SearchInput />
    <GroupByToggle options={['scene', 'day', 'location']} />
    <ExportDropdown formats={['xlsx', 'csv', 'pdf']} />
    <ShareButton />
  </ShotlistToolbar>

  <ShotlistTable
    columns={[
      { key: 'shotNumber', label: '#', width: 50, sortable: true },
      { key: 'sceneNumber', label: 'Scene', width: 70, sortable: true },
      { key: 'slateName', label: 'Slate', width: 70, editable: true },
      { key: 'shotSize', label: 'Size', width: 80, editable: true,
        type: 'dropdown', options: SHOT_SIZES },
      { key: 'description', label: 'Description', width: 200, editable: true },
      { key: 'angle', label: 'Angle', width: 80, editable: true,
        type: 'dropdown', options: ANGLES },
      { key: 'movement', label: 'Movement', width: 80, editable: true,
        type: 'dropdown', options: MOVEMENTS },
      { key: 'lens', label: 'Lens', width: 70, editable: true },
      { key: 'notes', label: 'Notes', width: 150, editable: true },
    ]}
    data={shots}
    onRowClick={(shot) => navigateToLineInPDF(shot)}  // click → jump to PDF
    onCellEdit={(shotId, field, value) => updateShot(shotId, field, value)}
    sortable={true}
    reorderable={true}      // drag to reorder
  />

  <ShotlistFooter>
    <TotalShots count={shots.length} />
    <TotalScenes count={uniqueScenes} />
    <EstimatedTime time={totalEstTime} />
  </ShotlistFooter>
</ShotlistMode>
```

### 4.5 Dropdown Options Constants

```typescript
const SHOT_SIZES = [
  'EWS', 'WS', 'FS', 'MWS', 'MS', 'MCU', 'CU', 'BCU', 'ECU',
  'INSERT', 'OTS', '2S', '3S', 'GS', 'POV', 'AERIAL',
] as const;

const ANGLES = [
  'Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle',
  'Bird\'s Eye', 'Worm\'s Eye', 'Over Shoulder',
] as const;

const MOVEMENTS = [
  'Static', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down',
  'Dolly In', 'Dolly Out', 'Dolly Left', 'Dolly Right',
  'Truck', 'Pedestal', 'Crane Up', 'Crane Down',
  'Steadicam', 'Handheld', 'Zoom In', 'Zoom Out',
  'Rack Focus', 'Follow', 'Arc',
] as const;

const CAMERA_TYPES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// Tramline line styles
const LINE_STYLES = [
  { id: 'solid', label: 'Solid (On Camera)', dashArray: null },
  { id: 'dashed', label: 'Dashed', dashArray: [8, 4] },
  { id: 'squiggle', label: 'Squiggle (Off Camera)', pathType: 'wavy' },
  { id: 'dirty', label: 'Dirty (Partial)', dashArray: [2, 6] },
] as const;
```

### 4.6 Responsive Breakpoints

```css
/* Mobile first — default is mobile */
/* iPad portrait */
@media (min-width: 768px) {
  .split-pane { flex-direction: row; }
  .sidebar { width: 320px; }
}

/* iPad landscape / Desktop */
@media (min-width: 1024px) {
  .pdf-viewer { flex: 3; }
  .side-panel { flex: 2; }
}

/* Large desktop */
@media (min-width: 1440px) {
  .shotlist-table { max-width: 1200px; margin: 0 auto; }
}
```

### 4.7 Color Theme

```css
:root {
  /* Primary */
  --color-primary: #E74C3C;         /* Red — matches StudioBinder accent */
  --color-primary-dark: #C0392B;
  --color-primary-light: #F5B7B1;

  /* Dark UI (default for production apps) */
  --bg-app: #1a1a2e;
  --bg-surface: #16213e;
  --bg-card: #0f3460;
  --bg-input: #1e2a4a;
  --text-primary: #ECEFF4;
  --text-secondary: #8899AA;
  --border-color: #2a3a5e;

  /* Light mode option */
  --bg-app-light: #F7F8FA;
  --bg-surface-light: #FFFFFF;
  --text-primary-light: #2C3E50;
  --text-secondary-light: #7F8C8D;

  /* Breakdown category colors — see BREAKDOWN_CATEGORIES above */
  /* Tramline colors */
  --tramline-red: #E74C3C;
  --tramline-blue: #3498DB;
  --tramline-green: #27AE60;
  --tramline-yellow: #F1C40F;
  --tramline-black: #2C3E50;
  --tramline-purple: #9B59B6;
}
```

---

## PHẦN 5: DATA FLOW DIAGRAM

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  BREAKDOWN   │     │ LINE SCRIPT  │     │   SHOTLIST    │
│    MODE      │     │    MODE      │     │    MODE       │
│              │     │              │     │               │
│ Select text  │     │ Draw tramline│     │ View/edit     │
│ → Tag element│     │ → Auto-create│────►│ all shots     │
│ → Save to DB │     │   shot entry │     │ from script   │
│              │     │              │     │               │
│ Elements go  │     │ Slate info   │     │ Click row →   │
│ to breakdown │     │ + text extract│    │ jump to PDF   │
│ per scene    │     │ = shot data  │     │ page + line   │
└──────┬───────┘     └──────┬───────┘     └───────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                   CLOUDFLARE D1 DATABASE                │
│                                                         │
│  elements table ← breakdown data                       │
│  script_lines table ← tramline coordinates             │
│  shots table ← auto-generated + manually edited        │
│  annotations table ← pen/highlight/notes               │
│  takes table ← on-set logging                          │
└─────────────────────────────────────────────────────────┘
```

---

## PHẦN 6: PROMPT TỔNG HỢP CHO AI

Khi cần AI implement bất kỳ phần nào, dùng prompt sau:

```
Bạn đang xây dựng "Line Script App" — web app cho Script Supervisor
và đoàn phim indie Việt Nam.

App có 3 chế độ chính:

1. BREAKDOWN MODE (lấy cảm hứng từ StudioBinder):
   - Split panel: PDF script bên trái, breakdown sheet bên phải
   - User select text trên PDF → dropdown chọn category → text được
     highlight bằng màu tương ứng (industry-standard colors)
   - Breakdown sheet hiển thị elements grouped by category
   - Mỗi category có viền màu riêng biệt
   - Scene navigator để chuyển giữa các cảnh

2. LINE SCRIPT MODE (kết hợp Scriptation + Script Evolution):
   - PDF full-page với Fabric.js canvas overlay
   - Vẽ tramlines (đường dọc) lên script:
     * Straight line = character ON camera
     * Squiggle line = character OFF camera
   - Mỗi tramline có Slate header badge ở trên (vd: "1A", "2B")
   - Sidebar cho lining: chọn scene, đặt tên slate, chọn camera,
     toggle characters on/off camera, chọn màu
   - Nút Generate auto-tạo tramlines
   - Hỗ trợ split line (chia segment), multi-scene lining
   - Layer system: Lining layer riêng, annotation layers riêng
   - Annotation tools: pen, highlight, text, sticky note, shapes
   - Take logging: start timer, ghi take, circle good takes

3. SHOTLIST MODE (kết hợp cả 3 app):
   - Table view hiển thị tất cả shots
   - Columns: #, Scene, Slate, Size, Description, Angle, Movement,
     Lens, Notes
   - Inline editing trực tiếp trong table
   - Click row → nhảy đến line tương ứng trên PDF
   - Filter by scene, shot size, etc.
   - Export: XLSX, CSV, PDF
   - Share link (public token)

Tech stack: React 18 + TypeScript + Vite + Fabric.js + PDF.js
Backend: Cloudflare Workers + D1 + R2
```
