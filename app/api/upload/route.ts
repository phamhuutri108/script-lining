/**
 * POST /api/upload
 * Nhận file PDF qua FormData, upload lên Cloudflare R2, trả về public URL.
 *
 * Body: FormData { file: File (application/pdf) }
 * Response: { url: string } | { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "edge";

// ─── R2 Client (singleton, lazy init) ─────────────────────────────────────────

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials chưa được cấu hình trong .env.local");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file trong request" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Chỉ chấp nhận file PDF" }, { status: 400 });
    }

    const maxSizeMB = 50;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json({ error: `File quá lớn (tối đa ${maxSizeMB}MB)` }, { status: 413 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!bucket || !publicUrl) {
      return NextResponse.json(
        { error: "R2_BUCKET_NAME và R2_PUBLIC_URL chưa được cấu hình" },
        { status: 500 },
      );
    }

    // Tạo key duy nhất: scripts/<timestamp>-<sanitized-filename>
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `scripts/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/pdf",
        ContentLength: body.byteLength,
      }),
    );

    const url = `${publicUrl.replace(/\/$/, "")}/${key}`;
    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    console.error("[upload/route] R2 upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
