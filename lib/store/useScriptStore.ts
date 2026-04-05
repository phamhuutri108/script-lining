import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  detectShotlistFields   as parseTramlineToShotlistData,
  reParseTramline,
  mergeAutoDetectFields  as buildAutoUpdateFields,
} from '@/lib/utils/autoDetect';
import type { TextLine } from '@/lib/hooks/usePdfTextExtraction';

// ─── Auto-Detect Scene Model (từ NotebookLM / data/script-autodetect.json) ────

export interface IAutoDetectScene {
  scene_number: string;
  int_ext: string;        // "INT" | "EXT"
  location: string;
  day_night: string;      // "DAY" | "NIGHT"
  subjects: string[];
  dialogue: string[];
}

// ─── Data Models (theo resources/data-models.md) ──────────────────────────────

export interface ILineSegment {
  type: 'straight' | 'zigzag';
  startY: number;
  endY: number;
}

export interface ITramline {
  id: string;        // UUID
  pageNumber: number;
  x: number;         // Tọa độ X ngang (CSS px) — cho Fabric.js vẽ đúng vị trí
  startY: number;
  endY: number;
  shotName: string;  // VD: 1A, 1B
  shotSize: string;  // VD: MCU, CU, WIDE
  color: string;
  segments: ILineSegment[];
}

// ─── Break Scene Data Model ───────────────────────────────────────────────────

export interface IBreakScene {
  id: string;
  pageNumber: number;
  y: number;           // CSS px trên trang (tại scale hiện tại)
  sceneNumber: string; // "1", "1A", "2B", ...
}

// ─── Breakdown Data Model ──────────────────────────────────────────────────────

export interface IBreakdownElement {
  id: string;
  text: string;          // Đoạn text được bôi đen
  categoryId: string;    // 'cast' | 'props' | 'stunts' | ...
  color: string;         // Màu hex của category (highlight bg)
  pageNumber: number;    // Trang PDF chứa text này
  addedAt: number;       // Date.now() để sort
}

export interface IShotlistRow {
  tramlineId: string; // KHÓA NGOẠI - binding 2 chiều với Canvas
  rowNumber: number;
  sceneNumber: string;
  location: string;
  shotName: string;
  intExt: 'INT' | 'EXT' | '';
  dayNight: 'DAY' | 'NIGHT' | '';
  description: string;
  autoDetectText: string; // Text chỉ lấy từ đoạn straight (Golden Rule)
  dialogue: string[];
  subjects: string[];
  scriptTime: string;
  shotSize: string;
  // ── Phase 7: Các trường bổ sung theo PRD (feature-idea.md §TÍNH NĂNG B) ──
  shotType: string;   // Observe | Single | Two | Three | Four | Group | OTS | POV | Insert | B-roll
  side: string;       // L | R | C | ...
  angle: string;      // Eye Level | Low Angle | High Angle | Dutch | ...
  movement: string;   // Static | Pan | Tilt | Dolly In | Dolly Out | Handheld | Steadicam | Crane | Zoom
  lens: string;       // 24mm | 35mm | 50mm | 85mm | 135mm | ...
  note: string;       // Ghi chú tự do
}

// ─── Store Interface ───────────────────────────────────────────────────────────

interface ScriptState {
  tramlines: ITramline[];
  shotlist: IShotlistRow[];

  // --- Auto-Detect Data Cache (từ NotebookLM) ---
  autoDetectData: IAutoDetectScene[];
  /**
   * importAutoDetectData — nạp dữ liệu AI vào cache, đồng thời patch ngay
   * toàn bộ IShotlistRow có sceneNumber khớp với scene_number trong dữ liệu.
   */
  importAutoDetectData: (scenes: IAutoDetectScene[]) => void;

  // --- Break Scene State ---
  breakScenes: IBreakScene[];
  addBreakScene: (bs: IBreakScene) => void;
  removeBreakScene: (id: string) => void;
  updateBreakScene: (id: string, updates: Partial<Pick<IBreakScene, 'y' | 'sceneNumber'>>) => void;

  // --- Breakdown State ---
  breakdownElements: IBreakdownElement[];
  addBreakdownElement: (element: Omit<IBreakdownElement, 'id' | 'addedAt'>) => void;
  removeBreakdownElement: (id: string) => void;

  /**
   * PDF text data keyed by pageNumber (1-indexed).
   * Được feed bởi usePdfTextExtraction qua action setPdfTextForPage.
   * addTramline / splitSegment / mergeSegments sẽ tự look up và auto-parse.
   */
  pdfTextByPage: Record<number, TextLine[]>;

  // --- Tramline Actions ---
  addTramline: (tramline: ITramline) => void;
  removeTramline: (id: string) => void;
  updateTramline: (id: string, updates: Partial<ITramline>) => void;

  // --- Shotlist Actions (Two-way Binding) ---
  updateShotlistRow: (tramlineId: string, updates: Partial<IShotlistRow>) => void;

  // --- Segment Actions (Split / Merge Logic - architecture-rules.md §1) ---
  splitSegment: (tramlineId: string, segmentIndex: number, splitAtY: number) => void;
  mergeSegments: (tramlineId: string, nodeIndexToRemove: number) => void;

  /**
   * setPdfTextForPage — được gọi từ PdfRenderer khi mỗi trang extract xong.
   * Sau khi set, tự động re-parse tất cả tramlines trên trang đó.
   */
  setPdfTextForPage: (pageNumber: number, lines: TextLine[]) => void;

  /**
   * reparseRow — re-chạy parser cho 1 tramline cụ thể.
   * Dùng khi user muốn refresh auto-detect sau khi edit thủ công.
   */
  reparseRow: (tramlineId: string) => void;

  // --- Hydration (Load từ DB) ---
  hydrate: (tramlines: ITramline[], shotlist: IShotlistRow[]) => void;

  // --- Selectors ---
  getShotlistRowByTramlineId: (tramlineId: string) => IShotlistRow | undefined;
  getTramlineById: (id: string) => ITramline | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map một IAutoDetectScene → Partial<IShotlistRow> để patch vào row.
 * Chỉ patch các trường xuất phát từ AI, không đụng tramlineId / rowNumber /
 * shotName / shotSize / ... (những trường user điền tay).
 */
function autoDetectSceneToRowPatch(scene: IAutoDetectScene): Partial<IShotlistRow> {
  return {
    location: scene.location,
    intExt:   (scene.int_ext === 'INT' || scene.int_ext === 'EXT') ? scene.int_ext : '',
    dayNight: (scene.day_night === 'DAY' || scene.day_night === 'NIGHT') ? scene.day_night : '',
    subjects: scene.subjects,
    dialogue: scene.dialogue,
  };
}

function createDefaultShotlistRow(tramline: ITramline, rowNumber: number): IShotlistRow {
  return {
    tramlineId: tramline.id,
    rowNumber,
    sceneNumber: '',
    location: '',
    shotName: tramline.shotName,
    intExt: '',
    dayNight: '',
    description: '',
    autoDetectText: '',
    dialogue: [],
    subjects: [],
    scriptTime: '',
    shotSize: tramline.shotSize,
    shotType: '',
    side: '',
    angle: '',
    movement: '',
    lens: '',
    note: '',
  };
}

function mergeAdjacentSameTypeSegments(segments: ILineSegment[]): ILineSegment[] {
  if (segments.length <= 1) return segments;
  const merged: ILineSegment[] = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = segments[i];
    if (prev.type === curr.type) {
      merged[merged.length - 1] = { type: prev.type, startY: prev.startY, endY: curr.endY };
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Chạy parser và tạo IShotlistRow đầy đủ cho tramline mới.
 * Kết hợp default values + parsed auto-detect.
 */
function buildShotlistRowWithParse(
  tramline: ITramline,
  rowNumber: number,
  pdfLines: TextLine[],
): IShotlistRow {
  const base = createDefaultShotlistRow(tramline, rowNumber);
  if (!pdfLines.length) return base;

  const parsed = parseTramlineToShotlistData(tramline, pdfLines);
  return {
    ...base,
    sceneNumber:    parsed.sceneNumber,
    location:       parsed.location,
    intExt:         parsed.intExt,
    dayNight:       parsed.dayNight,
    description:    parsed.description,
    autoDetectText: parsed.autoDetectText,
    dialogue:       parsed.dialogue,
    subjects:       parsed.subjects,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useScriptStore = create<ScriptState>()(
  devtools(
    (set, get) => ({
      tramlines: [],
      shotlist: [],
      pdfTextByPage: {},
      breakScenes: [],
      breakdownElements: [],
      autoDetectData: [],

      addBreakScene: (bs) =>
        set((state) => ({ breakScenes: [...state.breakScenes, bs] })),

      removeBreakScene: (id) =>
        set((state) => ({ breakScenes: state.breakScenes.filter((bs) => bs.id !== id) })),

      updateBreakScene: (id, updates) =>
        set((state) => ({
          breakScenes: state.breakScenes.map((bs) =>
            bs.id === id ? { ...bs, ...updates } : bs,
          ),
        })),

      addBreakdownElement: (element) =>
        set((state) => ({
          breakdownElements: [
            ...state.breakdownElements,
            { ...element, id: `bd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: Date.now() },
          ],
        })),

      removeBreakdownElement: (id) =>
        set((state) => ({
          breakdownElements: state.breakdownElements.filter((e) => e.id !== id),
        })),

      // ── importAutoDetectData ───────────────────────────────────────────────
      // 1. Lưu cache autoDetectData
      // 2. Patch ngay toàn bộ shotlist rows có sceneNumber khớp
      importAutoDetectData: (scenes) =>
        set((state) => {
          const sceneMap = new Map(scenes.map((s) => [s.scene_number, s]));
          const newShotlist = state.shotlist.map((row) => {
            if (!row.sceneNumber) return row;
            const scene = sceneMap.get(row.sceneNumber);
            if (!scene) return row;
            return { ...row, ...autoDetectSceneToRowPatch(scene) };
          });
          return { autoDetectData: scenes, shotlist: newShotlist };
        }),

      // ── addTramline ────────────────────────────────────────────────────────
      // Thêm tramline + tự động tạo IShotlistRow + chạy auto-detect nếu có text
      // Sau khi parse: nếu autoDetectData có scene khớp sceneNumber → patch thêm
      addTramline: (tramline) =>
        set((state) => {
          const pdfLines = state.pdfTextByPage[tramline.pageNumber] ?? [];
          const rowNumber = state.shotlist.length + 1;
          let newRow = buildShotlistRowWithParse(tramline, rowNumber, pdfLines);

          if (newRow.sceneNumber && state.autoDetectData.length > 0) {
            const scene = state.autoDetectData.find((s) => s.scene_number === newRow.sceneNumber);
            if (scene) {
              newRow = { ...newRow, ...autoDetectSceneToRowPatch(scene) };
            }
          }

          return {
            tramlines: [...state.tramlines, tramline],
            shotlist:  [...state.shotlist, newRow],
          };
        }),

      // ── removeTramline ─────────────────────────────────────────────────────
      removeTramline: (id) =>
        set((state) => ({
          tramlines: state.tramlines.filter((t) => t.id !== id),
          shotlist: state.shotlist
            .filter((s) => s.tramlineId !== id)
            .map((s, i) => ({ ...s, rowNumber: i + 1 })),
        })),

      // ── updateTramline ─────────────────────────────────────────────────────
      // Two-way binding: shotName / shotSize sync xuống shotlist row
      updateTramline: (id, updates) =>
        set((state) => {
          const newTramlines = state.tramlines.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          );
          const syncedFields: Partial<IShotlistRow> = {};
          if (updates.shotName !== undefined) syncedFields.shotName = updates.shotName;
          if (updates.shotSize !== undefined) syncedFields.shotSize = updates.shotSize;

          const newShotlist = Object.keys(syncedFields).length
            ? state.shotlist.map((s) =>
                s.tramlineId === id ? { ...s, ...syncedFields } : s,
              )
            : state.shotlist;

          return { tramlines: newTramlines, shotlist: newShotlist };
        }),

      // ── updateShotlistRow ──────────────────────────────────────────────────
      // Two-way binding: shotName / shotSize sync lên tramline
      // Nếu sceneNumber thay đổi → tự động patch từ autoDetectData
      updateShotlistRow: (tramlineId, updates) =>
        set((state) => {
          // Khi sceneNumber đổi, enrich với dữ liệu AI (không ghi đè nếu không có match)
          let enrichedUpdates: Partial<IShotlistRow> = { ...updates };
          if (updates.sceneNumber !== undefined && state.autoDetectData.length > 0) {
            const scene = state.autoDetectData.find((s) => s.scene_number === updates.sceneNumber);
            if (scene) {
              enrichedUpdates = { ...enrichedUpdates, ...autoDetectSceneToRowPatch(scene) };
            }
          }

          const newShotlist = state.shotlist.map((s) =>
            s.tramlineId === tramlineId ? { ...s, ...enrichedUpdates } : s,
          );
          const syncedFields: Partial<ITramline> = {};
          if (enrichedUpdates.shotName !== undefined) syncedFields.shotName = enrichedUpdates.shotName;
          if (enrichedUpdates.shotSize !== undefined) syncedFields.shotSize = enrichedUpdates.shotSize;

          const newTramlines = Object.keys(syncedFields).length
            ? state.tramlines.map((t) =>
                t.id === tramlineId ? { ...t, ...syncedFields } : t,
              )
            : state.tramlines;

          return { shotlist: newShotlist, tramlines: newTramlines };
        }),

      // ── splitSegment ────────────────────────────────────────────────────────
      // PRD §1: click → chia 2, đoạn trên giữ type, đoạn dưới đảo type
      // Sau split → re-parse shotlist row với segments mới (straight có thể thay đổi)
      splitSegment: (tramlineId, segmentIndex, splitAtY) =>
        set((state) => {
          const newTramlines = state.tramlines.map((t) => {
            if (t.id !== tramlineId) return t;

            const target = t.segments[segmentIndex];
            if (!target) return t;
            if (splitAtY <= target.startY || splitAtY >= target.endY) return t;

            const flippedType: 'straight' | 'zigzag' =
              target.type === 'straight' ? 'zigzag' : 'straight';

            const newSegments: ILineSegment[] = [
              ...t.segments.slice(0, segmentIndex),
              { type: target.type,  startY: target.startY, endY: splitAtY },
              { type: flippedType,  startY: splitAtY,      endY: target.endY },
              ...t.segments.slice(segmentIndex + 1),
            ];
            return { ...t, segments: newSegments };
          });

          // Re-parse shotlist row với segments đã split
          const updatedTramline = newTramlines.find((t) => t.id === tramlineId);
          let newShotlist = state.shotlist;

          if (updatedTramline) {
            const pdfLines = state.pdfTextByPage[updatedTramline.pageNumber] ?? [];
            if (pdfLines.length) {
              const parsed = reParseTramline(updatedTramline, pdfLines);
              newShotlist = state.shotlist.map((row) => {
                if (row.tramlineId !== tramlineId) return row;
                const autoFields = buildAutoUpdateFields(row, parsed);
                return { ...row, ...autoFields };
              });
            }
          }

          return { tramlines: newTramlines, shotlist: newShotlist };
        }),

      // ── mergeSegments ──────────────────────────────────────────────────────
      // Architecture-rules §1: xóa node giữa → 2 đoạn cùng type → gộp lại
      mergeSegments: (tramlineId, nodeIndexToRemove) =>
        set((state) => {
          const newTramlines = state.tramlines.map((t) => {
            if (t.id !== tramlineId) return t;
            if (nodeIndexToRemove <= 0 || nodeIndexToRemove >= t.segments.length) return t;

            const before = t.segments[nodeIndexToRemove - 1];
            const after  = t.segments[nodeIndexToRemove];
            const merged: ILineSegment = {
              type: before.type,
              startY: before.startY,
              endY: after.endY,
            };
            const newSegments = mergeAdjacentSameTypeSegments([
              ...t.segments.slice(0, nodeIndexToRemove - 1),
              merged,
              ...t.segments.slice(nodeIndexToRemove + 1),
            ]);
            return { ...t, segments: newSegments };
          });

          // Re-parse sau merge (segments straight có thể mở rộng)
          const updatedTramline = newTramlines.find((t) => t.id === tramlineId);
          let newShotlist = state.shotlist;

          if (updatedTramline) {
            const pdfLines = state.pdfTextByPage[updatedTramline.pageNumber] ?? [];
            if (pdfLines.length) {
              const parsed = reParseTramline(updatedTramline, pdfLines);
              newShotlist = state.shotlist.map((row) => {
                if (row.tramlineId !== tramlineId) return row;
                const autoFields = buildAutoUpdateFields(row, parsed);
                return { ...row, ...autoFields };
              });
            }
          }

          return { tramlines: newTramlines, shotlist: newShotlist };
        }),

      // ── setPdfTextForPage ──────────────────────────────────────────────────
      // Feed text data vào store + re-parse tất cả tramlines trên trang đó
      setPdfTextForPage: (pageNumber, lines) =>
        set((state) => {
          const newPdfText = { ...state.pdfTextByPage, [pageNumber]: lines };

          // Re-parse mọi tramline trên trang này
          const pageTramlines = state.tramlines.filter((t) => t.pageNumber === pageNumber);
          if (!pageTramlines.length) {
            return { pdfTextByPage: newPdfText };
          }

          const newShotlist = state.shotlist.map((row) => {
            const tram = pageTramlines.find((t) => t.id === row.tramlineId);
            if (!tram) return row;

            const parsed = parseTramlineToShotlistData(tram, lines);
            const autoFields = buildAutoUpdateFields(row, parsed);
            return { ...row, ...autoFields };
          });

          return { pdfTextByPage: newPdfText, shotlist: newShotlist };
        }),

      // ── reparseRow ─────────────────────────────────────────────────────────
      // Manual re-parse 1 tramline (dùng khi user nhấn "Refresh auto-detect")
      reparseRow: (tramlineId) =>
        set((state) => {
          const tram = state.tramlines.find((t) => t.id === tramlineId);
          if (!tram) return {};

          const pdfLines = state.pdfTextByPage[tram.pageNumber] ?? [];
          if (!pdfLines.length) return {};

          const parsed = reParseTramline(tram, pdfLines);
          const newShotlist = state.shotlist.map((row) => {
            if (row.tramlineId !== tramlineId) return row;
            const autoFields = buildAutoUpdateFields(row, parsed);
            return { ...row, ...autoFields };
          });

          return { shotlist: newShotlist };
        }),

      // ── hydrate ────────────────────────────────────────────────────────────
      hydrate: (tramlines, shotlist) => set({ tramlines, shotlist }),

      // ── Selectors ──────────────────────────────────────────────────────────
      getShotlistRowByTramlineId: (tramlineId) =>
        get().shotlist.find((s) => s.tramlineId === tramlineId),

      getTramlineById: (id) =>
        get().tramlines.find((t) => t.id === id),
    }),
    { name: 'ScriptLiningStore' },
  ),
);
