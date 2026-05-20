import { useMemo, useState } from 'react'
import { Box, Group, Stack, Text, Button, ScrollArea, SegmentedControl, Tabs } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
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
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={14} />}
            onClick={onReset}
            aria-label="Quay về danh sách phiên"
          >
            Danh sách phiên
          </Button>
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
        <Tabs
          value={currentBrand}
          onChange={(v) => v && setActiveBrand(v)}
          variant="default"
          keepMounted={false}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <ScrollArea
            type="scroll"
            scrollbarSize={4}
            style={{ flexShrink: 0, borderBottom: '1px solid var(--mantine-color-gray-2)', background: 'white' }}
          >
            <Tabs.List style={{ flexWrap: 'nowrap', paddingLeft: 8, paddingRight: 8 }}>
              {data.brands.map((b) => (
                <Tabs.Tab key={b.brand} value={b.brand} style={{ whiteSpace: 'nowrap' }}>
                  {b.brand}
                </Tabs.Tab>
              ))}
            </Tabs.List>
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
        </Tabs>
      )}
    </Stack>
  )
}
