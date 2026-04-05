/**
 * FabricTramlineCanvas.tsx — Layer 2 (Draw Layer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Component trong suốt đè lên đúng 1 trang PDF.
 *
 * ## Tính năng:
 *   - Render tramlines + break scenes qua useFabricCanvas hook.
 *   - Khi Break Scene Mode: double-click label → hiện <input> overlay để sửa scene#.
 *   - Nhận isPanMode từ ngoài (page.tsx) và báo zoomControls ngược lên qua onControlsReady.
 *
 * ## pointer-events strategy:
 *   draw / split / breakscene → "auto"  — Fabric bắt tất cả mouse events
 *   idle                      → "none"  — click xuyên qua, Text Layer có thể select text
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useFabricCanvas, type DrawMode } from "@/lib/hooks/useFabricCanvas";
import { useScriptStore } from "@/lib/store/useScriptStore";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Zoom controls được expose lên parent (page.tsx) qua onControlsReady. */
export interface FabricZoomControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitScreen: () => void;
}

export interface FabricTramlineCanvasProps {
  pageNumber: number;
  width: number;
  height: number;
  drawMode: DrawMode;
  /**
   * Pan mode được điều khiển từ page.tsx.
   * Khi true, chuột trái kéo sẽ pan thay vì vẽ.
   */
  isPanMode?: boolean;
  /**
   * Callback khi canvas sẵn sàng — cung cấp zoom control functions cho parent.
   * Page.tsx lưu các controls này để gắn vào toolbar buttons.
   */
  onControlsReady?: (controls: FabricZoomControls) => void;
  /** Cleanup: gọi khi component unmount để parent xoá controls khỏi registry. */
  onControlsDestroyed?: () => void;
}

interface EditState {
  id: string;
  y: number;         // Y position trong canvas (CSS px)
  value: string;     // Giá trị đang sửa
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FabricTramlineCanvas({
  pageNumber,
  width,
  height,
  drawMode,
  isPanMode,
  onControlsReady,
  onControlsDestroyed,
}: Readonly<FabricTramlineCanvasProps>) {
  const [canvasEl, setCanvasEl]     = useState<HTMLCanvasElement | null>(null);
  const [editState, setEditState]   = useState<EditState | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  const updateBreakScene = useScriptStore((s) => s.updateBreakScene);

  // Callback ref pattern: React gọi với DOM element khi mount/unmount
  const canvasCallbackRef = useCallback((el: HTMLCanvasElement | null) => {
    setCanvasEl(el);
  }, []);

  // Handler: hook báo double-click trên label → show input overlay
  const handleBreakSceneDblClick = useCallback((id: string, y: number, current: string) => {
    setEditState({ id, y, value: current });
  }, []);

  // Focus input khi edit state xuất hiện
  useEffect(() => {
    if (editState) {
      // Tick sau để đảm bảo input đã render
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editState]);

  // Confirm edit (Enter hoặc blur)
  const confirmEdit = useCallback(() => {
    if (!editState) return;
    const val = editState.value.trim();
    if (val) {
      updateBreakScene(editState.id, { sceneNumber: val });
    }
    setEditState(null);
  }, [editState, updateBreakScene]);

  // Cancel edit (Escape)
  const cancelEdit = useCallback(() => {
    setEditState(null);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); confirmEdit(); }
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
    },
    [confirmEdit, cancelEdit],
  );

  // Hook khởi tạo Fabric.js và handle tất cả logic vẽ + zoom/pan
  const { zoomIn, zoomOut, resetZoom, fitScreen } = useFabricCanvas({
    canvasEl,
    pageNumber,
    width,
    height,
    drawMode,
    isPanMode,
    onBreakSceneDblClick: handleBreakSceneDblClick,
  });

  // ── Báo zoom controls lên parent (page.tsx) ─────────────────────────────
  // Dùng stable ref pattern cho onControlsDestroyed để tránh re-registration
  // không cần thiết khi prop thay đổi giữa re-renders.
  const onControlsDestroyedRef = useRef(onControlsDestroyed);
  useEffect(() => { onControlsDestroyedRef.current = onControlsDestroyed; }, [onControlsDestroyed]);

  useEffect(() => {
    onControlsReady?.({ zoomIn, zoomOut, resetZoom, fitScreen });
    return () => { onControlsDestroyedRef.current?.(); };
    // zoomIn/Out/resetZoom/fitScreen là stable useCallback([], [])
    // Effect chỉ re-run khi onControlsReady thay đổi (tức là khi renderOverlay recreate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomIn, zoomOut, resetZoom, fitScreen, onControlsReady]);

  const isInteractive = drawMode !== "idle";

  return (
    <div
      className="fabric-overlay absolute inset-0"
      style={{
        pointerEvents: isInteractive ? "auto" : "none",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* Fabric.js canvas */}
      <canvas
        ref={canvasCallbackRef}
        style={{ position: "absolute", top: 0, left: 0, background: "transparent" }}
      />

      {/* Break Scene inline edit input */}
      {editState && (
        <input
          ref={inputRef}
          value={editState.value}
          onChange={(e) => setEditState((prev) => prev ? { ...prev, value: e.target.value } : null)}
          onBlur={confirmEdit}
          onKeyDown={handleInputKeyDown}
          maxLength={8}
          style={{
            position: "absolute",
            left: 8,
            top: editState.y - 12,
            width: 56,
            height: 24,
            padding: "0 6px",
            fontSize: 11,
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontWeight: 700,
            color: "#ffffff",
            background: "#6366f1",
            border: "2px solid #818cf8",
            borderRadius: 4,
            outline: "none",
            zIndex: 20,
            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
          }}
          // Prevent canvas mouse events from firing while input is active
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
