import type { SanPham } from '@/master-data/SanPham/types'
import type { CEO } from '@/master-data/CEO/types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'

/**
 * Một dòng dữ liệu phẳng — tương ứng đúng 1 row trong file Excel import.
 * Đây là NGUỒN dữ liệu gốc cho màn báo cáo: mọi CRUD thao tác trên list các
 * `SalesRow`, còn bảng tổng hợp (`ParsedReport`) được dựng lại từ list này.
 */
export interface SalesRow {
  /** Định danh local duy nhất (không có trong file Excel). */
  id: string
  ceo: string
  ceoName: string
  brand: string
  productCode: string
  productName: string
  unit: string
  invoice: string
  /** "MM/YYYY" — suy ra từ `date`, hoặc nhập tay khi tạo dòng mới. */
  month: string
  /** "DD/MM/YYYY HH:mm:ss" hoặc chuỗi thời gian gốc. */
  date: string
  qty: number
  unitPrice: number
  amount: number
}

/**
 * Snapshot master data chụp lại lúc "chốt phiên". Khi phiên đã chốt, báo cáo
 * được dựng từ snapshot này thay vì master live → số liệu cố định.
 */
export interface MasterSnapshot {
  san_pham: SanPham[]
  ceo: CEO[]
  nhom_san_pham: NhomSanPham[]
}

/** Bản ghi nhẹ cho danh sách lịch sử phiên (không kèm dữ liệu dòng). */
export interface SalesSessionMeta {
  id: number
  ten: string
  file_name: string
  row_count: number
  created_at: string
  updated_at: string
  /** NULL = chưa chốt; có giá trị = mốc thời gian chốt phiên. */
  locked_at: string | null
}

/** Phiên đầy đủ — kèm toàn bộ dòng đã import. */
export interface SalesSession extends SalesSessionMeta {
  rows: SalesRow[]
  /** Snapshot master lúc chốt; null khi chưa chốt. */
  master_snapshot: MasterSnapshot | null
}

export interface InvoiceRow {
  invoice: string
  qty: number
  unitPrice: number
  amount: number
  date: string
}

export interface ProductRow {
  productCode: string
  productName: string
  unit: string
  quantity: number
  totalAmount: number
  invoiceCodes: string[]
  unitPrices: number[]
  rawLines: InvoiceRow[]
}

export interface MonthSummary {
  month: string
  products: ProductRow[]
  totalQty: number
  totalAmount: number
}

export interface CEOSummary {
  ceo: string
  ceoName: string
  months: MonthSummary[]
  totalQty: number
  totalAmount: number
}

export interface BrandSummary {
  brand: string
  ceos: CEOSummary[]
  totalQty: number
  totalAmount: number
}

export interface ParsedReport {
  brands: BrandSummary[]
  totalQty: number
  totalAmount: number
  rowCount: number
}
