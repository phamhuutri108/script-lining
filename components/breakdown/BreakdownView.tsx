/**
 * BreakdownView.tsx — Phase 6: Breakdown Mode (Full Tab Layout)
 * ─────────────────────────────────────────────────────────────────────────────
 * Split panel layout:
 *   LEFT (55%): PDF hiển thị với text selection + highlight elements
 *   RIGHT (45%): BreakdownPanel — danh sách elements đã tag
 *
 * Khi user bôi đen text trong PDF:
 *   1. useTextSelection detect → CategoryMenu popup hiện
 *   2. User chọn category → addBreakdownElement vào store
 *   3. BreakdownPanel tự update qua Zustand subscription
 */

"use client";

import { useRef, useCallback } from "react";
import { PdfRenderer, type PdfTextExtractionData } from "@/components/workspace/PdfRenderer";
import { BreakdownPanel } from "@/components/breakdown/BreakdownPanel";
import { CategoryMenu } from "@/components/breakdown/CategoryMenu";
import { useTextSelection } from "@/lib/hooks/useTextSelection";
import { useScriptStore } from "@/lib/store/useScriptStore";
import { getCategoryById } from "@/lib/breakdown-categories";

interface BreakdownViewProps {
  pdfSrc: string | ArrayBuffer | null;
  onTextExtracted?: (data: PdfTextExtractionData) => void;
  onDocumentLoaded?: (totalPages: number) => void;
}

export function BreakdownView({
  pdfSrc,
  onTextExtracted,
  onDocumentLoaded,
}: Readonly<BreakdownViewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const addElement = useScriptStore((s) => s.addBreakdownElement);

  const { selection, clearSelection, markMenuOpen } = useTextSelection(
    containerRef as React.RefObject<HTMLElement | null>,
  );

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      if (!selection) return;
      const cat = getCategoryById(categoryId);
      if (!cat) return;

      addElement({
        text: selection.text,
        categoryId,
        color: cat.color,
        pageNumber: 1, // simplified — page tracking can be enhanced later
      });

      // Clear text selection in browser
      window.getSelection()?.removeAllRanges();
    },
    [selection, addElement],
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── LEFT: PDF với text selection ─────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: "0 0 58%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hint banner */}
        {pdfSrc && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              background: "rgba(24,24,27,0.75)",
              backdropFilter: "blur(8px)",
              borderRadius: 20,
              padding: "4px 12px",
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "Space Grotesk, sans-serif",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              Bôi đen text để tag element
            </p>
          </div>
        )}

        <PdfRenderer
          src={pdfSrc}
          scale={1.4}
          onTextExtracted={onTextExtracted}
          onDocumentLoaded={onDocumentLoaded}
          className="h-full"
        />
      </div>

      {/* ── Resizer handle ────────────────────────────────────────────────── */}
      <div
        style={{
          width: 1,
          background: "rgba(24,24,27,0.08)",
          flexShrink: 0,
          cursor: "col-resize",
        }}
      />

      {/* ── RIGHT: Breakdown Panel ────────────────────────────────────────── */}
      <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
        <BreakdownPanel className="h-full" />
      </div>

      {/* ── Category Menu Popup ──────────────────────────────────────────── */}
      {selection && (
        <CategoryMenu
          x={selection.x}
          y={selection.y}
          selectedText={selection.text}
          onSelect={handleSelectCategory}
          onClose={clearSelection}
          onOpen={markMenuOpen}
        />
      )}
    </div>
  );
}
