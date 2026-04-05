/**
 * PdfRenderer.tsx — Layer 1 (Base Layer) — Phase 4: Virtual Scrolling
 * ─────────────────────────────────────────────────────────────────────────────
 * ## Virtual Scrolling Architecture:
 *   - IntersectionObserver per PageSlot, root = scroll container
 *   - Buffer zone = ±2 page heights above/below viewport
 *   - Pages INSIDE buffer: render <SinglePage> with full canvas + text layer
 *   - Pages OUTSIDE buffer: render lightweight placeholder <div> (same height)
 *   - PDFPageProxy objects are cached in Map<number, PDFPageProxy> ref — NEVER destroyed
 *   - Progressive loading: page 1 loads first (dimensions), rest loaded on-demand
 *
 * ## DOM per page (when in buffer):
 * ```
 * <div.page-slot data-page={n}>
 *   <div.pdf-page-container>    ← position: relative
 *     <canvas.pdf-canvas />     ← Layer 1a: PDF graphics
 *     <div.pdf-text-layer />    ← Layer 1b: invisible text spans
 *     {renderOverlay(...)}      ← Slot for Layer 2 (Fabric.js)
 *   </div>
 * </div>
 * ```
 *
 * ## Memory Management:
 *   - PDFDocumentProxy destroyed only when src changes or component unmounts
 *   - PDFPageProxy NEVER destroyed (IntersectionObserver just unmounts canvas)
 *   - render tasks cancelled in SinglePage cleanup
 *   - TextLayer cancelled in SinglePage cleanup
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  usePdfTextExtraction,
  type TextBlock,
  type TextLine,
  type SceneHeader,
} from "@/lib/hooks/usePdfTextExtraction";
import type { PDFPageProxy, PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import type { PageViewport } from "pdfjs-dist/types/src/display/display_utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfTextExtractionData {
  blocks: TextBlock[];
  lines: TextLine[];
  sceneHeaders: SceneHeader[];
  pageNumber: number;
}

export interface PdfRendererProps {
  /**
   * URL string (http/https hoặc blob:) hoặc ArrayBuffer của file PDF.
   * null = không hiển thị gì.
   */
  src: string | ArrayBuffer | null;

  /**
   * Scale render so với kích thước PDF gốc.
   * 1.0 = 72 DPI (kích thước gốc), 1.5 = 108 DPI (mặc định).
   */
  scale?: number;

  /**
   * Callback gọi sau khi mỗi trang render xong + text extraction hoàn tất.
   * Dùng để feed dữ liệu vào Zustand store cho Auto Detect algorithm.
   */
  onTextExtracted?: (data: PdfTextExtractionData) => void;

  /**
   * Callback gọi khi số trang thay đổi (document load xong).
   */
  onDocumentLoaded?: (totalPages: number) => void;

  /**
   * Slot cho Layer 2: CanvasOverlay / Fabric.js.
   * Render bên trong wrapper của mỗi trang, đè lên canvas PDF.
   */
  renderOverlay?: (pageInfo: {
    pageNumber: number;
    width: number;
    height: number;
  }) => React.ReactNode;

  className?: string;
}

// ─── Worker Initialization (chạy 1 lần, lazy) ────────────────────────────────

let workerInitialized = false;

async function ensurePdfjsWorker() {
  if (workerInitialized) return;
  workerInitialized = true;
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// ─── Sub-component: SinglePage ────────────────────────────────────────────────

interface SinglePageProps {
  page: PDFPageProxy;
  pageNumber: number;
  scale: number;
  onTextExtracted?: (data: PdfTextExtractionData) => void;
  renderOverlay?: PdfRendererProps["renderOverlay"];
}

function SinglePage({
  page,
  pageNumber,
  scale,
  onTextExtracted,
  renderOverlay,
}: Readonly<SinglePageProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  // Viewport calculated once per page instance (stable for lifetime of component)
  const viewport = useRef<PageViewport>(page.getViewport({ scale })).current;

  const [renderDone, setRenderDone] = useState(false);

  // ── Render PDF canvas ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const scaledVp = page.getViewport({ scale: scale * dpr });

    canvas.width = scaledVp.width;
    canvas.height = scaledVp.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const renderTask = page.render({
      canvasContext: ctx,
      canvas,
      viewport: scaledVp,
      transform: [dpr, 0, 0, dpr, 0, 0],
    });

    renderTask.promise
      .then(() => setRenderDone(true))
      .catch((err) => {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`[PdfRenderer] Page ${pageNumber} render error:`, err);
        }
      });

    return () => {
      renderTask.cancel();
    };
  }, [page, pageNumber, scale, viewport]);

  // ── Render Text Layer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!renderDone) return;

    const container = textLayerRef.current;
    if (!container) return;

    container.replaceChildren();

    let textLayer: import("pdfjs-dist").TextLayer | null = null;

    (async () => {
      try {
        const { TextLayer } = await import("pdfjs-dist");
        textLayer = new TextLayer({
          textContentSource: page.streamTextContent(),
          container,
          viewport,
        });
        await textLayer.render();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("cancelled") && !msg.includes("cancel")) {
          console.warn(`[PdfRenderer] TextLayer page ${pageNumber}:`, err);
        }
      }
    })();

    return () => {
      if (textLayer) {
        try { textLayer.cancel(); } catch { /* ignore */ }
        textLayer = null;
      }
      container.replaceChildren();
    };
  }, [renderDone, page, pageNumber, viewport]);

  // ── Text Extraction ────────────────────────────────────────────────────────
  const { blocks, lines, sceneHeaders, isExtracting } = usePdfTextExtraction({
    page: renderDone ? page : null,
    viewport: renderDone ? viewport : null,
    pageNumber,
  });

  const prevExtracting = useRef(false);
  useEffect(() => {
    if (prevExtracting.current && !isExtracting && blocks.length > 0) {
      onTextExtracted?.({ blocks, lines, sceneHeaders, pageNumber });
    }
    prevExtracting.current = isExtracting;
  }, [isExtracting, blocks, lines, sceneHeaders, pageNumber, onTextExtracted]);

  return (
    <div
      className="pdf-page-container relative select-text"
      data-page-number={pageNumber}
      style={{
        width: viewport.width,
        height: viewport.height,
        boxShadow: "0 2px 12px rgba(24,24,27,0.10), 0 0 0 1px rgba(24,24,27,0.06)",
        background: "#FFFFFF",
      }}
    >
      {/* Layer 1a: PDF Canvas */}
      <canvas
        ref={canvasRef}
        className="pdf-canvas absolute inset-0"
        style={{ display: "block" }}
        aria-label={`Trang ${pageNumber}`}
      />

      {/* Layer 1b: Text Layer (invisible, allows text selection) */}
      <div
        ref={textLayerRef}
        className="pdf-text-layer absolute inset-0 overflow-hidden"
        style={{
          color: "transparent",
          lineHeight: 1,
          userSelect: "text",
          WebkitUserSelect: "text",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Slot for Layer 2: Fabric.js overlay */}
      {renderOverlay?.({ pageNumber, width: viewport.width, height: viewport.height })}

      {/* Page number indicator */}
      <div
        className="absolute bottom-2 right-3 select-none pointer-events-none"
        style={{
          fontSize: 10,
          color: "rgba(24,24,27,0.3)",
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 500,
          letterSpacing: "0.05em",
        }}
      >
        {pageNumber}
      </div>
    </div>
  );
}

// ─── Sub-component: PagePlaceholder ──────────────────────────────────────────

function PagePlaceholder({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        background: "#FFFFFF",
        boxShadow: "0 2px 12px rgba(24,24,27,0.10), 0 0 0 1px rgba(24,24,27,0.06)",
      }}
    />
  );
}

// ─── Sub-component: PageSlot ──────────────────────────────────────────────────

interface PageSlotProps {
  pageNumber: number;
  defaultWidth: number;
  defaultHeight: number;
  /** Scroll container element — used as IntersectionObserver root */
  scrollRoot: HTMLDivElement;
  /** Returns a cached or freshly loaded PDFPageProxy */
  getProxy: (pageNumber: number) => Promise<PDFPageProxy>;
  scale: number;
  onTextExtracted?: PdfRendererProps["onTextExtracted"];
  renderOverlay?: PdfRendererProps["renderOverlay"];
}

function PageSlot({
  pageNumber,
  defaultWidth,
  defaultHeight,
  scrollRoot,
  getProxy,
  scale,
  onTextExtracted,
  renderOverlay,
}: Readonly<PageSlotProps>) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [inBuffer, setInBuffer] = useState(false);
  const [proxy, setProxy] = useState<PDFPageProxy | null>(null);

  // ── IntersectionObserver: buffer zone = ±2 page heights ───────────────────
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    const bufferPx = defaultHeight * 2;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInBuffer(entry.isIntersecting);
      },
      {
        root: scrollRoot,
        rootMargin: `${bufferPx}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot, defaultHeight]);

  // ── Load PDFPageProxy when page enters buffer ──────────────────────────────
  useEffect(() => {
    if (!inBuffer || proxy) return;

    let cancelled = false;

    getProxy(pageNumber).then((p) => {
      if (!cancelled) setProxy(p);
    }).catch((err) => {
      console.warn(`[PdfRenderer] Failed to load page ${pageNumber}:`, err);
    });

    return () => {
      cancelled = true;
    };
  }, [inBuffer, pageNumber, proxy, getProxy]);

  // ── Actual page dimensions (from proxy viewport) or default ───────────────
  const [pageDims, setPageDims] = useState({ width: defaultWidth, height: defaultHeight });

  useEffect(() => {
    if (!proxy) return;
    const vp = proxy.getViewport({ scale });
    setPageDims({ width: vp.width, height: vp.height });
  }, [proxy, scale]);

  return (
    <div
      ref={slotRef}
      data-page={pageNumber}
      style={{
        width: pageDims.width,
        minHeight: pageDims.height,
        marginBottom: 16,
        // Reserve space even when placeholder shown (prevents layout shift)
        flexShrink: 0,
      }}
    >
      {proxy && inBuffer ? (
        <SinglePage
          page={proxy}
          pageNumber={pageNumber}
          scale={scale}
          onTextExtracted={onTextExtracted}
          renderOverlay={renderOverlay}
        />
      ) : (
        <PagePlaceholder width={pageDims.width} height={pageDims.height} />
      )}
    </div>
  );
}

// ─── Main Component: PdfRenderer ──────────────────────────────────────────────

export function PdfRenderer({
  src,
  scale = 1.5,
  onTextExtracted,
  onDocumentLoaded,
  renderOverlay,
  className,
}: Readonly<PdfRendererProps>) {
  // Scroll container element (callback ref → state to trigger re-render)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // PDF document state
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const proxyCache = useRef<Map<number, PDFPageProxy>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [defaultPageSize, setDefaultPageSize] = useState({ width: 918, height: 1188 }); // Letter at scale 1.5
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Increments on each new doc load to force PageSlot remount (clears stale proxy state)
  const [docKey, setDocKey] = useState(0);

  // ── getProxy: stable callback, only reads refs ────────────────────────────
  const getProxy = useCallback(async (pageNumber: number): Promise<PDFPageProxy> => {
    const cached = proxyCache.current.get(pageNumber);
    if (cached) return cached;

    const doc = pdfDocRef.current;
    if (!doc) throw new Error("No PDF document loaded");

    const p = await doc.getPage(pageNumber);
    proxyCache.current.set(pageNumber, p);
    return p;
  }, []); // stable — only accesses mutable refs

  // ── loadPdf ───────────────────────────────────────────────────────────────
  const loadPdf = useCallback(
    async (source: string | ArrayBuffer) => {
      // Cancel any in-flight load
      if (abortRef.current) {
        abortRef.current.abort("new-src");
        abortRef.current = null;
      }

      // Destroy previous document
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }

      // Clear proxy cache (proxies from old doc are invalid)
      proxyCache.current.clear();

      const abort = new AbortController();
      abortRef.current = abort;

      setLoading(true);
      setError(null);
      setTotalPages(0); // unmounts all PageSlots

      try {
        await ensurePdfjsWorker();
        if (abort.signal.aborted) return;

        const pdfjsLib = await import("pdfjs-dist");
        if (abort.signal.aborted) return;

        const loadingTask = pdfjsLib.getDocument(
          typeof source === "string" ? source : { data: source },
        );

        const pdfDoc = await loadingTask.promise;
        if (abort.signal.aborted) {
          pdfDoc.destroy().catch(() => {});
          return;
        }

        pdfDocRef.current = pdfDoc;

        const total = pdfDoc.numPages;
        onDocumentLoaded?.(total);

        // Load page 1 immediately to determine standard page dimensions
        const page1 = await pdfDoc.getPage(1);
        if (abort.signal.aborted) return;

        proxyCache.current.set(1, page1);
        const vp = page1.getViewport({ scale });
        setDefaultPageSize({ width: vp.width, height: vp.height });

        // Now show all page slots (each loads its proxy lazily via IntersectionObserver)
        setTotalPages(total);
        setDocKey((k) => k + 1);
      } catch (err) {
        if (abort.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Không thể tải PDF: ${msg}`);
        console.error("[PdfRenderer] load error:", err);
      } finally {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [scale, onDocumentLoaded],
  );

  // ── React to src changes ───────────────────────────────────────────────────
  useEffect(() => {
    if (!src) {
      abortRef.current?.abort("src-null");
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
      proxyCache.current.clear();
      setTotalPages(0);
      setError(null);
      setLoading(false);
      return;
    }

    loadPdf(src);
  }, [src, loadPdf]);

  // ── Global unmount cleanup ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort("unmount");
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
      proxyCache.current.clear();
    };
  }, []);

  // ─── Render States ─────────────────────────────────────────────────────────

  if (!src) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center h-full gap-4", className)}
        style={{ background: "#F0EEE9" }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(24,24,27,0.06)" }}
        >
          <svg
            width="36" height="36" viewBox="0 0 24 24"
            fill="none" stroke="#A1A1AA" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold text-[#3F3F46]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Chưa có kịch bản
          </p>
          <p className="text-[12px] text-[#A1A1AA] mt-1">
            Upload file PDF hoặc FDX để bắt đầu
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-sm animate-pulse"
                style={{
                  width: 420 - i * 40,
                  height: 12,
                  background: "rgba(24,24,27,0.08)",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <p className="text-[11px] text-[#A1A1AA] mt-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Đang tải kịch bản...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div
          className="px-4 py-3 rounded-lg text-[13px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#dc2626",
            border: "1px solid rgba(239,68,68,0.2)",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setScrollEl}
      className={cn(
        "pdf-renderer overflow-auto",
        "flex flex-col items-center py-6 px-4",
        className,
      )}
      style={{ background: "#E8E6E1", minHeight: "100%" }}
    >
      {/* Render PageSlots only once scroll container is mounted */}
      {scrollEl && totalPages > 0 &&
        Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <PageSlot
            key={`doc-${docKey}-page-${pageNum}`}
            pageNumber={pageNum}
            defaultWidth={defaultPageSize.width}
            defaultHeight={defaultPageSize.height}
            scrollRoot={scrollEl}
            getProxy={getProxy}
            scale={scale}
            onTextExtracted={onTextExtracted}
            renderOverlay={renderOverlay}
          />
        ))
      }
    </div>
  );
}
