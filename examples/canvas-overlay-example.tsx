'use client';
import React, { useRef } from 'react';

export default function WorkspaceContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden">
      {/* Lớp 1: PDF Base Layer */}
      <div className="absolute inset-0 z-0">
        {/* Component PdfRenderer gọi file từ Cloudflare R2 */}
      </div>

      {/* Lớp 2: Fabric.js Draw Layer (Trong suốt, nằm đè lên) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
         <canvas ref={canvasRef} className="pointer-events-auto drop-shadow-2xl" />
      </div>

      {/* Lớp 3: React DOM UI Layer (Giao diện điều khiển) */}
      <div className="absolute top-0 left-0 z-20 w-64 h-full bg-surface-container-highest">
         {/* Thanh Sidebar Công Cụ (Draw, Split, Colors) */}
      </div>
    </div>
  );
}