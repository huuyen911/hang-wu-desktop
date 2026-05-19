import { all, exec, persist, run, transaction } from '../db/connection'
import { HttpError } from './errors'

// Sao lưu / phục hồi TOÀN BỘ hệ thống ra 1 file JSON.
//
// Phục hồi = xóa sạch rồi nạp lại nguyên vẹn (giữ nguyên id) trong 1
// transaction với `defer_foreign_keys = ON`, nên thứ tự insert không làm vỡ
// các ràng buộc khóa ngoại (bảng nối Nhóm↔SP `ON DELETE CASCADE`, và phân cấp
// tự tham chiếu của CEO). Lỗi bất kỳ → ROLLBACK, không persist → file đĩa
// nguyên trạng. persist() chỉ gọi sau khi COMMIT thành công.

export const BACKUP_FORMAT = 'hang-wu-backup'
export const BACKUP_VERSION = 1

// Bảng dữ liệu được sao lưu (KHÔNG gồm _migrations — do migrate tự quản lý).
// Thứ tự dùng để INSERT: cha trước, bảng nối sau. Khi xóa thì đảo ngược
// (con/nối trước) — dù defer_foreign_keys đã bật, vẫn giữ thứ tự hợp lý.
const TABLES = [
  'san_pham',
  'nhom_san_pham',
  'ceo',
  'sales_session',
  'nhom_san_pham_san_pham',
] as const

type TableName = (typeof TABLES)[number]

export interface BackupFile {
  format: string
  version: number
  app_version: string
  exported_at: string
  tables: Record<string, Record<string, unknown>[]>
}

export interface BackupSummary {
  /** Số dòng theo từng bảng. */
  counts: Record<string, number>
  /** Tổng số dòng. */
  total: number
}

function tableColumns(table: TableName): string[] {
  // PRAGMA table_info trả mỗi cột 1 dòng, cột `name` là tên cột.
  return all<{ name: string }>(`PRAGMA table_info(${table})`).map((r) => r.name)
}

/** Đọc toàn bộ DB thành đối tượng backup (kèm metadata để validate khi nạp). */
export function buildBackup(appVersion: string): BackupFile {
  const tables: Record<string, Record<string, unknown>[]> = {}
  for (const t of TABLES) {
    tables[t] = all<Record<string, unknown>>(`SELECT * FROM ${t}`)
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app_version: appVersion,
    exported_at: new Date().toISOString(),
    tables,
  }
}

export function summarize(file: BackupFile): BackupSummary {
  const counts: Record<string, number> = {}
  let total = 0
  for (const t of TABLES) {
    const n = Array.isArray(file.tables[t]) ? file.tables[t].length : 0
    counts[t] = n
    total += n
  }
  return { counts, total }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Kiểm tra cấu trúc file; ném HttpError(400) với thông điệp tiếng Việt rõ ràng. */
export function validateBackup(raw: unknown): BackupFile {
  if (!isObject(raw)) throw new HttpError(400, 'File sao lưu không hợp lệ')
  if (raw.format !== BACKUP_FORMAT) {
    throw new HttpError(400, 'File này không phải bản sao lưu của hệ thống')
  }
  if (typeof raw.version !== 'number' || raw.version < 1 || raw.version > BACKUP_VERSION) {
    throw new HttpError(400, `Phiên bản sao lưu không được hỗ trợ (v${String(raw.version)})`)
  }
  if (!isObject(raw.tables)) {
    throw new HttpError(400, 'File sao lưu thiếu phần dữ liệu (tables)')
  }
  for (const t of TABLES) {
    const rows = (raw.tables as Record<string, unknown>)[t]
    if (rows === undefined) continue // bảng trống/thiếu → coi như 0 dòng
    if (!Array.isArray(rows)) throw new HttpError(400, `Dữ liệu bảng "${t}" không hợp lệ`)
    if (rows.some((r) => !isObject(r))) {
      throw new HttpError(400, `Dữ liệu bảng "${t}" chứa dòng không hợp lệ`)
    }
  }
  return raw as unknown as BackupFile
}

/**
 * Xóa sạch toàn bộ rồi nạp lại từ `file`. Atomic: COMMIT thành công mới
 * persist; lỗi → ROLLBACK, đĩa nguyên trạng. Trả về số dòng đã nạp.
 */
export function restoreBackup(file: BackupFile): BackupSummary {
  try {
    transaction(() => {
      // Hoãn kiểm tra FK tới lúc COMMIT → thứ tự xóa/chèn không gây lỗi FK
      // (CEO tự trỏ chính nó, bảng nối Nhóm↔SP). Tự reset sau COMMIT.
      exec('PRAGMA defer_foreign_keys = ON')

      // Xóa: bảng nối/con trước, cha sau (đảo thứ tự TABLES).
      for (const t of [...TABLES].reverse()) {
        run(`DELETE FROM ${t}`)
      }

      // Chèn: cha trước, bảng nối sau. Giữ nguyên id để mọi liên kết khớp.
      for (const t of TABLES) {
        const rows = file.tables[t]
        if (!Array.isArray(rows) || rows.length === 0) continue
        const cols = tableColumns(t)
        const placeholders = cols.map(() => '?').join(', ')
        const insertSql = `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`
        for (const row of rows) {
          // Chỉ lấy đúng các cột bảng đang có; cột thiếu trong file → null.
          run(
            insertSql,
            cols.map((c) => (row[c] === undefined ? null : (row[c] as unknown))),
          )
        }
      }
    })
  } catch (e) {
    if (e instanceof HttpError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new HttpError(500, `Phục hồi thất bại, dữ liệu được giữ nguyên: ${msg}`)
  }

  // Tới đây COMMIT đã thành công → ghi ra đĩa.
  persist()
  return summarize(file)
}
