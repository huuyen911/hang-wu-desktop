import type { SanPham, ThuongHieu } from '@/master-data/SanPham/types'
import type { NhanVienChamSoc } from '@/master-data/CEO/types'

/** Danh sách thương hiệu hợp lệ — nguồn chân lý duy nhất cho cả FE lẫn validate. */
export const THUONG_HIEU_VALUES = ['Weilaiya', 'Elvawell'] as const

/** Danh sách nhân viên chăm sóc hợp lệ. */
export const NHAN_VIEN_VALUES = ['Hằng', 'Hiền'] as const

export const THUONG_HIEU_OPTIONS = THUONG_HIEU_VALUES.map((v) => ({ value: v, label: v }))

export const NHAN_VIEN_OPTIONS = NHAN_VIEN_VALUES.map((v) => ({ value: v, label: v }))

/**
 * Cấu hình mọi thuộc tính riêng theo thương hiệu — prefix mã CEO, ký hiệu
 * ngắn, màu badge, tên trường "là SP chính" trong bảng `san_pham`. Tập trung
 * vào 1 chỗ để khi thêm thương hiệu chỉ cần thêm 1 entry; tránh `if brand === '...'`
 * rải rác. Tên trường ép kiểu sang `keyof SanPham` để TS đảm bảo còn tồn tại.
 */
interface BrandConfig {
  short: string
  ceoPrefix: string
  color: string
  mainField: keyof SanPham
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  Elvawell: { short: 'E', ceoPrefix: 'E', color: 'violet', mainField: 'la_san_pham_chinh_elvawell' },
  Weilaiya: { short: 'W', ceoPrefix: 'W', color: 'blue', mainField: 'la_san_pham_chinh_weilaiya' },
}

/** Màu badge Mantine theo thương hiệu. */
export function brandColor(brand: ThuongHieu | string): string {
  return BRAND_CONFIG[brand]?.color ?? 'gray'
}

/** Màu badge Mantine theo nhân viên chăm sóc. */
export function nhanVienColor(nv: NhanVienChamSoc | string): string {
  return nv === 'Hằng' ? 'teal' : 'pink'
}

/** Ký hiệu ngắn của thương hiệu (E / W) dùng cho các tag cross-brand trong báo cáo. */
export function brandShort(brand: string): string {
  return BRAND_CONFIG[brand]?.short ?? brand
}

/** Prefix mã CEO theo thương hiệu (Elvawell → "E", Weilaiya → "W"). */
export function brandPrefix(brand: string): string | null {
  return BRAND_CONFIG[brand]?.ceoPrefix ?? null
}

/** Tập hợp prefix mã CEO của mọi thương hiệu đã đăng ký. */
export const ALL_BRAND_PREFIXES: readonly string[] = Object.values(BRAND_CONFIG).map((c) => c.ceoPrefix)

/**
 * Một sản phẩm có là "SP chính" đối với thương hiệu đang xét không? — gom các
 * trường `la_san_pham_chinh_*` để chỗ dùng không cần biết tên cột cụ thể.
 */
export function isProductMainForBrand(sp: SanPham, brand: string): boolean {
  const field = BRAND_CONFIG[brand]?.mainField
  return field ? Boolean(sp[field]) : false
}
