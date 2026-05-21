import type { BrandSummary, CEOSummary, MonthSummary, ProductRow } from '../types'
import type { CEO } from '@/master-data/CEO/types'
import { ALL_BRAND_PREFIXES, brandPrefix } from '@/domain/constants'

/** Tạo hàm kiểm tra một mã CEO có thuộc thương hiệu đang xem hay không. */
export function makeBrandMatcher(brand: string): (ceoCode: string) => boolean {
  const prefix = brandPrefix(brand)
  if (prefix) {
    const upper = prefix.toUpperCase()
    return (ceoCode: string) => ceoCode.toUpperCase().startsWith(upper)
  }
  const allUpper = ALL_BRAND_PREFIXES.map((p) => p.toUpperCase())
  return (ceoCode: string) => {
    const c = ceoCode.toUpperCase()
    return allUpper.some((p) => c.startsWith(p))
  }
}

/**
 * Lọc CEO chỉ giữ các sản phẩm là sản phẩm chính ĐỐI VỚI thương hiệu của tab
 * đang xem (`brand`) — không phải theo thương hiệu gốc của sản phẩm. Nhờ vậy ở
 * tab Elvawell, một SP cross-brand Weilaiya chỉ hiện nếu nó là SP chính bên
 * Elvawell, và ngược lại.
 */
export function applyOnlyMain(
  ceo: CEOSummary,
  brand: string,
  sanPhamChinhSet: Set<string>,
): CEOSummary {
  const months = ceo.months
    .map((m) => {
      const products = m.products.filter((p) =>
        sanPhamChinhSet.has(`${p.productCode}|${brand}`),
      )
      const totalQty = products.reduce((s, p) => s + p.quantity, 0)
      const totalAmount = products.reduce((s, p) => s + p.totalAmount, 0)
      return { ...m, products, totalQty, totalAmount }
    })
    .filter((m) => m.products.length > 0)
  const totalQty = months.reduce((s, m) => s + m.totalQty, 0)
  const totalAmount = months.reduce((s, m) => s + m.totalAmount, 0)
  return { ...ceo, months, totalQty, totalAmount }
}

/** Tổng số lượng thùng của một CEO — giống MatrixTable:
 *  tích lũy raw xuyên suốt tất cả tháng theo key (nhomId hoặc productCode),
 *  rồi floor từng key và cộng lại. */
export function calcTotalThung(
  ceo: CEOSummary,
  brand: string,
  quyCachMap: Map<string, number>,
  productBrandMap: Map<string, string>,
  productToGroupIdMap: Map<string, number>,
): number {
  const keyRawMap = new Map<number | string, number>()
  ceo.months.forEach((m) => {
    m.products.forEach((p) => {
      const productBrand = productBrandMap.get(p.productCode) ?? brand
      const qc = quyCachMap.get(`${p.productCode}|${productBrand}`)
      if (!qc) return
      const groupId = productToGroupIdMap.get(p.productCode)
      const key: number | string = groupId !== undefined ? groupId : p.productCode
      keyRawMap.set(key, (keyRawMap.get(key) ?? 0) + p.quantity / qc)
    })
  })
  let total = 0
  keyRawMap.forEach((v) => { total += Math.floor(v) })
  return total
}

/**
 * Gộp dữ liệu CEO trên tất cả thương hiệu để mỗi tab CEO thấy được cả các
 * giao dịch cross-brand, đồng thời bổ sung CEO chỉ có trong master data
 * (chưa phát sinh đơn) để vẫn hiển thị.
 */
export function mergeCEOsAcrossBrands(
  allBrands: BrandSummary[],
  masterCEOList: CEO[],
  matchesBrand: (ceoCode: string) => boolean,
): CEOSummary[] {
  const ceoMergedMap = new Map<
    string,
    { ceoName: string; monthsMap: Map<string, Map<string, ProductRow>> }
  >()

  allBrands.forEach((b) => {
    b.ceos.forEach((ceo) => {
      if (!matchesBrand(ceo.ceo)) return
      if (!ceoMergedMap.has(ceo.ceo))
        ceoMergedMap.set(ceo.ceo, { ceoName: ceo.ceoName, monthsMap: new Map() })
      const entry = ceoMergedMap.get(ceo.ceo)!
      if (!entry.ceoName && ceo.ceoName) entry.ceoName = ceo.ceoName
      ceo.months.forEach((m) => {
        if (!entry.monthsMap.has(m.month)) entry.monthsMap.set(m.month, new Map())
        const prodMap = entry.monthsMap.get(m.month)!
        m.products.forEach((p) => {
          if (!prodMap.has(p.productCode)) {
            prodMap.set(p.productCode, {
              ...p,
              invoiceCodes: [...p.invoiceCodes],
              unitPrices: [...p.unitPrices],
              rawLines: [...(p.rawLines ?? [])],
            })
          } else {
            const ex = prodMap.get(p.productCode)!
            ex.quantity += p.quantity
            ex.totalAmount += p.totalAmount
            p.invoiceCodes.forEach((code) => {
              if (!ex.invoiceCodes.includes(code)) ex.invoiceCodes.push(code)
            })
            p.unitPrices.forEach((pr) => {
              if (!ex.unitPrices.includes(pr)) ex.unitPrices.push(pr)
            })
            ex.rawLines.push(...(p.rawLines ?? []))
          }
        })
      })
    })
  })

  const importedCodes = new Set(ceoMergedMap.keys())
  const masterOnly: CEOSummary[] = masterCEOList
    .filter((mc) => !importedCodes.has(mc.ma_ceo) && matchesBrand(mc.ma_ceo))
    .map((mc) => ({ ceo: mc.ma_ceo, ceoName: mc.ten_ceo, months: [], totalQty: 0, totalAmount: 0 }))

  const merged: CEOSummary[] = [...ceoMergedMap.entries()].map(([ceoCode, { ceoName, monthsMap }]) => {
    const months: MonthSummary[] = [...monthsMap.entries()]
      .map(([month, prodMap]) => {
        const products = [...prodMap.values()].sort((a, b) =>
          a.productCode.localeCompare(b.productCode),
        )
        const totalQty = products.reduce((s, p) => s + p.quantity, 0)
        const totalAmount = products.reduce((s, p) => s + p.totalAmount, 0)
        return { month, products, totalQty, totalAmount }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
    const totalQty = months.reduce((s, m) => s + m.totalQty, 0)
    const totalAmount = months.reduce((s, m) => s + m.totalAmount, 0)
    return { ceo: ceoCode, ceoName, months, totalQty, totalAmount }
  })

  return [...merged, ...masterOnly].sort((a, b) => a.ceo.localeCompare(b.ceo))
}
