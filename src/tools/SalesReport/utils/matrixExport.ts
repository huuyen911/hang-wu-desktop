import type { CEOSummary } from '../types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import { brandShort } from '@/domain/constants'

export interface MatrixExportData {
  headers: string[]
  textTotals: string[]   // labels for the first numTextCols columns in the totals row
  numTextCols: number    // = 2 (Mã CEO, Tên CEO)
  dataRows: (string | number)[][]
}


export function buildMatrixExportData(
  ceos: CEOSummary[],
  brand: string,
  quyCachMap: Map<string, number>,
  nhomGroups: NhomSanPham[],
  productToGroupIdMap: Map<string, number>,
  allNhomGroups: NhomSanPham[],
  productBrandMap: Map<string, string>,
): MatrixExportData {
  const nhomIdToNhomMap = new Map(allNhomGroups.map((n) => [n.id, n]))
  const currentBrandNhomIdSet = new Set(nhomGroups.map((n) => n.id))
  const crossBrandNhomIdSet = new Set<number>()
  const ungroupedProductMap = new Map<string, { name: string; productBrand: string }>()

  ceos.forEach((ceo) => {
    ceo.months.forEach((m) => {
      m.products.forEach((p) => {
        const productBrand = productBrandMap.get(p.productCode) ?? brand
        const groupId = productToGroupIdMap.get(p.productCode)
        if (groupId !== undefined) {
          const nhom = nhomIdToNhomMap.get(groupId)
          if (nhom && !currentBrandNhomIdSet.has(groupId)) crossBrandNhomIdSet.add(groupId)
        } else if (!ungroupedProductMap.has(p.productCode)) {
          ungroupedProductMap.set(p.productCode, { name: p.productName || '', productBrand })
        }
      })
    })
  })

  const crossBrandNhoms = allNhomGroups
    .filter((n) => crossBrandNhomIdSet.has(n.id))
    .sort((a, b) => a.thuong_hieu.localeCompare(b.thuong_hieu) || a.ten_nhom.localeCompare(b.ten_nhom))

  const ungroupedProducts = [...ungroupedProductMap.entries()].sort(
    ([a, { productBrand: ba }], [b, { productBrand: bb }]) => {
      if (ba === brand && bb !== brand) return -1
      if (ba !== brand && bb === brand) return 1
      return a.localeCompare(b)
    },
  )

  type Col = { key: number | string; headerName: string }
  const columns: Col[] = [
    ...nhomGroups.map((n) => ({ key: n.id as number | string, headerName: n.ten_nhom })),
    ...crossBrandNhoms.map((n) => ({
      key: n.id as number | string,
      headerName: `[${brandShort(n.thuong_hieu)}] ${n.ten_nhom}`,
    })),
    ...ungroupedProducts.map(([code, { productBrand: pb }]) => ({
      key: code,
      headerName: pb !== brand ? `[${brandShort(pb)}] ${code}` : code,
    })),
  ]

  type CeoEntry = { ceo: CEOSummary; colThungMap: Map<number | string, number>; totalThung: number }
  const entries: CeoEntry[] = ceos.map((ceo) => {
    const colThungMap = new Map<number | string, number>()
    ceo.months.forEach((m) => {
      m.products.forEach((p) => {
        const productBrand = productBrandMap.get(p.productCode) ?? brand
        const quyCach = quyCachMap.get(`${p.productCode}|${productBrand}`) ?? null
        if (!quyCach) return
        const groupId = productToGroupIdMap.get(p.productCode)
        const key: number | string = groupId !== undefined ? groupId : p.productCode
        colThungMap.set(key, (colThungMap.get(key) ?? 0) + p.quantity / quyCach)
      })
    })
    colThungMap.forEach((v, key) => colThungMap.set(key, Math.floor(v)))
    const totalThung = [...colThungMap.values()].reduce((s, v) => s + v, 0)
    return { ceo, colThungMap, totalThung }
  })

  const NUM_TEXT_COLS = 2

  const headers: string[] = [
    'Mã CEO', 'Tên CEO',
    ...columns.map((c) => c.headerName),
    'Tổng thùng',
  ]

  const textTotals: string[] = ['Tổng', '']

  const dataRows: (string | number)[][] = entries.map(({ ceo, colThungMap, totalThung }) => [
    ceo.ceo,
    ceo.ceoName || '—',
    ...columns.map((col) => colThungMap.get(col.key) ?? 0),
    totalThung,
  ])

  return { headers, textTotals, numTextCols: NUM_TEXT_COLS, dataRows }
}
