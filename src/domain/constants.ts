import type { ThuongHieu } from '@/master-data/SanPham/types'
import type { NhanVienChamSoc } from '@/master-data/CEO/types'

/** Danh sách thương hiệu hợp lệ — nguồn chân lý duy nhất cho cả FE lẫn validate. */
export const THUONG_HIEU_VALUES = ['Weilaiya', 'Elvawell'] as const

/** Danh sách nhân viên chăm sóc hợp lệ. */
export const NHAN_VIEN_VALUES = ['Hằng', 'Hiền'] as const

export const THUONG_HIEU_OPTIONS = THUONG_HIEU_VALUES.map((v) => ({ value: v, label: v }))

export const NHAN_VIEN_OPTIONS = NHAN_VIEN_VALUES.map((v) => ({ value: v, label: v }))

/** Màu badge Mantine theo thương hiệu. */
export function brandColor(brand: ThuongHieu | string): string {
  return brand === 'Weilaiya' ? 'blue' : 'violet'
}

/** Màu badge Mantine theo nhân viên chăm sóc. */
export function nhanVienColor(nv: NhanVienChamSoc | string): string {
  return nv === 'Hằng' ? 'teal' : 'pink'
}

/**
 * Ký hiệu ngắn của thương hiệu (E / W) dùng cho các tag cross-brand trong
 * báo cáo. Trước đây biểu thức `x === 'Elvawell' ? 'E' : ...` bị lặp ~5 lần.
 */
export function brandShort(brand: string): string {
  if (brand === 'Elvawell') return 'E'
  if (brand === 'Weilaiya') return 'W'
  return brand
}
