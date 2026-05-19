import type {
  BrandSummary,
  CEOSummary,
  InvoiceRow,
  MonthSummary,
  ParsedReport,
  ProductRow,
  SalesRow,
} from './types'

/**
 * Dựng lại cấu trúc tổng hợp `ParsedReport` (thương hiệu → CEO → tháng → sản
 * phẩm → dòng hóa đơn) từ danh sách dòng phẳng. Đây là phần logic gộp trước
 * đây nằm trong `parseExcelFile`, nay tách thành hàm thuần để mỗi lần CRUD chỉ
 * cần tổng hợp lại — bảng/chi tiết không phải đổi gì.
 */
export function aggregateRows(rows: SalesRow[]): ParsedReport {
  // brand → ceo → month → productCode → accumulated data
  const brandMap = new Map<
    string,
    Map<
      string,
      Map<
        string,
        Map<
          string,
          {
            name: string
            unit: string
            qty: number
            amount: number
            invoices: Set<string>
            prices: Set<number>
            lines: InvoiceRow[]
          }
        >
      >
    >
  >()
  // ceo code → first encountered name
  const ceoNameMap = new Map<string, string>()

  let rowCount = 0

  for (const row of rows) {
    const { ceo, brand, productCode: product } = row
    if (!brand || !ceo || !product) continue

    rowCount++

    if (!ceoNameMap.has(ceo) && row.ceoName) ceoNameMap.set(ceo, row.ceoName)

    if (!brandMap.has(brand)) brandMap.set(brand, new Map())
    const ceoMap = brandMap.get(brand)!

    if (!ceoMap.has(ceo)) ceoMap.set(ceo, new Map())
    const monthMap = ceoMap.get(ceo)!

    if (!monthMap.has(row.month)) monthMap.set(row.month, new Map())
    const productMap = monthMap.get(row.month)!

    if (!productMap.has(product))
      productMap.set(product, {
        name: row.productName,
        unit: row.unit,
        qty: 0,
        amount: 0,
        invoices: new Set(),
        prices: new Set(),
        lines: [],
      })
    const entry = productMap.get(product)!
    entry.qty += row.qty
    entry.amount += row.amount
    if (row.invoice) entry.invoices.add(row.invoice)
    if (row.unitPrice !== 0) entry.prices.add(row.unitPrice)
    entry.lines.push({
      invoice: row.invoice,
      qty: row.qty,
      unitPrice: row.unitPrice,
      amount: row.amount,
      date: row.date,
    })
  }

  const brands: BrandSummary[] = []
  let grandQty = 0
  let grandAmount = 0

  for (const [brand, ceoMap] of brandMap) {
    const ceos: CEOSummary[] = []
    let brandQty = 0
    let brandAmount = 0

    for (const [ceo, monthMap] of ceoMap) {
      const months: MonthSummary[] = []
      let ceoQty = 0
      let ceoAmount = 0

      for (const [month, productMap] of monthMap) {
        const products: ProductRow[] = []
        let monthQty = 0
        let monthAmount = 0

        for (const [productCode, data] of productMap) {
          products.push({
            productCode,
            productName: data.name,
            unit: data.unit,
            quantity: data.qty,
            totalAmount: data.amount,
            invoiceCodes: [...data.invoices].sort(),
            unitPrices: [...data.prices].sort((a, b) => a - b),
            rawLines: data.lines,
          })
          monthQty += data.qty
          monthAmount += data.amount
        }

        products.sort((a, b) => a.productCode.localeCompare(b.productCode))
        months.push({ month, products, totalQty: monthQty, totalAmount: monthAmount })
        ceoQty += monthQty
        ceoAmount += monthAmount
      }

      months.sort((a, b) => a.month.localeCompare(b.month))
      ceos.push({ ceo, ceoName: ceoNameMap.get(ceo) ?? '', months, totalQty: ceoQty, totalAmount: ceoAmount })
      brandQty += ceoQty
      brandAmount += ceoAmount
    }

    ceos.sort((a, b) => a.ceo.localeCompare(b.ceo))
    brands.push({ brand, ceos, totalQty: brandQty, totalAmount: brandAmount })
    grandQty += brandQty
    grandAmount += brandAmount
  }

  brands.sort((a, b) => a.brand.localeCompare(b.brand))

  return { brands, totalQty: grandQty, totalAmount: grandAmount, rowCount }
}
