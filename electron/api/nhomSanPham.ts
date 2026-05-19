import { all, get, persist, run, transaction } from '../db/connection'
import { HttpError } from './errors'
import { isThuongHieu } from './validation'

const SELECT_NHOM_SQL = `
  SELECT n.id, n.ten_nhom, n.thuong_hieu, n.created_at, n.updated_at,
         json_group_array(nsp.san_pham_id) FILTER (WHERE nsp.san_pham_id IS NOT NULL) AS san_pham_ids
  FROM nhom_san_pham n
  LEFT JOIN nhom_san_pham_san_pham nsp ON n.id = nsp.nhom_san_pham_id
`

function parseNhom(row: Record<string, unknown>) {
  return {
    ...row,
    san_pham_ids: row.san_pham_ids ? JSON.parse(row.san_pham_ids as string) : [],
  }
}

interface NhomBody {
  ten_nhom?: string
  thuong_hieu?: string
  san_pham_ids?: unknown
}

// Chuẩn hoá + kiểm tra input dùng chung cho create/update.
function parseBody(body: NhomBody): { tenNhom: string; thuongHieu: string; spIds: number[] } {
  const { ten_nhom, thuong_hieu, san_pham_ids } = body
  if (!ten_nhom?.trim()) throw new HttpError(400, 'Tên nhóm sản phẩm là bắt buộc')
  if (!isThuongHieu(thuong_hieu)) throw new HttpError(400, 'Thương hiệu không hợp lệ')

  const spIds = Array.isArray(san_pham_ids) ? san_pham_ids.map(Number) : []
  if (spIds.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new HttpError(400, 'Danh sách sản phẩm không hợp lệ')
  }
  return { tenNhom: ten_nhom.trim(), thuongHieu: thuong_hieu as string, spIds }
}

function failWrite(e: unknown): never {
  if (e instanceof HttpError) throw e
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('UNIQUE')) throw new HttpError(409, 'Tên nhóm sản phẩm đã tồn tại')
  if (msg.includes('FOREIGN KEY')) throw new HttpError(400, 'Một số sản phẩm được chọn không tồn tại')
  throw new HttpError(500, 'Lỗi máy chủ')
}

export function listNhom(): unknown[] {
  const rows = all(SELECT_NHOM_SQL + ' GROUP BY n.id ORDER BY n.ten_nhom')
  return rows.map(parseNhom)
}

export function createNhom(body: NhomBody): unknown {
  const { tenNhom, thuongHieu, spIds } = parseBody(body)

  // Tạo nhóm + gắn thành viên trong 1 transaction: lỗi FK → rollback toàn bộ,
  // không để lại nhóm rỗng mồ côi (gọn hơn cơ chế bù trừ thủ công cũ).
  let newId: number
  try {
    newId = transaction(() => {
      const { lastInsertRowid } = run(
        'INSERT INTO nhom_san_pham (ten_nhom, thuong_hieu) VALUES (?, ?)',
        [tenNhom, thuongHieu],
      )
      for (const spId of spIds) {
        run('INSERT INTO nhom_san_pham_san_pham (nhom_san_pham_id, san_pham_id) VALUES (?, ?)', [
          lastInsertRowid,
          spId,
        ])
      }
      return lastInsertRowid
    })
  } catch (e) {
    failWrite(e)
  }

  const rec = get(SELECT_NHOM_SQL + ' WHERE n.id = ? GROUP BY n.id', [newId]) as Record<
    string,
    unknown
  >
  persist()
  return parseNhom(rec)
}

export function updateNhom(id: string, body: NhomBody): unknown {
  const { tenNhom, thuongHieu, spIds } = parseBody(body)

  const existing = get('SELECT id FROM nhom_san_pham WHERE id = ?', [id])
  if (!existing) throw new HttpError(404, 'Không tìm thấy nhóm sản phẩm')

  // Đổi tên + thay toàn bộ danh sách thành viên trong 1 transaction atomic.
  try {
    transaction(() => {
      run(`UPDATE nhom_san_pham SET ten_nhom=?, thuong_hieu=?, updated_at=datetime('now') WHERE id=?`, [
        tenNhom,
        thuongHieu,
        id,
      ])
      run('DELETE FROM nhom_san_pham_san_pham WHERE nhom_san_pham_id = ?', [id])
      for (const spId of spIds) {
        run('INSERT INTO nhom_san_pham_san_pham (nhom_san_pham_id, san_pham_id) VALUES (?, ?)', [
          Number(id),
          spId,
        ])
      }
    })
  } catch (e) {
    failWrite(e)
  }

  const updated = get(SELECT_NHOM_SQL + ' WHERE n.id = ? GROUP BY n.id', [id]) as Record<
    string,
    unknown
  >
  persist()
  return parseNhom(updated)
}

export function deleteNhom(id: string): { success: true } {
  const existing = get('SELECT id FROM nhom_san_pham WHERE id = ?', [id])
  if (!existing) throw new HttpError(404, 'Không tìm thấy nhóm sản phẩm')
  run('DELETE FROM nhom_san_pham WHERE id = ?', [id])
  persist()
  return { success: true }
}
