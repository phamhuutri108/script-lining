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
  // Cần breakScenes để kiểm tra trùng lặp scene# khi user đổi tên
  const breakScenes      = useScriptStore((s) => s.breakScenes);

  // Derived: true nếu value đang nhập trùng với scene# khác trên CÙNG trang
  const isDuplicate = editState !== null && breakScenes.some(
    (bs) =>
      bs.pageNumber === pageNumber &&
      bs.id !== editState.id &&
      bs.sceneNumber.trim().toLowerCase() === editState.value.trim().toLowerCase(),
  );

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

      {/* Break Scene inline edit — căn GIỮA, khớp với vị trí label trên canvas */}
      {editState && (
        <>
          <input
            ref={inputRef}
            value={editState.value}
            onChange={(e) => setEditState((prev) => prev ? { ...prev, value: e.target.value } : null)}
            onBlur={confirmEdit}
            onKeyDown={handleInputKeyDown}
            maxLength={8}
            placeholder="Scene#"
            style={{
              position: "absolute",
              // Căn giữa theo chiều ngang (80px wide, nên left = center - 40)
              left: Math.round(width / 2 - 40),
              top: editState.y - 14,
              width: 80,
              height: 28,
              padding: "0 8px",
              fontSize: 12,
              fontFamily: "Space Grotesk, system-ui, sans-serif",
              fontWeight: 700,
              color: "#ffffff",
              background: isDuplicate ? "#dc2626" : "#6366f1",
              border: `2px solid ${isDuplicate ? "#fca5a5" : "#818cf8"}`,
              borderRadius: 5,
              outline: "none",
              zIndex: 20,
              textAlign: "center",
              letterSpacing: "0.05em",
              boxShadow: isDuplicate
                ? "0 2px 12px rgba(220,38,38,0.45)"
                : "0 2px 12px rgba(99,102,241,0.40)",
              transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
            }}
            // Prevent canvas mouse events from firing while input is active
            onMouseDown={(e) => e.stopPropagation()}
          />

          {/* Cảnh báo trùng lặp — hiện ngay bên dưới input */}
          {isDuplicate && (
            <div
              style={{
                position: "absolute",
                left: Math.round(width / 2 - 40),
                top: editState.y + 18,
                background: "#dc2626",
                color: "#fff",
                fontSize: 9,
                fontFamily: "Space Grotesk, system-ui, sans-serif",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 3,
                whiteSpace: "nowrap",
                zIndex: 21,
                letterSpacing: "0.04em",
                boxShadow: "0 1px 4px rgba(220,38,38,0.3)",
                pointerEvents: "none",
              }}
            >
              ⚠ Scene# đã tồn tại trên trang này!
            </div>
          )}
        </>
      )}
    </div>
  );
}
