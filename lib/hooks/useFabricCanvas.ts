/**
 * useFabricCanvas.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom Hook — Layer 2 (Draw Layer)
 *
 * ## Modes:
 *   idle       — pointer-events none, click xuyên qua PDF text layer
 *   draw       — kéo dọc tạo tramline mới
 *   split      — click segment để split, kéo bracket để di chuyển, Delete xóa bracket
 *   breakscene — click tạo đường break scene ngang, kéo lên/xuống, Delete xóa,
 *                double-click label để sửa scene#
 *
 * ## Zoom/Pan:
 *   - Ctrl/Meta + scroll wheel → Zoom (desktop)
 *   - Plain scroll → Pan (desktop)
 *   - 2-finger pinch → Zoom (iPad)
 *   - 2-finger swipe → Pan (iPad)
 *   - 1-finger / Apple Pencil → vẽ Tramline bình thường
 *   - isPanMode=true → chuột trái kéo để Pan (desktop override)
 *
 * ## Coordinate accuracy:
 *   Tất cả handler dùng e.scenePoint (Fabric v7) — đây là toạ độ canvas space
 *   đã tính ngược viewport transform (zoom + pan), nên line vẽ ra luôn khớp
 *   100% với nội dung PDF bên dưới bất kể mức zoom.
 *
 * ## Performance:
 *   Module-level _fab cache — fabric load 1 lần duy nhất, render sync sau đó.
 *
 * ## Event Pattern (Fabric v7):
 *   canvas.on() → returns VoidFunction disposer → gọi disposer() để cleanup.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Point } from "fabric";
import {
  useScriptStore,
  type ITramline,
  type ILineSegment,
  type IBreakScene,
} from "@/lib/store/useScriptStore";

// ─── Module-level Fabric cache ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _fab: any = null;

async function loadFabric() {
  if (!_fab) _fab = await import("fabric");
  return _fab;
}

// ─── Public Types ─────────────────────────────────────────────────────────────

export type DrawMode = "idle" | "draw" | "split" | "breakscene";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DRAG_HEIGHT    = 24;
const ZIGZAG_AMP         = 7;
const ZIGZAG_STEP        = 14;
const BRACKET_HALF       = 10;
const LINE_WIDTH         = 2.5;
const LABEL_PAD_X        = 6;
const LABEL_PAD_Y        = 3;
const LABEL_FONT_SIZE    = 11;
const HIT_TOLERANCE      = 8;
const BRACKET_HIT        = 10;
const ACTIVE_RADIUS      = 14;
const BRACKET_DRAG_MIN   = 12;

// Break Scene constants
const BS_COLOR           = "#6366f1";
const BS_COLOR_ACTIVE    = "#818cf8";
const BS_LINE_WIDTH      = 1.5;
const BS_HIT_Y           = 20;  // px hit tolerance trên trục Y (≥20 cho iPad finger)
const BS_LABEL_FONT      = 10;
const BS_LABEL_PAD_X     = 6;
const BS_LABEL_PAD_Y     = 3;
const BS_ACTIVE_RADIUS   = 18;

// Zoom/Pan constants
const MIN_ZOOM  = 0.25;
const MAX_ZOOM  = 8;
const ZOOM_STEP = 0.15;   // bước zoom cho nút zoomIn/zoomOut

export const TRAMLINE_PALETTE = [
  "#19e66f", "#f59e0b", "#3b82f6", "#ec4899",
  "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
];

// ─── Internal ref types ───────────────────────────────────────────────────────

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewLine: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewBracket: any | null;
}

interface DragState {
  tramlineId: string;
  bracketIndex: number;
  origTram: ITramline;
  previewTram: ITramline;
}

interface ActiveBracket {
  tramlineId: string;
  bracketIndex: number;
}

interface BSDragState {
  id: string;
  origY: number;
  previewY: number;
}

interface TouchTrackState {
  initialDist: number;
  initialZoom: number;
  lastMidX: number;
  lastMidY: number;
}

// ─── Pointer event info shape ─────────────────────────────────────────────────

interface FabricPointerEvent {
  scenePoint: Point;
  pointer: Point;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any;
}

// ─── Zigzag Path Builder ──────────────────────────────────────────────────────

function buildZigzagPath(x: number, startY: number, endY: number): string {
  if (endY <= startY) return `M ${x} ${startY} L ${x} ${endY}`;
  const totalH = endY - startY;
  const steps = Math.max(1, Math.ceil(totalH / ZIGZAG_STEP));
  const stepH = totalH / steps;
  let d = `M ${x} ${startY}`;
  for (let i = 0; i < steps; i++) {
    const side  = i % 2 === 0 ? ZIGZAG_AMP : -ZIGZAG_AMP;
    const midY  = startY + (i + 0.5) * stepH;
    const endSY = startY + (i + 1) * stepH;
    d += ` L ${x + side} ${midY} L ${x} ${Math.min(endSY, endY)}`;
  }
  return d;
}

// ─── Bracket Y helper ─────────────────────────────────────────────────────────

function getBracketYs(tram: ITramline): number[] {
  const ys: number[] = [tram.startY];
  for (let i = 0; i < tram.segments.length - 1; i++) {
    ys.push(tram.segments[i].endY);
  }
  ys.push(tram.endY);
  return ys;
}

// ─── Apply bracket drag ───────────────────────────────────────────────────────

function applyBracketDrag(tram: ITramline, bracketIndex: number, newY: number): ITramline {
  const bracketYs = getBracketYs(tram);
  const n = bracketYs.length;
  const minY = bracketIndex > 0 ? bracketYs[bracketIndex - 1] + BRACKET_DRAG_MIN : tram.startY;
  const maxY = bracketIndex < n - 1 ? bracketYs[bracketIndex + 1] - BRACKET_DRAG_MIN : tram.endY;
  const clampedY = Math.max(minY, Math.min(maxY, newY));

  if (bracketIndex === 0) {
    return {
      ...tram,
      startY: clampedY,
      segments: tram.segments.map((seg, i) => i === 0 ? { ...seg, startY: clampedY } : seg),
    };
  }
  if (bracketIndex === n - 1) {
    return {
      ...tram,
      endY: clampedY,
      segments: tram.segments.map((seg, i) => i === tram.segments.length - 1 ? { ...seg, endY: clampedY } : seg),
    };
  }
  return {
    ...tram,
    segments: tram.segments.map((seg, i) => {
      if (i === bracketIndex - 1) return { ...seg, endY: clampedY };
      if (i === bracketIndex)     return { ...seg, startY: clampedY };
      return seg;
    }),
  };
}

// ─── Render tramline (sync) ───────────────────────────────────────────────────

function renderTramlineSync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  tramline: ITramline,
  activeBracketIdx: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fab: any,
): void {
  const { Path, Line, Rect, FabricText, Group, Circle } = fab;
  const { x, startY, color, shotName, shotSize, segments } = tramline;
  const tag = { tramlineId: tramline.id };
  const base = { selectable: false, evented: true, hasControls: false, hasBorders: false, data: tag } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objects: any[] = [];

  // 1. Segments
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.type === "straight") {
      objects.push(new Line([x, seg.startY, x, seg.endY], {
        ...base,
        stroke: color, strokeWidth: LINE_WIDTH, strokeLineCap: "round", fill: "",
        data: { ...tag, type: "segment", segmentIndex: si },
      }));
    } else {
      objects.push(new Path(buildZigzagPath(x, seg.startY, seg.endY), {
        ...base,
        stroke: color, strokeWidth: LINE_WIDTH - 0.5,
        strokeLineCap: "round", strokeLinejoin: "round", fill: "", opacity: 0.6,
        data: { ...tag, type: "segment", segmentIndex: si },
      }));
    }
  }

  // 2. Bracket nodes
  const bracketYs = getBracketYs(tramline);
  for (let bi = 0; bi < bracketYs.length; bi++) {
    const by = bracketYs[bi];
    objects.push(new Line([x - BRACKET_HALF, by, x + BRACKET_HALF, by], {
      ...base,
      stroke: color,
      strokeWidth: bi === 0 || bi === bracketYs.length - 1 ? LINE_WIDTH + 1 : LINE_WIDTH,
      strokeLineCap: "round", fill: "",
      data: { ...tag, type: "bracket", bracketIndex: bi },
    }));
  }

  // 3. Active bracket indicator — dashed circle
  if (activeBracketIdx !== null && activeBracketIdx < bracketYs.length) {
    const ay = bracketYs[activeBracketIdx];
    objects.push(new Circle({
      left: x, top: ay, radius: ACTIVE_RADIUS,
      originX: "center", originY: "center",
      fill: "", stroke: color, strokeWidth: 1.5,
      strokeDashArray: [4, 3],
      selectable: false, evented: false, data: tag,
    }));
  }

  // 4. Box label at startY
  const labelText = shotSize ? `${shotName}\n${shotSize}` : shotName;
  const textObj = new FabricText(labelText, {
    fontSize: LABEL_FONT_SIZE, fontFamily: "Space Grotesk, system-ui, sans-serif",
    fontWeight: "600", fill: "#18181B", textAlign: "center", lineHeight: 1.3,
    selectable: false, evented: false,
  });
  const textW = Math.max(textObj.width ?? 0, 28) + LABEL_PAD_X * 2;
  const textH = (textObj.height ?? LABEL_FONT_SIZE) + LABEL_PAD_Y * 2;
  textObj.set({ left: LABEL_PAD_X, top: LABEL_PAD_Y });

  const bg = new Rect({
    width: textW, height: textH, rx: 4, ry: 4, fill: color, opacity: 0.92,
    selectable: false, evented: false,
  });

  objects.push(new Group([bg, textObj], {
    ...base, left: x + 4, top: startY - textH,
  }));

  canvas.add(...objects);
}

// ─── Render break scene (sync) ────────────────────────────────────────────────

function renderBreakSceneSync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  bs: IBreakScene,
  canvasWidth: number,
  isActive: boolean,
  previewY: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fab: any,
): void {
  const { Line, Rect, FabricText, Group, Circle } = fab;
  const y = previewY ?? bs.y;
  const tag = { breakSceneId: bs.id };
  const base = { selectable: false, evented: true, hasControls: false, hasBorders: false } as const;
  const lineColor = isActive ? BS_COLOR_ACTIVE : BS_COLOR;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objects: any[] = [];

  // 1. Horizontal line spanning full width
  objects.push(new Line([0, y, canvasWidth, y], {
    ...base,
    stroke: lineColor,
    strokeWidth: isActive ? BS_LINE_WIDTH + 0.5 : BS_LINE_WIDTH,
    strokeLineCap: "butt", fill: "",
    opacity: isActive ? 1 : 0.8,
    data: { ...tag, type: "breakscene-line" },
  }));

  // 2. Label box (left side, centered on the line)
  const labelText = bs.sceneNumber || "?";
  const textObj = new FabricText(labelText, {
    fontSize: BS_LABEL_FONT,
    fontFamily: "Space Grotesk, system-ui, sans-serif",
    fontWeight: "700", fill: "#ffffff", textAlign: "center",
    selectable: false, evented: false,
  });
  const tw = Math.max(textObj.width ?? 0, 14) + BS_LABEL_PAD_X * 2;
  const th = (textObj.height ?? BS_LABEL_FONT) + BS_LABEL_PAD_Y * 2;
  textObj.set({ left: BS_LABEL_PAD_X, top: BS_LABEL_PAD_Y });

  const bg = new Rect({
    width: tw, height: th, rx: 3, ry: 3,
    fill: lineColor, opacity: 1,
    selectable: false, evented: false,
  });

  // Label đặt ở GIỮA trang (canvasWidth / 2) để dễ thấy và chạm trên iPad
  const label = new Group([bg, textObj], {
    ...base,
    left: Math.round(canvasWidth / 2 - tw / 2),
    top: y - th / 2,
    data: { ...tag, type: "breakscene-label" },
  });
  objects.push(label);

  // 3. Active indicator — circle quanh label ở giữa
  if (isActive) {
    const cx = Math.round(canvasWidth / 2);
    objects.push(new Circle({
      left: cx, top: y,
      originX: "center", originY: "center",
      radius: BS_ACTIVE_RADIUS,
      fill: "", stroke: BS_COLOR_ACTIVE, strokeWidth: 1.5,
      selectable: false, evented: false,
      data: tag,
    }));
  }

  canvas.add(...objects);
}

// ─── Hook Interface ───────────────────────────────────────────────────────────

export interface UseFabricCanvasOptions {
  canvasEl: HTMLCanvasElement | null;
  pageNumber: number;
  width: number;
  height: number;
  drawMode: DrawMode;
  /**
   * Controlled pan mode từ parent component.
   * Nếu được cung cấp, override internal useState — dùng khi page.tsx quản lý isPanMode.
   * Nếu không cung cấp, hook tự quản lý isPanMode qua togglePanMode().
   */
  isPanMode?: boolean;
  /**
   * Callback khi user double-click lên Break Scene label để sửa scene#.
   * FabricTramlineCanvas sẽ render <input> overlay tại vị trí y.
   */
  onBreakSceneDblClick?: (id: string, y: number, currentValue: string) => void;
}

export interface UseFabricCanvasReturn {
  dispose: () => void;
  /** Zoom in vào tâm canvas (tăng ZOOM_STEP %) */
  zoomIn: () => void;
  /** Zoom out khỏi tâm canvas (giảm ZOOM_STEP %) */
  zoomOut: () => void;
  /** Reset zoom = 1 và pan về gốc toạ độ */
  resetZoom: () => void;
  /** Fit screen: đặt lại toàn bộ viewport transform về mặc định */
  fitScreen: () => void;
  /** Bật/tắt chế độ pan bằng chuột trái kéo (desktop) */
  togglePanMode: () => void;
  /** true khi pan mode đang bật */
  isPanMode: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFabricCanvas({
  canvasEl,
  pageNumber,
  width,
  height,
  drawMode,
  isPanMode: isPanModeProp,
  onBreakSceneDblClick,
}: UseFabricCanvasOptions): UseFabricCanvasReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef    = useRef<any | null>(null);
  const drawStateRef = useRef<DrawState>({
    isDrawing: false, startX: 0, startY: 0, previewLine: null, previewBracket: null,
  });
  const dragRef              = useRef<DragState | null>(null);
  const activeRef            = useRef<ActiveBracket | null>(null);
  const bsDragRef            = useRef<BSDragState | null>(null);
  const activeBreakSceneRef  = useRef<string | null>(null);

  // ── Zoom / Pan refs ────────────────────────────────────────────────────────
  const zoomRef         = useRef(1);               // current zoom level
  const isPanModeRef    = useRef(false);           // synced with isPanMode state
  const isPanningRef    = useRef(false);           // currently dragging (pan mode)
  const lastPanPtRef    = useRef({ x: 0, y: 0 }); // last client point during pan drag
  const touchTrackRef   = useRef<TouchTrackState | null>(null); // 2-finger touch state

  // ── Pan mode: controlled (prop) hoặc uncontrolled (internal state) ──────
  // Nếu isPanModeProp được cung cấp từ ngoài (page.tsx), dùng nó (controlled).
  // Nếu không, tự quản lý qua internalPanMode + togglePanMode (uncontrolled).
  const [internalPanMode, setInternalPanMode] = useState(false);
  const isPanMode = isPanModeProp !== undefined ? isPanModeProp : internalPanMode;

  // Keep ref in sync với effective pan mode (tránh stale closure trong event handlers)
  useEffect(() => { isPanModeRef.current = isPanMode; }, [isPanMode]);

  // Stable ref for dblclick callback (avoids re-creating effect on every render)
  const dblClickCbRef = useRef(onBreakSceneDblClick);
  useEffect(() => { dblClickCbRef.current = onBreakSceneDblClick; }, [onBreakSceneDblClick]);

  const tramlines      = useScriptStore((s) => s.tramlines);
  const breakScenes    = useScriptStore((s) => s.breakScenes);
  const addTramline    = useScriptStore((s) => s.addTramline);
  const splitSeg       = useScriptStore((s) => s.splitSegment);
  const mergeSegs      = useScriptStore((s) => s.mergeSegments);
  const updateTramline = useScriptStore((s) => s.updateTramline);
  const addBreakScene  = useScriptStore((s) => s.addBreakScene);
  const removeBS       = useScriptStore((s) => s.removeBreakScene);
  const updateBS       = useScriptStore((s) => s.updateBreakScene);

  // ── renderAllSync ───────────────────────────────────────────────────────────

  const renderAllSync = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !_fab) return;

    // Remove all tagged objects (tramlines + break scenes)
    const stale = canvas.getObjects().filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.data?.tramlineId || o.data?.breakSceneId,
    );
    canvas.remove(...stale);

    // Render tramlines
    const pageTramlines = tramlines.filter((t) => t.pageNumber === pageNumber);
    for (const tram of pageTramlines) {
      const displayTram = dragRef.current?.tramlineId === tram.id
        ? dragRef.current.previewTram : tram;
      const activeBracket = activeRef.current?.tramlineId === tram.id
        ? activeRef.current.bracketIndex : null;
      renderTramlineSync(canvas, displayTram, activeBracket, _fab);
    }

    // Render break scenes
    const pageBS = breakScenes.filter((bs) => bs.pageNumber === pageNumber);
    for (const bs of pageBS) {
      const previewY = bsDragRef.current?.id === bs.id ? bsDragRef.current.previewY : null;
      const isActive = activeBreakSceneRef.current === bs.id;
      renderBreakSceneSync(canvas, bs, width, isActive, previewY, _fab);
    }

    canvas.requestRenderAll();
  }, [tramlines, breakScenes, pageNumber, width]);

  // ── Init Fabric Canvas + Wheel & Touch Zoom/Pan ─────────────────────────────

  useEffect(() => {
    if (!canvasEl) return;
    let disposed = false;
    const cleanupList: VoidFunction[] = [];

    (async () => {
      const fab = await loadFabric();
      if (disposed) return;

      const fc = new fab.Canvas(canvasEl, {
        width, height,
        selection: false,
        renderOnAddRemove: false,
        backgroundColor: undefined as unknown as string,
      });
      fabricRef.current = fc;
      renderAllSync();

      // ── mouse:wheel — Ctrl/Meta+scroll=Zoom, plain scroll=Pan ────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleWheel = (opt: any) => {
        const e = opt.e as WheelEvent;
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
          // Zoom vào/ra tại vị trí con trỏ
          let zoom = fc.getZoom();
          zoom *= 0.999 ** e.deltaY;
          zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
          // offsetX/Y là toạ độ trong canvas element space — Fabric dùng trực tiếp
          fc.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
          zoomRef.current = zoom;
        } else {
          // Pan: dịch chuyển viewport theo deltaX / deltaY
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vpt = (fc.viewportTransform as number[]).slice() as any;
          vpt[4] -= e.deltaX;
          vpt[5] -= e.deltaY;
          fc.setViewportTransform(vpt);
        }
        fc.requestRenderAll();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupList.push(fc.on("mouse:wheel" as any, handleWheel));

      // ── Multi-touch: 2-finger Pinch=Zoom + 2-finger Swipe=Pan (iPad) ────
      // 1-finger hoặc Apple Pencil (pointerType='pen') không bị chặn ở đây
      // → vẫn đến Fabric bình thường → vẽ Tramline như cũ.

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        // Chặn browser pinch-zoom, nhưng không preventDefault trên 1-finger
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        touchTrackRef.current = {
          initialDist: Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY),
          initialZoom: fc.getZoom(),
          lastMidX: midX,
          lastMidY: midY,
        };
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 2 || !touchTrackRef.current) return;
        e.preventDefault();

        const track = touchTrackRef.current;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist  = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midX  = (t0.clientX + t1.clientX) / 2;
        const midY  = (t0.clientY + t1.clientY) / 2;

        // 1) Pinch Zoom — tính tỷ lệ từ khoảng cách ban đầu
        let newZoom = track.initialZoom * (dist / track.initialDist);
        newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));

        // Chuyển client midpoint → canvas element offset (xử lý CSS scaling)
        const el   = fc.getElement() as HTMLCanvasElement;
        const rect = el.getBoundingClientRect();
        const cx   = midX - rect.left;
        const cy   = midY - rect.top;

        fc.zoomToPoint({ x: cx, y: cy }, newZoom);
        zoomRef.current = newZoom;

        // 2) 2-finger Pan — delta của midpoint giữa 2 ngón
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vpt = (fc.viewportTransform as number[]).slice() as any;
        vpt[4] += midX - track.lastMidX;
        vpt[5] += midY - track.lastMidY;
        fc.setViewportTransform(vpt);

        // Cập nhật lastMid cho frame tiếp theo
        track.lastMidX = midX;
        track.lastMidY = midY;

        fc.requestRenderAll();
      };

      const handleTouchEnd = () => {
        touchTrackRef.current = null;
      };

      canvasEl.addEventListener("touchstart", handleTouchStart, { passive: false });
      canvasEl.addEventListener("touchmove",  handleTouchMove,  { passive: false });
      canvasEl.addEventListener("touchend",   handleTouchEnd);
      cleanupList.push(() => {
        canvasEl.removeEventListener("touchstart", handleTouchStart);
        canvasEl.removeEventListener("touchmove",  handleTouchMove);
        canvasEl.removeEventListener("touchend",   handleTouchEnd);
      });
    })();

    return () => {
      disposed = true;
      cleanupList.forEach((fn) => fn());
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasEl, width, height]);

  // ── Re-render when store changes ────────────────────────────────────────────

  useEffect(() => {
    if (!fabricRef.current) return;
    renderAllSync();
  }, [renderAllSync]);

  // ── Pan Mode — mouse drag pan (desktop) ─────────────────────────────────────
  // Khi isPanMode=true, chuột trái kéo để di chuyển viewport.
  // Các draw handler bên dưới sẽ bail sớm nhờ isPanModeRef.current.

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!isPanMode) {
      canvas.defaultCursor = "default";
      return;
    }

    canvas.defaultCursor = "grab";
    const disposers: VoidFunction[] = [];

    const onDown = (e: FabricPointerEvent) => {
      const ne = e.e as MouseEvent;
      // Chỉ xử lý click chuột (không phải stylus/touch đến qua Fabric)
      if (typeof ne.clientX !== "number") return;
      isPanningRef.current = true;
      lastPanPtRef.current = { x: ne.clientX, y: ne.clientY };
      canvas.defaultCursor = "grabbing";
    };

    const onMove = (e: FabricPointerEvent) => {
      if (!isPanningRef.current) return;
      const ne = e.e as MouseEvent;
      const dx = ne.clientX - lastPanPtRef.current.x;
      const dy = ne.clientY - lastPanPtRef.current.y;
      lastPanPtRef.current = { x: ne.clientX, y: ne.clientY };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vpt = (canvas.viewportTransform as number[]).slice() as any;
      vpt[4] += dx;
      vpt[5] += dy;
      canvas.setViewportTransform(vpt);
      canvas.requestRenderAll();
    };

    const onUp = () => {
      isPanningRef.current = false;
      if (isPanModeRef.current) canvas.defaultCursor = "grab";
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:down" as any, onDown as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:move" as any, onMove as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:up"   as any, onUp   as any));

    return () => {
      disposers.forEach((d) => d());
      isPanningRef.current = false;
      if (fabricRef.current) fabricRef.current.defaultCursor = "default";
    };
  }, [isPanMode]);

  // ── Draw Mode events ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || drawMode !== "draw") {
      if (canvas) canvas.defaultCursor = "default";
      return;
    }

    canvas.defaultCursor = "crosshair";
    const ds = drawStateRef.current;
    const disposers: VoidFunction[] = [];

    const onDown = async (e: FabricPointerEvent) => {
      // Pan mode takes priority — do not start drawing
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt) return;
      const fab = await loadFabric();
      const color = TRAMLINE_PALETTE[
        tramlines.filter((t) => t.pageNumber === pageNumber).length % TRAMLINE_PALETTE.length
      ];
      ds.isDrawing = true;
      ds.startX = pt.x;
      ds.startY = pt.y;
      ds.previewLine = new fab.Line([pt.x, pt.y, pt.x, pt.y], {
        stroke: color, strokeWidth: LINE_WIDTH, strokeLineCap: "round",
        selectable: false, evented: false, opacity: 0.65, strokeDashArray: [4, 3],
      });
      ds.previewBracket = new fab.Line(
        [pt.x - BRACKET_HALF, pt.y, pt.x + BRACKET_HALF, pt.y],
        { stroke: color, strokeWidth: LINE_WIDTH + 1, strokeLineCap: "round", selectable: false, evented: false },
      );
      canvas.add(ds.previewLine, ds.previewBracket);
      canvas.requestRenderAll();
    };

    const onMove = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt || !ds.isDrawing || !ds.previewLine) return;
      ds.previewLine.set({ x2: ds.startX, y2: pt.y });
      canvas.requestRenderAll();
    };

    const onUp = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      if (!ds.isDrawing) return;
      ds.isDrawing = false;
      if (ds.previewLine)   canvas.remove(ds.previewLine);
      if (ds.previewBracket) canvas.remove(ds.previewBracket);
      ds.previewLine = null;
      ds.previewBracket = null;

      const endY  = e.scenePoint?.y ?? ds.startY;
      const dragH = Math.abs(endY - ds.startY);
      if (dragH < MIN_DRAG_HEIGHT) { canvas.requestRenderAll(); return; }

      const [topY, botY] = ds.startY < endY ? [ds.startY, endY] : [endY, ds.startY];
      const count = tramlines.filter((t) => t.pageNumber === pageNumber).length;
      const color = TRAMLINE_PALETTE[count % TRAMLINE_PALETTE.length];
      addTramline({
        id: crypto.randomUUID(), pageNumber,
        x: ds.startX, startY: topY, endY: botY,
        shotName: `${count + 1}A`, shotSize: "", color,
        segments: [{ type: "straight", startY: topY, endY: botY }],
      });
      canvas.requestRenderAll();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:down" as any, onDown as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:move" as any, onMove as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:up" as any, onUp as any));

    return () => { disposers.forEach((d) => d()); canvas.defaultCursor = "default"; };
  }, [drawMode, pageNumber, tramlines, addTramline]);

  // ── Split Mode events ────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || drawMode !== "split") {
      if (canvas) canvas.defaultCursor = "default";
      return;
    }

    canvas.defaultCursor = "cell";
    const disposers: VoidFunction[] = [];

    const onDown = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt) return;
      const pageTrams = tramlines.filter((t) => t.pageNumber === pageNumber);
      let closest: ITramline | null = null;
      let closestDist = Infinity;
      for (const tram of pageTrams) {
        const dist = Math.abs(pt.x - tram.x);
        if (dist < HIT_TOLERANCE && pt.y >= tram.startY && pt.y <= tram.endY && dist < closestDist) {
          closest = tram; closestDist = dist;
        }
      }
      if (!closest) {
        if (activeRef.current) { activeRef.current = null; renderAllSync(); }
        return;
      }
      const bracketYs = getBracketYs(closest);
      let hitBracket = -1;
      for (let bi = 0; bi < bracketYs.length; bi++) {
        if (Math.abs(pt.y - bracketYs[bi]) <= BRACKET_HIT) { hitBracket = bi; break; }
      }
      if (hitBracket !== -1) {
        activeRef.current = { tramlineId: closest.id, bracketIndex: hitBracket };
        dragRef.current = { tramlineId: closest.id, bracketIndex: hitBracket, origTram: closest, previewTram: closest };
        canvas.defaultCursor = "grabbing";
        renderAllSync();
        return;
      }
      const segIdx = closest.segments.findIndex((seg) => pt.y >= seg.startY && pt.y <= seg.endY);
      if (segIdx === -1) return;
      activeRef.current = null;
      splitSeg(closest.id, segIdx, pt.y);
    };

    const onMove = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt) return;
      if (dragRef.current) {
        const { bracketIndex, origTram } = dragRef.current;
        dragRef.current.previewTram = applyBracketDrag(origTram, bracketIndex, pt.y);
        renderAllSync();
        return;
      }
      const pageTrams = tramlines.filter((t) => t.pageNumber === pageNumber);
      let overBracket = false;
      for (const tram of pageTrams) {
        if (Math.abs(pt.x - tram.x) < HIT_TOLERANCE) {
          if (getBracketYs(tram).some((by) => Math.abs(pt.y - by) <= BRACKET_HIT)) {
            overBracket = true; break;
          }
        }
      }
      canvas.defaultCursor = overBracket ? "grab" : "cell";
    };

    const onUp = () => {
      if (isPanModeRef.current) return;
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      canvas.defaultCursor = "cell";
      const { previewTram, origTram, tramlineId } = drag;
      if (previewTram !== origTram) {
        updateTramline(tramlineId, { startY: previewTram.startY, endY: previewTram.endY, segments: previewTram.segments });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:down" as any, onDown as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:move" as any, onMove as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:up" as any, onUp as any));

    return () => {
      disposers.forEach((d) => d());
      dragRef.current = null;
      activeRef.current = null;
      canvas.defaultCursor = "default";
    };
  }, [drawMode, pageNumber, tramlines, splitSeg, updateTramline, renderAllSync]);

  // ── Split Mode — Delete bracket keyboard handler ──────────────────────────

  useEffect(() => {
    if (drawMode !== "split") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = activeRef.current;
      if (!active) return;
      const tram = tramlines.find((t) => t.id === active.tramlineId);
      if (!tram) return;
      const bracketYs = getBracketYs(tram);
      if (active.bracketIndex <= 0 || active.bracketIndex >= bracketYs.length - 1) return;
      activeRef.current = null;
      mergeSegs(active.tramlineId, active.bracketIndex);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawMode, tramlines, mergeSegs]);

  // ── Break Scene Mode events ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || drawMode !== "breakscene") {
      if (canvas) canvas.defaultCursor = "default";
      return;
    }

    canvas.defaultCursor = "crosshair";
    const disposers: VoidFunction[] = [];

    // Long-press timer cho iPad (500ms giữ → mở edit thay vì double-click)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const getPageBS = () => breakScenes.filter((bs) => bs.pageNumber === pageNumber);

    /** Tìm break scene gần điểm pt theo trục Y (full-width hit zone). */
    const hitTest = (pt: Point): IBreakScene | null => {
      for (const bs of getPageBS()) {
        if (Math.abs(pt.y - bs.y) <= BS_HIT_Y) return bs;
      }
      return null;
    };

    /** true nếu điểm pt nằm trong vùng label (center ± 60px theo trục X). */
    const isNearLabel = (pt: Point) => Math.abs(pt.x - width / 2) <= 60;

    const cancelLongPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    const onDown = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      cancelLongPress();
      const pt = e.scenePoint;
      if (!pt) return;

      const hit = hitTest(pt);
      if (hit) {
        // Set active + start drag
        activeBreakSceneRef.current = hit.id;
        bsDragRef.current = { id: hit.id, origY: hit.y, previewY: hit.y };
        canvas.defaultCursor = "ns-resize";
        renderAllSync();

        // iPad: long-press trên vùng label → trigger edit (≡ double-click desktop)
        if (isNearLabel(pt)) {
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            const drag = bsDragRef.current;
            // Chỉ trigger nếu chưa kéo đáng kể (phân biệt long-press với drag)
            if (drag && Math.abs(drag.previewY - drag.origY) < 12) {
              bsDragRef.current = null;  // huỷ drag — đây là long-press, không phải drag
              dblClickCbRef.current?.(hit.id, hit.y, hit.sceneNumber);
              renderAllSync();
            }
          }, 500);
        }
        return;
      }

      // Click ngoài vùng break scene
      if (activeBreakSceneRef.current) {
        activeBreakSceneRef.current = null;
        renderAllSync();
        return;
      }

      // Tạo break scene mới tại vị trí click
      const existing = getPageBS();
      const existingNums = existing
        .map((bs) => parseInt(bs.sceneNumber, 10))
        .filter((n) => !isNaN(n));
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      addBreakScene({
        id: crypto.randomUUID(),
        pageNumber,
        y: pt.y,
        sceneNumber: String(nextNum),
      });
    };

    const onMove = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt) return;

      if (bsDragRef.current) {
        const newY = Math.max(0, Math.min(height, pt.y));
        bsDragRef.current.previewY = newY;

        // Nếu kéo > 12px so với gốc → đây là drag thật, huỷ long-press
        if (longPressTimer && Math.abs(newY - bsDragRef.current.origY) > 12) {
          cancelLongPress();
        }

        renderAllSync();
        return;
      }

      // Hover cursor
      canvas.defaultCursor = hitTest(pt) ? "ns-resize" : "crosshair";
    };

    const onUp = () => {
      if (isPanModeRef.current) return;
      cancelLongPress();
      const drag = bsDragRef.current;
      if (!drag) return;
      bsDragRef.current = null;
      canvas.defaultCursor = "crosshair";
      if (drag.previewY !== drag.origY) {
        updateBS(drag.id, { y: drag.previewY });
      }
    };

    // Desktop: double-click trên vùng label giữa trang → edit
    const onDblClick = (e: FabricPointerEvent) => {
      if (isPanModeRef.current) return;
      const pt = e.scenePoint;
      if (!pt) return;
      for (const bs of getPageBS()) {
        if (isNearLabel(pt) && Math.abs(pt.y - bs.y) <= BS_HIT_Y) {
          dblClickCbRef.current?.(bs.id, bs.y, bs.sceneNumber);
          return;
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:down" as any, onDown as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:move" as any, onMove as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:up" as any, onUp as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disposers.push(canvas.on("mouse:dblclick" as any, onDblClick as any));

    return () => {
      cancelLongPress();
      disposers.forEach((d) => d());
      bsDragRef.current = null;
      activeBreakSceneRef.current = null;
      canvas.defaultCursor = "default";
    };
  }, [drawMode, pageNumber, breakScenes, height, width, addBreakScene, updateBS, renderAllSync]);

  // ── Break Scene — Delete keyboard handler ────────────────────────────────

  useEffect(() => {
    if (drawMode !== "breakscene") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const activeId = activeBreakSceneRef.current;
      if (!activeId) return;
      activeBreakSceneRef.current = null;
      removeBS(activeId);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawMode, removeBS]);

  // ── Zoom / Pan control callbacks ─────────────────────────────────────────────

  /**
   * Zoom in vào tâm canvas.
   * scenePoint vẫn được Fabric tính đúng sau khi zoom vì ta dùng zoomToPoint.
   */
  const zoomIn = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const center = canvas.getCenter();
    const newZoom = Math.min(MAX_ZOOM, canvas.getZoom() * (1 + ZOOM_STEP));
    canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);
    zoomRef.current = newZoom;
    canvas.requestRenderAll();
  }, []);

  /** Zoom out khỏi tâm canvas. */
  const zoomOut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const center = canvas.getCenter();
    const newZoom = Math.max(MIN_ZOOM, canvas.getZoom() / (1 + ZOOM_STEP));
    canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);
    zoomRef.current = newZoom;
    canvas.requestRenderAll();
  }, []);

  /**
   * Reset zoom = 1 và pan = (0,0).
   * viewportTransform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
   * Identity = [1, 0, 0, 1, 0, 0]
   */
  const resetZoom = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    zoomRef.current = 1;
    canvas.requestRenderAll();
  }, []);

  /**
   * Fit screen: đặt lại viewport để canvas vừa khít container.
   * Với layout hiện tại canvas đã bằng kích thước trang PDF, nên reset = fit.
   */
  const fitScreen = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    zoomRef.current = 1;
    canvas.requestRenderAll();
  }, []);

  /**
   * Toggle pan mode.
   * Chỉ có tác dụng trong uncontrolled mode (khi isPanMode prop không được cung cấp).
   * Trong controlled mode, parent component tự toggle isPanMode.
   */
  const togglePanMode = useCallback(() => {
    setInternalPanMode((prev) => !prev);
  }, []);

  const dispose = useCallback(() => {
    fabricRef.current?.dispose();
    fabricRef.current = null;
  }, []);

  return { dispose, zoomIn, zoomOut, resetZoom, fitScreen, togglePanMode, isPanMode };
}
