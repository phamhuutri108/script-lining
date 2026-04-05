import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Lining App",
  description: "Hệ thống Line Script & Shotlist chuyên nghiệp dành cho đoàn phim",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
