import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group, Text, Badge, Center } from '@mantine/core'
import type { CEOSummary } from '../types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import { fmt } from '../format'
import { brandShort } from '@/domain/constants'
import CellDetailModal, { type ColProductEntry, type ModalCellInfo } from './CellDetailModal'

interface Props {
  ceos: CEOSummary[]
  brand: string
  quyCachMap: Map<string, number>
  masterCEOCodeSet: Set<string>
  nhomGroups: NhomSanPham[]
  productToGroupIdMap: Map<string, number>
  allNhomGroups: NhomSanPham[]
  productBrandMap: Map<string, string>
}

type Col = {
  key: number | string
  name: string
  subName?: string
  isUngrouped: boolean
  inMaster: boolean
  crossBrand?: string
}

type CeoRow = {
  ceo: CEOSummary
  colThungMap: Map<number | string, number>
  colProductsMap: Map<number | string, ColProductEntry[]>
  totalThung: number
  crossBrands: Set<string>
}

// Matrix table (mode "Bảng") — cột theo nhóm sản phẩm.
export default function MatrixTable({
  ceos,
  brand,
  quyCachMap,
  masterCEOCodeSet,
  nhomGroups,
  productToGroupIdMap,
  allNhomGroups,
  productBrandMap,
}: Props) {
  // Hooks phải gọi vô điều kiện, TRƯỚC mọi early-return.
  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const [totalsTop, setTotalsTop] = useState(42)
  useLayoutEffect(() => {
    if (headerRowRef.current) setTotalsTop(headerRowRef.current.offsetHeight)
  }, [nhomGroups.length])
  const [modalCell, setModalCell] = useState<ModalCellInfo | null>(null)

  // Toàn bộ phép dẫn xuất nặng (dò cột, gom thùng theo CEO/nhóm, cộng tổng cột)
  // được memo hóa — chỉ tính lại khi dữ liệu đầu vào đổi, không chạy mỗi render.
  const { columns, ceoData, colTotals, grandTotalThung } = useMemo(() => {
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

    const ceoData: CeoRow[] = ceos.map((ceo) => {
      const colThungMap = new Map<number | string, number>()
      const colProductsMap = new Map<number | string, ColProductEntry[]>()
      const crossBrandSet = new Set<string>()
      ceo.months.forEach((m) => {
        m.products.forEach((p) => {
          const productBrand = productBrandMap.get(p.productCode) ?? brand
          if (productBrand !== brand) crossBrandSet.add(productBrand)
          const quyCach = quyCachMap.get(`${p.productCode}|${productBrand}`) ?? null
          const groupId = productToGroupIdMap.get(p.productCode)
          const key: number | string = groupId !== undefined ? groupId : p.productCode
          if (!colProductsMap.has(key)) colProductsMap.set(key, [])
          colProductsMap.get(key)!.push({ product: p, month: m.month, quyCach, productBrand })
          if (!quyCach) return
          colThungMap.set(key, (colThungMap.get(key) ?? 0) + p.quantity / quyCach)
        })
      })
      const totalThung = [...colThungMap.values()].reduce((s, v) => s + v, 0)
      return { ceo, colThungMap, colProductsMap, totalThung, crossBrands: crossBrandSet }
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

    const columns: Col[] = [
      ...nhomGroups.map((n) => ({ key: n.id as number | string, name: n.ten_nhom, isUngrouped: false, inMaster: true })),
      ...crossBrandNhoms.map((n) => ({ key: n.id as number | string, name: n.ten_nhom, isUngrouped: false, inMaster: true, crossBrand: n.thuong_hieu })),
      ...ungroupedProducts.map(([code, { name, productBrand: pb }]) => ({
        key: code,
        name: code,
        subName: name,
        isUngrouped: true,
        inMaster: quyCachMap.has(`${code}|${pb}`),
        crossBrand: pb !== brand ? pb : undefined,
      })),
    ]

    const colTotals = new Map<number | string, number>()
    let grandTotalThung = 0
    ceoData.forEach(({ colThungMap, totalThung }) => {
      colThungMap.forEach((v, key) => colTotals.set(key, (colTotals.get(key) ?? 0) + v))
      grandTotalThung += totalThung
    })

    return { columns, ceoData, colTotals, grandTotalThung }
  }, [ceos, brand, quyCachMap, nhomGroups, productToGroupIdMap, allNhomGroups, productBrandMap])

  if (ceos.length === 0) {
    return (
      <Center py={48}>
        <Text c="dimmed" size="sm">Không có dữ liệu</Text>
      </Center>
    )
  }

  const W_STT = 48, W_MA = 96, W_TEN = 160, W_GRP = 120, W_TONG = 110
  const BG_HEAD = 'var(--mantine-color-gray-1)'
  const BG_TOTAL = 'var(--mantine-color-blue-1)'

  const thTop: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 3, background: BG_HEAD, padding: '7px 8px', fontSize: 12, fontWeight: 600, borderBottom: '2px solid var(--mantine-color-gray-3)', whiteSpace: 'nowrap' }
  const thCornerL = (left: number): React.CSSProperties => ({ ...thTop, left, zIndex: 4 })
  const thCornerR: React.CSSProperties = { ...thTop, right: 0, zIndex: 4 }
  const tdLeft = (left: number, bg: string): React.CSSProperties => ({ position: 'sticky', left, zIndex: 2, background: bg })
  const tdRight = (bg: string): React.CSSProperties => ({ position: 'sticky', right: 0, zIndex: 2, background: bg })

  const thTotals: React.CSSProperties = {
    position: 'sticky', top: totalsTop, zIndex: 3,
    background: BG_TOTAL, padding: '6px 8px', fontSize: 12, fontWeight: 700,
    borderBottom: '2px solid var(--mantine-color-blue-3)', whiteSpace: 'nowrap',
  }
  const thTotalsCornerL = (left: number): React.CSSProperties => ({ ...thTotals, left, zIndex: 4 })
  const thTotalsCornerR: React.CSSProperties = { ...thTotals, right: 0, zIndex: 4 }

  return (
    <div style={{ flex: 1, overflow: 'auto', minWidth: 0, minHeight: 0 }}>
      <style>{`.sr-matrix{border-collapse:separate!important;border-spacing:0!important}`}</style>
      <table className="sr-matrix" style={{ tableLayout: 'fixed', minWidth: W_STT + W_MA + W_TEN + columns.length * W_GRP + W_TONG }}>
        <thead>
          <tr ref={headerRowRef}>
            <th style={{ ...thCornerL(0), minWidth: W_STT, textAlign: 'center', borderRight: '1px solid var(--mantine-color-gray-2)' }}>STT</th>
            <th style={{ ...thCornerL(W_STT), minWidth: W_MA, borderRight: '1px solid var(--mantine-color-gray-2)' }}>Mã CEO</th>
            <th style={{ ...thCornerL(W_STT + W_MA), minWidth: W_TEN, boxShadow: '2px 0 4px -1px rgba(0,0,0,0.12)' }}>Tên CEO</th>
            {columns.map((col) => (
              <th key={String(col.key)} title={col.subName ? `${col.name} — ${col.subName}` : col.name}
                style={{ ...thTop, width: W_GRP, textAlign: 'right', borderRight: '1px solid var(--mantine-color-gray-2)' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: W_GRP - 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    {col.crossBrand && (
                      <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: 'var(--mantine-color-orange-7)', background: 'var(--mantine-color-orange-1)', border: '1px solid var(--mantine-color-orange-3)', borderRadius: 3, padding: '0 4px', letterSpacing: '0.04em' }}>
                        {brandShort(col.crossBrand)}
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: col.isUngrouped && !col.inMaster ? 'var(--mantine-color-red-6)' : undefined }}>{col.name}</span>
                  </div>
                  {col.subName && <div style={{ fontWeight: 400, fontSize: 10, color: 'var(--mantine-color-dimmed)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.subName}</div>}
                </div>
              </th>
            ))}
            <th style={{ ...thCornerR, width: W_TONG, textAlign: 'right', boxShadow: 'inset 2px 0 0 var(--mantine-color-gray-4)' }}>Tổng thùng</th>
          </tr>

          <tr>
            <th style={{ ...thTotalsCornerL(0), minWidth: W_STT, textAlign: 'center', borderRight: '1px solid var(--mantine-color-blue-2)', color: 'var(--mantine-color-blue-8)' }}>Σ</th>
            <th style={{ ...thTotalsCornerL(W_STT), minWidth: W_MA, borderRight: '1px solid var(--mantine-color-blue-2)', color: 'var(--mantine-color-blue-8)' }}>Tổng</th>
            <th style={{ ...thTotalsCornerL(W_STT + W_MA), minWidth: W_TEN, boxShadow: '2px 0 4px -1px rgba(0,0,0,0.12)' }} />
            {columns.map((col) => {
              const total = colTotals.get(col.key) ?? 0
              return (
                <th key={String(col.key)} style={{ ...thTotals, width: W_GRP, textAlign: 'right', borderRight: '1px solid var(--mantine-color-blue-2)', color: total > 0 ? 'var(--mantine-color-blue-9)' : 'var(--mantine-color-blue-3)' }}>
                  {total > 0 ? fmt.format(Math.round(total * 100) / 100) : '—'}
                </th>
              )
            })}
            <th style={{ ...thTotalsCornerR, width: W_TONG, textAlign: 'right', boxShadow: 'inset 2px 0 0 var(--mantine-color-blue-3)', color: 'var(--mantine-color-green-8)' }}>
              {grandTotalThung > 0 ? fmt.format(Math.round(grandTotalThung * 100) / 100) : '—'}
            </th>
          </tr>
        </thead>
        <tbody>
          {ceoData.map(({ ceo, colThungMap, colProductsMap, totalThung, crossBrands }, idx) => {
            const rowBg = idx % 2 === 0 ? 'white' : 'var(--mantine-color-gray-0)'
            const tdBase: React.CSSProperties = { borderBottom: '1px solid var(--mantine-color-gray-1)', padding: '6px 8px', fontSize: 12 }
            const inMasterData = masterCEOCodeSet.has(ceo.ceo)
            const hasCrossBrand = crossBrands.size > 0

            return (
              <tr key={ceo.ceo}>
                <td style={{ ...tdBase, ...tdLeft(0, rowBg), minWidth: W_STT, textAlign: 'center', color: 'var(--mantine-color-dimmed)', borderRight: '1px solid var(--mantine-color-gray-2)' }}>{idx + 1}</td>
                <td style={{ ...tdBase, ...tdLeft(W_STT, rowBg), minWidth: W_MA, fontFamily: 'monospace', fontWeight: 700, borderRight: '1px solid var(--mantine-color-gray-2)', color: inMasterData ? undefined : 'var(--mantine-color-red-6)' }}>{ceo.ceo}</td>
                <td style={{ ...tdBase, ...tdLeft(W_STT + W_MA, rowBg), minWidth: W_TEN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxShadow: '2px 0 4px -1px rgba(0,0,0,0.12)', padding: '4px 8px' }} title={ceo.ceoName}>
                  <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
                    <Text size="xs" truncate style={{ flex: 1 }}>{ceo.ceoName || '—'}</Text>
                    {hasCrossBrand && [...crossBrands].map((cb) => (
                      <Badge key={cb} size="xs" variant="light" color="orange" radius="sm" style={{ flexShrink: 0, fontSize: 9 }}>
                        {brandShort(cb)}
                      </Badge>
                    ))}
                  </Group>
                </td>
                {columns.map((col) => {
                  const exactThung = colThungMap.get(col.key)
                  const thung = exactThung !== undefined ? Math.round(exactThung * 100) / 100 : null
                  return (
                    <td
                      key={String(col.key)}
                      onClick={() => setModalCell({
                        ceo,
                        col,
                        thung: exactThung !== undefined ? exactThung : null,
                        entries: colProductsMap.get(col.key) ?? [],
                        brand,
                      })}
                      style={{ ...tdBase, width: W_GRP, textAlign: 'right', borderRight: '1px solid var(--mantine-color-gray-1)', background: thung !== null ? 'var(--mantine-color-blue-0)' : rowBg, color: thung !== null ? 'var(--mantine-color-blue-8)' : 'var(--mantine-color-gray-4)', cursor: 'pointer' }}
                      title="Nhấn để xem chi tiết"
                    >
                      {thung !== null ? fmt.format(thung) : '—'}
                    </td>
                  )
                })}
                <td style={{ ...tdBase, ...tdRight(rowBg), width: W_TONG, textAlign: 'right', fontWeight: 600, color: 'var(--mantine-color-green-7)', boxShadow: 'inset 2px 0 0 var(--mantine-color-gray-3)' }}>
                  {totalThung > 0 ? fmt.format(Math.round(totalThung * 100) / 100) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {modalCell && <CellDetailModal info={modalCell} onClose={() => setModalCell(null)} />}
    </div>
  )
}
