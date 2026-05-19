import { all, get, persist, run } from '../db/connection'
import { HttpError } from './errors'

// Cột nhẹ cho danh sách lịch sử (KHÔNG kèm `data` để list không nặng).
const META_COLS = 'id, ten, file_name, row_count, created_at, updated_at'

interface SessionBody {
  ten?: unknown
  file_name?: unknown
  rows?: unknown
}

function requireName(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, 'Tên phiên là bắt buộc')
  return v.trim()
}

function requireRows(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw new HttpError(400, 'Dữ liệu phiên không hợp lệ')
  return v
}

export function listSessions(): unknown[] {
  return all(`SELECT ${META_COLS} FROM sales_session ORDER BY created_at DESC, id DESC`)
}

export function getSession(id: string): unknown {
  const row = get<{ data: string }>('SELECT * FROM sales_session WHERE id = ?', [id])
  if (!row) throw new HttpError(404, 'Không tìm thấy phiên')
  const { data, ...meta } = row
  return { ...meta, rows: data ? JSON.parse(data) : [] }
}

export function createSession(body: SessionBody): unknown {
  const ten = requireName(body.ten)
  const rows = requireRows(body.rows)
  const fileName = typeof body.file_name === 'string' ? body.file_name : ten

  const { lastInsertRowid } = run(
    'INSERT INTO sales_session (ten, file_name, row_count, data) VALUES (?, ?, ?, ?)',
    [ten, fileName, rows.length, JSON.stringify(rows)],
  )
  persist()
  return getSession(String(lastInsertRowid))
}

// Đổi tên và/hoặc thay toàn bộ dòng (autosave khi chỉnh sửa local).
export function updateSession(id: string, body: SessionBody): unknown {
  const existing = get('SELECT id FROM sales_session WHERE id = ?', [id])
  if (!existing) throw new HttpError(404, 'Không tìm thấy phiên')

  const sets: string[] = []
  const params: unknown[] = []

  if (body.ten !== undefined) {
    sets.push('ten = ?')
    params.push(requireName(body.ten))
  }
  if (body.rows !== undefined) {
    const rows = requireRows(body.rows)
    sets.push('data = ?', 'row_count = ?')
    params.push(JSON.stringify(rows), rows.length)
  }
  if (sets.length === 0) throw new HttpError(400, 'Không có thay đổi nào')

  sets.push("updated_at = datetime('now', 'localtime')")
  run(`UPDATE sales_session SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
  persist()

  return get(`SELECT ${META_COLS} FROM sales_session WHERE id = ?`, [id])
}

export function deleteSession(id: string): { success: true } {
  const existing = get('SELECT id FROM sales_session WHERE id = ?', [id])
  if (!existing) throw new HttpError(404, 'Không tìm thấy phiên')
  run('DELETE FROM sales_session WHERE id = ?', [id])
  persist()
  return { success: true }
}
