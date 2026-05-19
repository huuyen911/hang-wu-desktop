import { useMemo, useState } from 'react'
import { Box, Group, Stack, Text, Button, ScrollArea, SegmentedControl } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { aggregateRows } from '../aggregate'
import { useSalesRows } from '../hooks/useSalesRows'
import { useReportMasterData } from '../hooks/useReportMasterData'
import BrandPanel from './BrandPanel'
import SalesRowsTable from './SalesRowsTable'

interface Props {
  sessionName: string
  onReset: () => void
}

export default function DataView({ sessionName, onReset }: Props) {
  const { rows } = useSalesRows()
  const [tab, setTab] = useState<'report' | 'data'>('report')

  // Mọi thao tác CRUD chỉ sửa `rows`; bảng/chi tiết tổng hợp lại từ đó.
  const data = useMemo(() => aggregateRows(rows ?? []), [rows])

  const [activeBrand, setActiveBrand] = useState(data.brands[0]?.brand ?? '')
  const currentBrand =
    data.brands.find((b) => b.brand === activeBrand)?.brand ?? data.brands[0]?.brand ?? ''

  const {
    masterCEOs,
    masterCEOCodeSet,
    nhomSanPhamList,
    nhomSanPhamByBrand,
    quyCachMap,
    sanPhamChinhSet,
    productToGroupIdMap,
    productBrandMap,
  } = useReportMasterData()

  return (
    <Stack h="100%" gap={0}>
      {/* Top bar */}
      <Group px="lg" py="sm" justify="space-between"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', background: 'white', flexShrink: 0 }}>
        <Group gap="xs">
          <IconCheck size={16} color="var(--mantine-color-green-6)" />
          <Text fw={600} size="sm">{sessionName}</Text>
        </Group>
        <Group gap="sm">
          <SegmentedControl
            size="xs"
            value={tab}
            onChange={(v) => setTab(v as 'report' | 'data')}
            data={[
              { label: 'Báo cáo', value: 'report' },
              { label: 'Dữ liệu', value: 'data' },
            ]}
          />
          <Button size="xs" variant="subtle" onClick={onReset}>Đổi file</Button>
        </Group>
      </Group>

      {tab === 'data' ? (
        <SalesRowsTable />
      ) : data.brands.length === 0 ? (
        <Box style={{ flex: 1, display: 'flex' }}>
          <Stack align="center" justify="center" style={{ flex: 1 }} gap="xs">
            <Text c="dimmed">Chưa có dữ liệu. Sang tab “Dữ liệu” để thêm dòng.</Text>
          </Stack>
        </Box>
      ) : (
        <>
          {/* Brand tabs */}
          <ScrollArea
            type="scroll"
            scrollbarSize={4}
            style={{ flexShrink: 0, borderBottom: '1px solid var(--mantine-color-gray-2)', background: 'white' }}
          >
            <Group gap={0} px="sm" pt="xs" wrap="nowrap" style={{ marginBottom: -1 }}>
              {data.brands.map((b) => {
                const active = b.brand === currentBrand
                return (
                  <Box
                    key={b.brand}
                    component="button"
                    onClick={() => setActiveBrand(b.brand)}
                    style={{
                      border: 'none',
                      borderBottom: active ? '2px solid var(--mantine-color-blue-6)' : '2px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      whiteSpace: 'nowrap',
                      color: active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dimmed)',
                      fontWeight: active ? 600 : 400,
                      fontSize: 14,
                      transition: 'color 0.15s',
                    }}
                  >
                    {b.brand}
                  </Box>
                )
              })}
            </Group>
          </ScrollArea>

          {/* Active brand content */}
          <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {data.brands.map((b) =>
              b.brand === currentBrand ? (
                <BrandPanel
                  key={b.brand}
                  brand={b}
                  allBrands={data.brands}
                  quyCachMap={quyCachMap}
                  sanPhamChinhSet={sanPhamChinhSet}
                  masterCEOList={masterCEOs}
                  masterCEOCodeSet={masterCEOCodeSet}
                  nhomGroups={nhomSanPhamByBrand.get(b.brand) ?? []}
                  productToGroupIdMap={productToGroupIdMap}
                  allNhomGroups={nhomSanPhamList}
                  productBrandMap={productBrandMap}
                />
              ) : null,
            )}
          </Box>
        </>
      )}
    </Stack>
  )
}
