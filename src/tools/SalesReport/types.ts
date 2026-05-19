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

/** Bản ghi nhẹ cho danh sách lịch sử phiên (không kèm dữ liệu dòng). */
export interface SalesSessionMeta {
  id: number
  ten: string
  file_name: string
  row_count: number
  created_at: string
  updated_at: string
}

/** Phiên đầy đủ — kèm toàn bộ dòng đã import. */
export interface SalesSession extends SalesSessionMeta {
  rows: SalesRow[]
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
