import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import type { SalesRow } from './types'

dayjs.extend(customParseFormat)

// Column indices (0-based, matching Excel letters A=0, B=1, J=9, K=10, L=11, N=13, T=19, V=21, W=22, X=23, Z=25)
const COL_CEO = 0
const COL_CEO_NAME = 1
const COL_PRODUCT = 9
const COL_PRODUCT_NAME = 10
const COL_BRAND = 11
const COL_UNIT = 13
const COL_INVOICE = 19
const COL_MONTH = 21
const COL_QTY = 22
const COL_UNIT_PRICE = 23
const COL_AMOUNT = 25

export function parseRawDate(value: unknown): dayjs.Dayjs | null {
  if (value instanceof Date) return dayjs(value)
  if (typeof value === 'number' && value > 1000)
    return dayjs(new Date(Math.round((value - 25569) * 86400 * 1000)))
  const str = String(value ?? '').trim()
  // "T1/2025" → "01/2025"
  const tMatch = str.match(/^T(\d+)\/(\d{4})$/)
  if (tMatch) return dayjs(`${tMatch[1].padStart(2, '0')}/${tMatch[2]}`, 'MM/YYYY', true)
  const d = dayjs(str, ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm', 'DD/MM/YYYY', 'MM/YYYY'], true)
  return d.isValid() ? d : null
}

export function formatDate(value: unknown): string {
  const d = parseRawDate(value)
  return d ? d.format('DD/MM/YYYY HH:mm:ss') : String(value ?? '').trim()
}

export function formatMonth(value: unknown): string {
  const d = parseRawDate(value)
  if (d) return d.format('MM/YYYY')
  if (typeof value === 'number') return String(value)
  return String(value ?? '').trim()
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[.,\s]/g, (m) => (m === ',' ? '.' : ''))
    return parseFloat(cleaned) || 0
  }
  return 0
}

// Trả về số nếu ô là một số lượng hợp lệ (kể cả khi Excel lưu dạng chuỗi
// "1.000", "1,5"...), ngược lại trả về null. Dùng để xác định dòng dữ liệu
// thay cho việc đòi hỏi cứng `typeof === 'number'` (vốn loại bỏ âm thầm
// các dòng có cột Số lượng định dạng Text).
function parseQty(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const cleaned = trimmed.replace(/[.,\s]/g, (m) => (m === ',' ? '.' : ''))
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function isDataRow(row: unknown[]): boolean {
  const ceo = row[COL_CEO]
  const brand = row[COL_BRAND]
  return (
    ceo != null &&
    brand != null &&
    String(ceo).trim() !== '' &&
    String(brand).trim() !== '' &&
    parseQty(row[COL_QTY]) !== null
  )
}

/** Sinh id local duy nhất cho mỗi dòng (không tồn tại trong file Excel). */
export function makeRowId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Đọc file Excel → danh sách dòng phẳng `SalesRow[]`. Mỗi dòng dữ liệu hợp lệ
 * trong file trở thành đúng một bản ghi (giữ nguyên độ chi tiết của file, KHÔNG
 * gộp) để có thể CRUD ở mức từng dòng. Việc gộp/tổng hợp do `aggregateRows` lo.
 */
export async function parseExcelFile(file: File): Promise<SalesRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

  const result: SalesRow[] = []

  for (const row of rows as unknown[][]) {
    if (!isDataRow(row)) continue

    const ceo = String(row[COL_CEO]).trim()
    const brand = String(row[COL_BRAND]).trim()
    const product = String(row[COL_PRODUCT] ?? '').trim()
    if (!brand || !ceo || !product) continue

    result.push({
      id: makeRowId(),
      ceo,
      ceoName: String(row[COL_CEO_NAME] ?? '').trim(),
      brand,
      productCode: product,
      productName: String(row[COL_PRODUCT_NAME] ?? '').trim(),
      unit: String(row[COL_UNIT] ?? '').trim(),
      invoice: String(row[COL_INVOICE] ?? '').trim(),
      month: formatMonth(row[COL_MONTH]),
      date: formatDate(row[COL_MONTH]),
      qty: toNumber(row[COL_QTY]),
      unitPrice: toNumber(row[COL_UNIT_PRICE]),
      amount: toNumber(row[COL_AMOUNT]),
    })
  }

  return result
}
