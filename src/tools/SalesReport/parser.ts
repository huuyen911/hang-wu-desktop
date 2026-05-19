import { invoke } from '@tauri-apps/api/core'
import type { SalesRow } from './types'

/** Sinh id local duy nhất cho mỗi dòng (dùng khi tạo dòng mới thủ công). */
export function makeRowId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Đọc file Excel → danh sách dòng phẳng `SalesRow[]`.
 * Toàn bộ parsing thực hiện phía Rust (calamine) — hàm này chỉ
 * chuyển bytes sang Rust và nhận kết quả về.
 */
export async function parseExcelFile(file: File): Promise<SalesRow[]> {
  const buffer = await file.arrayBuffer()
  const bytes = Array.from(new Uint8Array(buffer))
  return invoke<SalesRow[]>('parse_excel_bytes', { bytes })
}
