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
 * ## Performance:
 *   Module-level _fab cache — fabric load 1 lần duy nhất, render sync sau đó.
 *
 * ## Event Pattern (Fabric v7):
 *   canvas.on() → returns VoidFunction disposer → gọi disposer() để cleanup.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
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
const BS_HIT_Y           = 12;  // px hit tolerance trên trục Y
const BS_LABEL_FONT      = 10;
const BS_LABEL_PAD_X     = 6;
const BS_LABEL_PAD_Y     = 3;
const BS_ACTIVE_RADIUS   = 18;

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

  const label = new Group([bg, textObj], {
    ...base,
    left: 8,
    top: y - th / 2,
    data: { ...tag, type: "breakscene-label" },
  });
  objects.push(label);

  // 3. Active indicator — solid circle around label
  if (isActive) {
    const cx = 8 + tw / 2;
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
   * Callback khi user double-click lên Break Scene label để sửa scene#.
   * FabricTramlineCanvas sẽ render <input> overlay tại vị trí y.
   */
  onBreakSceneDblClick?: (id: string, y: number, currentValue: string) => void;
}

export interface UseFabricCanvasReturn {
  dispose: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFabricCanvas({
  canvasEl,
  pageNumber,
  width,
  height,
  drawMode,
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

  // ── Init Fabric Canvas ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasEl) return;
    let disposed = false;

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
    })();

    return () => {
      disposed = true;
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
      const pt = e.scenePoint;
      if (!pt || !ds.isDrawing || !ds.previewLine) return;
      ds.previewLine.set({ x2: ds.startX, y2: pt.y });
      canvas.requestRenderAll();
    };

    const onUp = (e: FabricPointerEvent) => {
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

    const getPageBS = () => breakScenes.filter((bs) => bs.pageNumber === pageNumber);

    /** Tìm break scene gần điểm pt theo trục Y. */
    const hitTest = (pt: Point): IBreakScene | null => {
      for (const bs of getPageBS()) {
        if (Math.abs(pt.y - bs.y) <= BS_HIT_Y) return bs;
      }
      return null;
    };

    const onDown = (e: FabricPointerEvent) => {
      const pt = e.scenePoint;
      if (!pt) return;

      const hit = hitTest(pt);
      if (hit) {
        // Set active + start drag
        activeBreakSceneRef.current = hit.id;
        bsDragRef.current = { id: hit.id, origY: hit.y, previewY: hit.y };
        canvas.defaultCursor = "ns-resize";
        renderAllSync();
        return;
      }

      // Click ngoài vùng break scene
      if (activeBreakSceneRef.current) {
        // Bỏ chọn
        activeBreakSceneRef.current = null;
        renderAllSync();
        return;
      }

      // Tạo break scene mới
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
      const pt = e.scenePoint;
      if (!pt) return;

      if (bsDragRef.current) {
        bsDragRef.current.previewY = Math.max(0, Math.min(height, pt.y));
        renderAllSync();
        return;
      }

      // Hover cursor
      canvas.defaultCursor = hitTest(pt) ? "ns-resize" : "crosshair";
    };

    const onUp = () => {
      const drag = bsDragRef.current;
      if (!drag) return;
      bsDragRef.current = null;
      canvas.defaultCursor = "crosshair";
      if (drag.previewY !== drag.origY) {
        updateBS(drag.id, { y: drag.previewY });
      }
    };

    const onDblClick = (e: FabricPointerEvent) => {
      const pt = e.scenePoint;
      if (!pt) return;
      // Check if click is in the label area (left side, near break scene y)
      for (const bs of getPageBS()) {
        if (pt.x >= 8 && pt.x <= 80 && Math.abs(pt.y - bs.y) <= 16) {
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
      disposers.forEach((d) => d());
      bsDragRef.current = null;
      activeBreakSceneRef.current = null;
      canvas.defaultCursor = "default";
    };
  }, [drawMode, pageNumber, breakScenes, height, addBreakScene, updateBS, renderAllSync]);

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

  const dispose = useCallback(() => {
    fabricRef.current?.dispose();
    fabricRef.current = null;
  }, []);

  return { dispose };
}
