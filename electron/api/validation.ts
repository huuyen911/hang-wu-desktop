// Giá trị hợp lệ dùng chung cho validation phía main process.
// Khớp với union type phía renderer (src/domain/constants.ts).
export const THUONG_HIEU = ['Weilaiya', 'Elvawell'] as const
export const NHAN_VIEN = ['Hằng', 'Hiền'] as const

export function isThuongHieu(v: unknown): boolean {
  return typeof v === 'string' && (THUONG_HIEU as readonly string[]).includes(v)
}

export function isNhanVien(v: unknown): boolean {
  return typeof v === 'string' && (NHAN_VIEN as readonly string[]).includes(v)
}
