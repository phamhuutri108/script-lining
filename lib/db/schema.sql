-- ============================================================
-- Cloudflare D1 Schema — Script Lining App
-- Theo data-models.md: ITramline + IShotlistRow
-- ============================================================

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
-- Mỗi dự án phim là một "project", chứa nhiều kịch bản
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,             -- UUID
  name        TEXT NOT NULL,               -- Tên phim
  owner_id    TEXT NOT NULL,               -- Cloudflare User ID (D1 phân quyền)
  r2_pdf_key  TEXT,                        -- Key file PDF/FDX trong Cloudflare R2
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── TRAMLINES ────────────────────────────────────────────────────────────────
-- Map 1-1 với interface ITramline (data-models.md)
CREATE TABLE IF NOT EXISTS tramlines (
  id          TEXT PRIMARY KEY,            -- UUID
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  start_y     REAL NOT NULL,
  end_y       REAL NOT NULL,
  shot_name   TEXT NOT NULL DEFAULT '',    -- VD: 1A, 1B
  shot_size   TEXT NOT NULL DEFAULT '',    -- VD: MCU, CU, WIDE
  color       TEXT NOT NULL DEFAULT '#19e66f',
  -- segments lưu dạng JSON array của ILineSegment[]
  -- [{"type":"straight","startY":0,"endY":150},{"type":"zigzag","startY":150,"endY":300}]
  segments    TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tramlines_project_id ON tramlines(project_id);
CREATE INDEX IF NOT EXISTS idx_tramlines_page_number ON tramlines(project_id, page_number);

-- ─── SHOTLIST ROWS ────────────────────────────────────────────────────────────
-- Map 1-1 với interface IShotlistRow (data-models.md)
-- tramline_id là KHÓA NGOẠI — binding 2 chiều với Canvas
CREATE TABLE IF NOT EXISTS shotlist_rows (
  id               TEXT PRIMARY KEY,       -- UUID (tách biệt với tramline_id để dễ query)
  tramline_id      TEXT NOT NULL UNIQUE REFERENCES tramlines(id) ON DELETE CASCADE,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  row_number       INTEGER NOT NULL,
  scene_number     TEXT NOT NULL DEFAULT '',
  location         TEXT NOT NULL DEFAULT '',
  shot_name        TEXT NOT NULL DEFAULT '',  -- Đồng bộ với tramlines.shot_name
  int_ext          TEXT NOT NULL DEFAULT '' CHECK (int_ext IN ('INT', 'EXT', '')),
  day_night        TEXT NOT NULL DEFAULT '' CHECK (day_night IN ('DAY', 'NIGHT', '')),
  description      TEXT NOT NULL DEFAULT '',
  auto_detect_text TEXT NOT NULL DEFAULT '', -- Text từ đoạn straight (architecture-rules.md §2)
  -- dialogue và subjects lưu dạng JSON array
  dialogue         TEXT NOT NULL DEFAULT '[]', -- string[]
  subjects         TEXT NOT NULL DEFAULT '[]', -- string[] — nhân vật in hoa từ Action
  script_time      TEXT NOT NULL DEFAULT '',
  shot_size        TEXT NOT NULL DEFAULT '',   -- Đồng bộ với tramlines.shot_size
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shotlist_project_id ON shotlist_rows(project_id);
CREATE INDEX IF NOT EXISTS idx_shotlist_row_number ON shotlist_rows(project_id, row_number);

-- ─── TRIGGER: Auto-sync shot_name + shot_size (Two-way binding, phía DB) ──────
-- Khi tramline thay đổi shot_name/shot_size → cập nhật shotlist_row tương ứng
CREATE TRIGGER IF NOT EXISTS sync_tramline_to_shotlist
AFTER UPDATE OF shot_name, shot_size ON tramlines
BEGIN
  UPDATE shotlist_rows
  SET
    shot_name  = NEW.shot_name,
    shot_size  = NEW.shot_size,
    updated_at = datetime('now')
  WHERE tramline_id = NEW.id;
END;

-- Khi shotlist thay đổi shot_name/shot_size → cập nhật tramline tương ứng
CREATE TRIGGER IF NOT EXISTS sync_shotlist_to_tramline
AFTER UPDATE OF shot_name, shot_size ON shotlist_rows
BEGIN
  UPDATE tramlines
  SET
    shot_name  = NEW.shot_name,
    shot_size  = NEW.shot_size,
    updated_at = datetime('now')
  WHERE id = NEW.tramline_id;
END;

-- ─── TRIGGER: Auto-update updated_at ─────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS update_tramlines_updated_at
AFTER UPDATE ON tramlines
BEGIN
  UPDATE tramlines SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_shotlist_updated_at
AFTER UPDATE ON shotlist_rows
BEGIN
  UPDATE shotlist_rows SET updated_at = datetime('now') WHERE id = NEW.id;
END;
