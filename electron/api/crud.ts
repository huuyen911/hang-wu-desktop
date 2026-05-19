import { all, get, persist, run } from '../db/connection'
import { HttpError } from './errors'

export interface CrudConfig<B> {
  /** Tên bảng. */
  table: string
  /** Câu SELECT đầy đủ cho list (kèm ORDER BY). */
  listSql: string
  /** Thông điệp 404 khi không tìm thấy bản ghi. */
  notFoundMsg: string
  /** Thông điệp 409 khi vi phạm ràng buộc UNIQUE. */
  uniqueMsg: string
  /** Các cột ghi (đúng thứ tự bind), KHÔNG gồm id/updated_at. */
  columns: string[]
  /** Kiểm tra dữ liệu; trả thông điệp lỗi (400) hoặc null nếu hợp lệ. */
  validate: (body: B, id?: string) => string | null
  /** Map body → mảng giá trị bind, cùng thứ tự với `columns`. */
  toValues: (body: B) => unknown[]
}

// Chuẩn hoá lỗi ghi: UNIQUE → 409, còn lại → 500 (giữ đúng hành vi backend cũ).
function failWrite(e: unknown, uniqueMsg: string): never {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('UNIQUE')) throw new HttpError(409, uniqueMsg)
  throw new HttpError(500, 'Lỗi máy chủ')
}

export function listRows<B>(cfg: CrudConfig<B>): unknown[] {
  return all(cfg.listSql)
}

export function createRow<B>(cfg: CrudConfig<B>, body: B): unknown {
  const err = cfg.validate(body)
  if (err) throw new HttpError(400, err)

  const placeholders = cfg.columns.map(() => '?').join(', ')
  try {
    const { lastInsertRowid } = run(
      `INSERT INTO ${cfg.table} (${cfg.columns.join(', ')}) VALUES (${placeholders})`,
      cfg.toValues(body),
    )
    const row = get(`SELECT * FROM ${cfg.table} WHERE id = ?`, [lastInsertRowid])
    persist()
    return row
  } catch (e) {
    failWrite(e, cfg.uniqueMsg)
  }
}

export function updateRow<B>(cfg: CrudConfig<B>, id: string, body: B): unknown {
  const err = cfg.validate(body, id)
  if (err) throw new HttpError(400, err)

  const setClause = cfg.columns.map((c) => `${c}=?`).join(', ')
  try {
    run(`UPDATE ${cfg.table} SET ${setClause}, updated_at=datetime('now') WHERE id=?`, [
      ...cfg.toValues(body),
      id,
    ])
    const updated = get(`SELECT * FROM ${cfg.table} WHERE id = ?`, [id])
    if (!updated) throw new HttpError(404, cfg.notFoundMsg)
    persist()
    return updated
  } catch (e) {
    if (e instanceof HttpError) throw e
    failWrite(e, cfg.uniqueMsg)
  }
}

export function deleteRow<B>(cfg: CrudConfig<B>, id: string): { success: true } {
  const existing = get(`SELECT id FROM ${cfg.table} WHERE id = ?`, [id])
  if (!existing) throw new HttpError(404, cfg.notFoundMsg)
  run(`DELETE FROM ${cfg.table} WHERE id = ?`, [id])
  persist()
  return { success: true }
}
