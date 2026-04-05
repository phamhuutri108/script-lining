/**
 * usePdfTextExtraction.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook: Bóc tách toàn bộ dữ liệu text + tọa độ tuyệt đối từ PDF.js.
 *
 * ## Hệ tọa độ:
 *   - PDF.js: origin bottom-left (PostScript convention), đơn vị PDF points.
 *   - Viewport: origin top-left, đơn vị CSS pixel tại scale đã chọn.
 *   - Hook này trả về tọa độ **viewport** (CSS pixel, top-down) để tương thích
 *     với Fabric.js sẽ đặt chồng lên cùng lớp canvas.
 *
 * ## Dữ liệu đầu ra:
 *   - `TextBlock[]`  — từng mảnh text với vị trí (dùng cho tramline auto-detect)
 *   - `SceneHeader[]` — scene header đã được detect (INT/EXT/NỘI/NGOẠI...)
 *   - `TextLine[]`   — text đã gom nhóm theo dòng (cùng Y-band, ±2px threshold)
 *
 * ## Auto Detect Scene (architecture-rules.md §2):
 *   Regex cắt cấu trúc: "Scene#. INT/EXT. LOCATION - DAY/NIGHT"
 *   Hỗ trợ: Tiếng Anh (INT./EXT.) và Tiếng Việt (NỘI./NGOẠI./CẢNh)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { PDFPageProxy, TextItem } from "pdfjs-dist/types/src/display/api";
import type { PageViewport } from "pdfjs-dist/types/src/display/display_utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Một khối text cơ bản — tương ứng 1 TextItem từ PDF.js */
export interface TextBlock {
  /** Chuỗi text thô */
  text: string;
  /** Trang PDF (1-indexed) */
  pageNumber: number;
  /** Tọa độ Y đỉnh trên (CSS px, top-down, viewport space) */
  y: number;
  /** Chiều cao ước tính (CSS px) */
  height: number;
  /** Tọa độ X trái (CSS px) */
  x: number;
  /** Chiều rộng ước tính (CSS px) */
  width: number;
  /** Tọa độ Y đáy (= y + height) — dùng để check overlap với tramline segment */
  yBottom: number;
}

/** Một dòng text đã gom nhóm (nhiều TextBlock cùng Y-band) */
export interface TextLine {
  /** Text nối lại từ các block trong cùng dòng */
  fullText: string;
  /** Các block thuộc dòng này */
  blocks: TextBlock[];
  /** Trang */
  pageNumber: number;
  /** Y đỉnh trên của dòng (min trong các blocks) */
  y: number;
  /** Y đáy của dòng (max trong các blocks) */
  yBottom: number;
}

/** Một scene header đã detect — kết quả của Auto Detect */
export interface SceneHeader {
  /** Số scene (VD: "1", "12A") */
  sceneNumber: string;
  /** INT hoặc EXT */
  intExt: "INT" | "EXT" | "";
  /** Tên địa điểm (VD: "VĂN PHÒNG") */
  location: string;
  /** DAY hoặc NIGHT */
  dayNight: "DAY" | "NIGHT" | "";
  /** Text gốc đầy đủ */
  rawText: string;
  /** Trang */
  pageNumber: number;
  /** Y đỉnh trên trong viewport */
  y: number;
  /** Y đáy trong viewport */
  yBottom: number;
}

export interface PdfTextExtractionResult {
  /** Tất cả TextBlock trên trang — dùng bởi tramline segment auto-detect */
  blocks: TextBlock[];
  /** Tất cả dòng text đã gom nhóm */
  lines: TextLine[];
  /** Scene headers đã detect */
  sceneHeaders: SceneHeader[];
  /** Loading state */
  isExtracting: boolean;
  /** Lỗi nếu có */
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Ngưỡng Y (CSS px) để coi 2 TextBlock thuộc cùng một dòng.
 * Nếu |blockA.y - blockB.y| < Y_LINE_THRESHOLD → cùng dòng.
 */
const Y_LINE_THRESHOLD = 4;

/**
 * Regex detect scene header — hỗ trợ:
 *   "1. INT. VĂN PHÒNG - NGÀY"
 *   "INT. OFFICE - DAY"
 *   "EXT. PARKING LOT - NIGHT"
 *   "NỘI. VĂN PHÒNG - NGÀY"
 *   "NGOẠI. BÃI XE - ĐÊM"
 *   "CẢNH 1: INT. VĂN PHÒNG"
 */
const SCENE_HEADER_REGEX =
  /^(?:(?:CẢNH|SC\.?|SCENE)\s*(\d+[A-Z]?)[\s:.]+)?(?:(\d+[A-Z]?)\s*\.\s*)?(INT(?:\/EXT)?|EXT(?:\/INT)?|NỘI(?:\/NGOẠI)?|NGOẠI(?:\/NỘI)?|I\/E|E\/I)[.\s]+([^-\n]+?)(?:\s*[-–]\s*(.+))?$/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Chuyển đổi TextItem PDF → TextBlock viewport.
 *
 * PDF transform matrix: [a, b, c, d, e, f]
 *   e = x gốc (PDF units, bottom-left origin)
 *   f = y gốc (PDF units, bottom-left origin, là baseline của text)
 *
 * viewport.convertToViewportPoint(x, y) → [vpX, vpY]
 *   vpY là tọa độ BASELINE trong viewport space (top-down CSS px).
 *   Vì PDF y-axis bị flip, baseline PDF = top của glyph trong viewport.
 *
 * Nên:
 *   textTop    = vpY                        (baseline PDF = đỉnh visible trong CSS)
 *   textBottom = vpY + heightInViewport     (y tăng xuống trong CSS)
 */
function textItemToBlock(
  item: TextItem,
  pageNumber: number,
  viewport: PageViewport,
): TextBlock {
  const pdfX = item.transform[4];
  const pdfY = item.transform[5];

  // Chuyển tọa độ PDF → viewport CSS pixels
  const [vpX, vpY] = viewport.convertToViewportPoint(pdfX, pdfY);

  // Chiều cao trong PDF units → scale ra CSS pixels
  // viewport.scale = CSS pixels per PDF point
  const heightCss = Math.abs(item.height * viewport.scale);
  // Chiều rộng từ TextItem (đã ở viewport units sau transform nội bộ)
  const widthCss = Math.abs(item.width * viewport.scale);

  // Sau khi flip Y-axis:
  //   vpY là top của text block trong CSS (glyph top)
  //   yBottom = vpY + height
  const yTop = vpY;
  const yBottom = vpY + heightCss;

  return {
    text: item.str,
    pageNumber,
    x: vpX,
    y: yTop,
    height: heightCss,
    width: widthCss,
    yBottom,
  };
}

/**
 * Gom các TextBlock thành từng dòng dựa trên Y proximity.
 * Sắp xếp theo x để nối text theo thứ tự đọc.
 */
function groupBlocksIntoLines(blocks: TextBlock[]): TextLine[] {
  if (!blocks.length) return [];

  // Sort by y (top) first, then by x
  const sorted = [...blocks].sort((a, b) =>
    Math.abs(a.y - b.y) < Y_LINE_THRESHOLD ? a.x - b.x : a.y - b.y,
  );

  const lines: TextLine[] = [];
  let currentLine: TextBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const block = sorted[i];
    const lineRefY = currentLine[0].y;

    if (Math.abs(block.y - lineRefY) <= Y_LINE_THRESHOLD) {
      // Cùng dòng: thêm vào
      currentLine.push(block);
    } else {
      // Dòng mới: flush dòng hiện tại
      lines.push(buildTextLine(currentLine));
      currentLine = [block];
    }
  }

  // Flush dòng cuối
  if (currentLine.length) {
    lines.push(buildTextLine(currentLine));
  }

  return lines;
}

function buildTextLine(blocks: TextBlock[]): TextLine {
  // Sort theo x để nối đúng thứ tự
  const sorted = [...blocks].sort((a, b) => a.x - b.x);
  const fullText = sorted.map((b) => b.text).join(" ").trim();
  const yMin = Math.min(...blocks.map((b) => b.y));
  const yMax = Math.max(...blocks.map((b) => b.yBottom));

  return {
    fullText,
    blocks: sorted,
    pageNumber: blocks[0].pageNumber,
    y: yMin,
    yBottom: yMax,
  };
}

/**
 * Detect scene headers từ lines.
 * Map INT/EXT variants & Vietnamese equivalents ra chuẩn "INT" | "EXT".
 */
function detectSceneHeaders(lines: TextLine[]): SceneHeader[] {
  const headers: SceneHeader[] = [];

  for (const line of lines) {
    const match = SCENE_HEADER_REGEX.exec(line.fullText.trim());
    if (!match) continue;

    const [, sceneFromPrefix, sceneFromNumber, intExtRaw, locationRaw, dayNightRaw] = match;

    const sceneNumber = (sceneFromPrefix ?? sceneFromNumber ?? "").trim();

    // Normalize INT/EXT
    const intExtStr = intExtRaw?.toUpperCase() ?? "";
    let intExt: "INT" | "EXT" | "" = "";
    if (/^(INT|NỘI|I\/E)/.test(intExtStr)) intExt = "INT";
    else if (/^(EXT|NGOẠI|E\/I)/.test(intExtStr)) intExt = "EXT";

    // Normalize DAY/NIGHT
    const dayNightStr = (dayNightRaw ?? "").trim().toUpperCase();
    let dayNight: "DAY" | "NIGHT" | "" = "";
    if (/^(DAY|NGÀY|SÁNG|TRƯA|CHIỀU)/.test(dayNightStr)) dayNight = "DAY";
    else if (/^(NIGHT|ĐÊM|TỐI)/.test(dayNightStr)) dayNight = "NIGHT";

    headers.push({
      sceneNumber,
      intExt,
      location: locationRaw?.trim() ?? "",
      dayNight,
      rawText: line.fullText,
      pageNumber: line.pageNumber,
      y: line.y,
      yBottom: line.yBottom,
    });
  }

  return headers;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * usePdfTextExtraction
 *
 * Sử dụng:
 * ```tsx
 * const { blocks, lines, sceneHeaders, isExtracting } = usePdfTextExtraction({
 *   page,
 *   viewport,
 *   pageNumber: 1,
 * });
 * ```
 *
 * @param page    - PDFPageProxy từ pdfjs-dist (null khi chưa load)
 * @param viewport - PageViewport tương ứng với scale đang dùng để render canvas
 * @param pageNumber - Số trang (1-indexed)
 */
export function usePdfTextExtraction({
  page,
  viewport,
  pageNumber,
}: {
  page: PDFPageProxy | null;
  viewport: PageViewport | null;
  pageNumber: number;
}): PdfTextExtractionResult {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [lines, setLines] = useState<TextLine[]>([]);
  const [sceneHeaders, setSceneHeaders] = useState<SceneHeader[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async () => {
    if (!page || !viewport) {
      setBlocks([]);
      setLines([]);
      setSceneHeaders([]);
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      // Lấy toàn bộ text content từ PDF page
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
      });

      // Lọc chỉ lấy TextItem (bỏ TextMarkedContent không có str)
      const textItems = textContent.items.filter(
        (item): item is TextItem =>
          "str" in item &&
          typeof (item as TextItem).str === "string" &&
          (item as TextItem).str.trim().length > 0,
      );

      // Chuyển đổi sang TextBlock (viewport coordinates)
      const rawBlocks = textItems.map((item) =>
        textItemToBlock(item, pageNumber, viewport),
      );

      // Gom thành dòng
      const groupedLines = groupBlocksIntoLines(rawBlocks);

      // Detect scene headers
      const detectedScenes = detectSceneHeaders(groupedLines);

      setBlocks(rawBlocks);
      setLines(groupedLines);
      setSceneHeaders(detectedScenes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Text extraction failed: ${msg}`);
      console.error("[usePdfTextExtraction] error:", err);
    } finally {
      setIsExtracting(false);
    }
  }, [page, viewport, pageNumber]);

  useEffect(() => {
    extract();
  }, [extract]);

  return { blocks, lines, sceneHeaders, isExtracting, error };
}

/**
 * extractTextFromPageSync — Phiên bản không-hook để dùng trong server actions
 * hoặc khi cần extract ngoài React component tree.
 */
export async function extractTextFromPage(
  page: PDFPageProxy,
  viewport: PageViewport,
  pageNumber: number,
): Promise<{ blocks: TextBlock[]; lines: TextLine[]; sceneHeaders: SceneHeader[] }> {
  const textContent = await page.getTextContent({
    includeMarkedContent: false,
  });

  const textItems = textContent.items.filter(
    (item): item is TextItem =>
      "str" in item &&
      typeof (item as TextItem).str === "string" &&
      (item as TextItem).str.trim().length > 0,
  );

  const blocks = textItems.map((item) =>
    textItemToBlock(item, pageNumber, viewport),
  );
  const lines = groupBlocksIntoLines(blocks);
  const sceneHeaders = detectSceneHeaders(lines);

  return { blocks, lines, sceneHeaders };
}
