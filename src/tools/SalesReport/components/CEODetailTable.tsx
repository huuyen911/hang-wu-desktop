import { Fragment } from 'react'
import { Box, Group, Stack, Text, Badge, Center, Table } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import type { CEOSummary } from '../types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import { fmt, fmtQty, fmtAmount, fmtAmountOrDash, round2 } from '../format'
import BrandTag from './BrandTag'

interface Props {
  ceo: CEOSummary
  brand: string
  quyCachMap: Map<string, number>
  nhomGroups: NhomSanPham[]
  productToGroupIdMap: Map<string, number>
  allNhomGroups: NhomSanPham[]
  productBrandMap: Map<string, string>
}

// Bảng chi tiết CEO — mỗi tháng là một bảng riêng, nhóm theo nhóm sản phẩm.
export default function CEODetailTable({
  ceo,
  brand,
  quyCachMap,
  nhomGroups,
  productToGroupIdMap,
  allNhomGroups,
  productBrandMap,
}: Props) {
  const months = ceo.months
  const nhomIdToNhomMap = new Map(allNhomGroups.map((n) => [n.id, n]))
  const currentBrandNhomIdSet = new Set(nhomGroups.map((n) => n.id))

  if (months.length === 0) {
    return (
      <Center py={48}>
        <Stack align="center" gap="xs">
          <IconSearch size={28} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="sm">Không có sản phẩm phù hợp</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Stack gap="lg">
      {months.map((m) => {
        const monthTotalThung = m.products.reduce((s, p) => {
          const productBrand = productBrandMap.get(p.productCode) ?? brand
          const qc = quyCachMap.get(`${p.productCode}|${productBrand}`)
          if (!qc) return s
          return s + (p.rawLines ?? []).reduce((s2, line) => s2 + round2(line.qty / qc), 0)
        }, 0)
        const roundedMonthThung = round2(monthTotalThung)

        const nhomProductsMap = new Map<number | null, typeof m.products>()
        m.products.forEach((p) => {
          const nhomId = productToGroupIdMap.get(p.productCode) ?? null
          if (!nhomProductsMap.has(nhomId)) nhomProductsMap.set(nhomId, [])
          nhomProductsMap.get(nhomId)!.push(p)
        })

        const sortByCode = (prods: typeof m.products) =>
          [...prods].sort((a, b) => (a.productCode ?? '').localeCompare(b.productCode ?? '', 'vi'))

        const orderedGroups: Array<{ nhom: NhomSanPham | null; products: typeof m.products }> = []
        nhomGroups.forEach((nhom) => {
          const prods = nhomProductsMap.get(nhom.id)
          if (prods && prods.length > 0) orderedGroups.push({ nhom, products: sortByCode(prods) })
        })
        const crossBrandNhomIds = [...nhomProductsMap.keys()].filter(
          (id): id is number => id !== null && !currentBrandNhomIdSet.has(id),
        )
        crossBrandNhomIds
          .sort((a, b) => {
            const na = nhomIdToNhomMap.get(a)
            const nb = nhomIdToNhomMap.get(b)
            if (!na || !nb) return 0
            return na.thuong_hieu.localeCompare(nb.thuong_hieu) || na.ten_nhom.localeCompare(nb.ten_nhom)
          })
          .forEach((id) => {
            const nhom = nhomIdToNhomMap.get(id) ?? null
            const prods = nhomProductsMap.get(id)
            if (prods && prods.length > 0) orderedGroups.push({ nhom, products: sortByCode(prods) })
          })
        const ungrouped = nhomProductsMap.get(null) ?? []
        if (ungrouped.length > 0) orderedGroups.push({ nhom: null, products: sortByCode(ungrouped) })

        let rowIdx = 0

        return (
          <Box key={m.month}>
            <Group
              gap="xs" px="sm" py={6}
              style={{
                background: 'var(--mantine-color-blue-0)',
                borderRadius: '6px 6px 0 0',
                borderLeft: '3px solid var(--mantine-color-blue-5)',
                borderBottom: '1px solid var(--mantine-color-blue-2)',
              }}
            >
              <Badge variant="filled" color="blue" size="sm" radius="sm">{m.month}</Badge>
              <Text size="xs" c="dimmed">{m.products.length} sản phẩm</Text>
              <Text size="xs" fw={600} c="dark">Số lượng: {fmtQty(m.totalQty)}</Text>
              {roundedMonthThung > 0 && (
                <Text size="xs" fw={600} c="dark">{fmt.format(roundedMonthThung)} thùng</Text>
              )}
              <Text size="xs" fw={600} c="blue.7" style={{ marginLeft: 'auto' }}>
                {fmtAmount(m.totalAmount)}
              </Text>
            </Group>

            <Table fz="xs" style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '9%' }}>Mã sản phẩm</Table.Th>
                  <Table.Th style={{ width: '17%' }}>Tên sản phẩm</Table.Th>
                  <Table.Th style={{ width: '12%' }}>Mã hóa đơn</Table.Th>
                  <Table.Th style={{ width: '5%', textAlign: 'center' }}>Đơn vị tính</Table.Th>
                  <Table.Th style={{ width: '7%', textAlign: 'right' }}>Số lượng</Table.Th>
                  <Table.Th style={{ width: '6%', textAlign: 'right' }}>Quy cách</Table.Th>
                  <Table.Th style={{ width: '8%', textAlign: 'right' }}>Số lượng thùng</Table.Th>
                  <Table.Th style={{ width: '8%', textAlign: 'center' }}>Thời gian</Table.Th>
                  <Table.Th style={{ width: '12%', textAlign: 'right' }}>Đơn giá</Table.Th>
                  <Table.Th style={{ width: '13%', textAlign: 'right' }}>Thành tiền</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orderedGroups.map(({ nhom, products: groupProds }) => {
                  const groupThung = groupProds.reduce((s, p) => {
                    const productBrand = productBrandMap.get(p.productCode) ?? brand
                    const qc = quyCachMap.get(`${p.productCode}|${productBrand}`)
                    if (!qc) return s
                    return s + (p.rawLines ?? []).reduce((s2, line) => s2 + round2(line.qty / qc), 0)
                  }, 0)
                  const roundedGroupThung = round2(groupThung)
                  const isUngrouped = nhom === null
                  const isCrossBrand = !isUngrouped && nhom.thuong_hieu !== brand

                  return (
                    <Fragment key={nhom?.id ?? 'ungrouped'}>
                      {/* Hàng tiêu đề nhóm */}
                      <Table.Tr key={`group-${nhom?.id ?? 'ungrouped'}`}>
                        <Table.Td
                          colSpan={10}
                          style={{
                            padding: '5px 10px',
                            background: isUngrouped ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-teal-0)',
                            borderTop: `1px solid ${isUngrouped ? 'var(--mantine-color-red-2)' : 'var(--mantine-color-gray-2)'}`,
                            borderBottom: `1px solid ${isUngrouped ? 'var(--mantine-color-red-2)' : 'var(--mantine-color-gray-2)'}`,
                          }}
                        >
                          <Group gap="xs">
                            {isCrossBrand && <BrandTag brand={nhom.thuong_hieu} />}
                            <Text size="xs" fw={700} c={isUngrouped ? 'red.7' : 'teal.8'}>
                              {isUngrouped ? 'Chưa phân nhóm' : nhom.ten_nhom}
                            </Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{groupProds.length} sản phẩm</Text>
                            {roundedGroupThung > 0 && (
                              <>
                                <Text size="xs" c="dimmed">·</Text>
                                <Text size="xs" fw={600} c={isUngrouped ? 'red.6' : 'teal.7'}>
                                  {fmt.format(roundedGroupThung)} thùng
                                </Text>
                              </>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>

                      {/* Mỗi dòng hóa đơn là một hàng */}
                      {groupProds.flatMap((p) => {
                        const productBrand = productBrandMap.get(p.productCode) ?? brand
                        const quyCach = quyCachMap.get(`${p.productCode}|${productBrand}`) ?? null
                        const missingQC = quyCach === null
                        const rawLines = p.rawLines ?? []

                        return rawLines.map((line, lineIdx) => {
                          const thung = quyCach ? line.qty / quyCach : null
                          const thungRounded = thung !== null ? round2(thung) : null
                          const rowBg = missingQC
                            ? 'var(--mantine-color-orange-0)'
                            : rowIdx % 2 === 0 ? 'white' : 'var(--mantine-color-gray-0)'
                          rowIdx++

                          return (
                            <Table.Tr key={`${m.month}-${p.productCode}-${lineIdx}`} style={{ background: rowBg }}>
                              <Table.Td style={{ paddingLeft: 24, fontSize: 11, fontWeight: 700, color: missingQC ? 'var(--mantine-color-orange-7)' : 'var(--mantine-color-blue-7)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {productBrand !== brand && <BrandTag brand={productBrand} sansSerif />}
                                  {p.productCode}
                                </div>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" truncate title={p.productName}>{p.productName || '—'}</Text>
                              </Table.Td>
                              <Table.Td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mantine-color-dark-4)' }}>
                                {line.invoice || <Text size="xs" c="dimmed" span>—</Text>}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}>
                                {p.unit}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {fmtQty(line.qty)}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', color: missingQC ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-dimmed)' }}>
                                {quyCach !== null ? fmt.format(quyCach) : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: missingQC ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-blue-8)' }}>
                                {thungRounded !== null ? fmt.format(thungRounded) : <span style={{ color: 'var(--mantine-color-orange-5)', fontSize: 11 }}>—</span>}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', whiteSpace: 'nowrap', color: 'var(--mantine-color-dimmed)', fontSize: 11 }}>
                                {line.date || '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', color: 'var(--mantine-color-dimmed)' }}>
                                {fmtAmountOrDash(line.unitPrice)}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', color: 'var(--mantine-color-green-7)', fontWeight: 600 }}>
                                {fmtAmount(line.amount)}
                              </Table.Td>
                            </Table.Tr>
                          )
                        })
                      })}
                    </Fragment>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Box>
        )
      })}
    </Stack>
  )
}
