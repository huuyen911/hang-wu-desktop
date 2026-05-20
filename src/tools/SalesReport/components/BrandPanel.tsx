import { useEffect, useMemo, useState } from 'react'
import {
  Box, Group, Stack, Text, Button,
  Select, ScrollArea,
  Center, SegmentedControl, Switch,
} from '@mantine/core'
import { IconUser, IconUsers, IconPackage, IconBox, IconCash, IconFileExport } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { buildMatrixExportData } from '../utils/matrixExport'
import type { BrandSummary, CEOSummary } from '../types'
import type { CEO } from '@/master-data/CEO/types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import { normalizeSearch } from '@/utils/search'
import { fmt, fmtQty, fmtAmount, round2 } from '../format'
import { applyOnlyMain, calcTotalThung, makeBrandMatcher, mergeCEOsAcrossBrands } from '../utils/report'
import MatrixTable from './MatrixTable'
import CEODetailTable from './CEODetailTable'
import CEOListItem from './CEOListItem'
import SearchInput from './SearchInput'

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  accentColor?: string
}

function StatTile({ icon, label, value, accentColor }: StatTileProps) {
  return (
    <Group gap={8} wrap="nowrap" align="center">
      <Box style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--mantine-color-gray-1)',
        color: accentColor ?? 'var(--mantine-color-gray-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Stack gap={0}>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>{label}</Text>
        <Text size="sm" fw={700} c={accentColor ? undefined : 'dark'} style={{ lineHeight: 1.3, color: accentColor }}>
          {value}
        </Text>
      </Stack>
    </Group>
  )
}

interface Props {
  brand: BrandSummary
  allBrands: BrandSummary[]
  quyCachMap: Map<string, number>
  sanPhamChinhSet: Set<string>
  masterCEOList: CEO[]
  masterCEOCodeSet: Set<string>
  nhomGroups: NhomSanPham[]
  productToGroupIdMap: Map<string, number>
  allNhomGroups: NhomSanPham[]
  productBrandMap: Map<string, string>
}

export default function BrandPanel({
  brand,
  allBrands,
  quyCachMap,
  sanPhamChinhSet,
  masterCEOList,
  masterCEOCodeSet,
  nhomGroups,
  productToGroupIdMap,
  allNhomGroups,
  productBrandMap,
}: Props) {
  const [viewMode, setViewMode] = useState<'detail' | 'matrix'>('matrix')
  const [exporting, setExporting] = useState(false)

  const matchesBrand = useMemo(() => makeBrandMatcher(brand.brand), [brand.brand])

  const [selectedCEO, setSelectedCEO] = useState<string>(
    brand.ceos.find((c) => matchesBrand(c.ceo))?.ceo ?? '',
  )
  const [ceoFilter, setCeoFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [onlyMain, setOnlyMain] = useState(true)
  const [importStatus, setImportStatus] = useState<'imported' | 'not-imported' | null>(null)

  useEffect(() => {
    setSelectedCEO(brand.ceos.find((c) => matchesBrand(c.ceo))?.ceo ?? '')
    setCeoFilter(null)
    setMonthFilter(null)
    setProductSearch('')
    setInvoiceSearch('')
    setOnlyMain(true)
    setImportStatus(null)
  }, [brand.brand]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gộp dữ liệu CEO trên mọi thương hiệu để thấy được giao dịch cross-brand.
  const allCEOs = useMemo<CEOSummary[]>(
    () => mergeCEOsAcrossBrands(allBrands, masterCEOList, matchesBrand),
    [allBrands, masterCEOList, matchesBrand],
  )

  const masterCEOCodeSetForBrand = useMemo(
    () => new Set(masterCEOList.map((mc) => mc.ma_ceo)),
    [masterCEOList],
  )

  const ceoOptions = useMemo(
    () =>
      allCEOs
        .filter((c) => masterCEOCodeSetForBrand.has(c.ceo) || !masterCEOCodeSet.has(c.ceo))
        .map((c) => ({ value: c.ceo, label: c.ceoName ? `${c.ceo} — ${c.ceoName}` : c.ceo })),
    [allCEOs, masterCEOCodeSetForBrand, masterCEOCodeSet],
  )

  const monthOptions = useMemo(
    () =>
      [...new Set(allCEOs.flatMap((c) => c.months.map((m) => m.month)))]
        .sort()
        .map((m) => ({ value: m, label: m })),
    [allCEOs],
  )

  const search = normalizeSearch(productSearch.trim())
  const qInvoice = normalizeSearch(invoiceSearch.trim())

  const visibleCEOs = useMemo(
    () =>
      allCEOs
        .filter((c) => {
          const isMasterOnly = c.months.length === 0
          if (ceoFilter && c.ceo !== ceoFilter) return false
          if (!isMasterOnly) {
            if (monthFilter && !c.months.some((m) => m.month === monthFilter)) return false
            if (
              search &&
              !c.months.some((m) =>
                m.products.some(
                  (p) =>
                    normalizeSearch(p.productCode).includes(search) ||
                    normalizeSearch(p.productName ?? '').includes(search),
                ),
              )
            )
              return false
            if (
              qInvoice &&
              !c.months.some((m) =>
                m.products.some((p) =>
                  p.invoiceCodes.some((inv) => normalizeSearch(inv).includes(qInvoice)),
                ),
              )
            )
              return false
          }
          return true
        })
        .map((c) => (onlyMain ? applyOnlyMain(c, brand.brand, sanPhamChinhSet) : c))
        .filter((c) => {
          if (!importStatus) return true
          const thung = calcTotalThung(c, brand.brand, quyCachMap, productBrandMap)
          return importStatus === 'imported' ? thung > 0 : thung === 0
        }),
    [
      allCEOs, ceoFilter, monthFilter, search, qInvoice, onlyMain, importStatus,
      brand.brand, sanPhamChinhSet, quyCachMap, productBrandMap,
    ],
  )

  const activeCEO = visibleCEOs.find((c) => c.ceo === selectedCEO) ?? visibleCEOs[0]

  const totalQtyFiltered = visibleCEOs.reduce((s, c) => s + c.totalQty, 0)
  const totalAmountFiltered = visibleCEOs.reduce((s, c) => s + c.totalAmount, 0)
  const totalThungFiltered = visibleCEOs.reduce(
    (s, c) => s + round2(calcTotalThung(c, brand.brand, quyCachMap, productBrandMap)),
    0,
  )

  const isFiltered = !!ceoFilter || !!monthFilter || !!productSearch.trim() || !!invoiceSearch.trim() || !onlyMain || !!importStatus

  function clearFilters() {
    setCeoFilter(null)
    setMonthFilter(null)
    setProductSearch('')
    setInvoiceSearch('')
    setOnlyMain(true)
    setImportStatus(null)
  }

  async function handleExport() {
    if (visibleCEOs.length === 0) return
    setExporting(true)
    try {
      const date = new Date().toISOString().slice(0, 10)
      const path = await save({
        defaultPath: `Báo cáo hàng bán theo khách ${date}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      })
      if (!path) return
      const { headers, textTotals, numTextCols, dataRows } = buildMatrixExportData(
        visibleCEOs,
        brand.brand,
        quyCachMap,
        nhomGroups,
        productToGroupIdMap,
        allNhomGroups,
        productBrandMap,
      )
      await invoke('export_matrix_excel_file', {
        path,
        headers,
        textTotals,
        numTextCols,
        rows: dataRows,
      })
      notifications.show({
        color: 'green',
        title: 'Đã xuất file Excel',
        message: `${visibleCEOs.length} CEO → ${path}`,
        autoClose: 6000,
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Xuất Excel thất bại',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setExporting(false)
    }
  }

  const activeTotalThung = activeCEO ? calcTotalThung(activeCEO, brand.brand, quyCachMap, productBrandMap) : 0
  const activeInMasterData = activeCEO ? masterCEOCodeSet.has(activeCEO.ceo) : true

  return (
    <Stack h="100%" gap={0}>
      {/* Stats row */}
      <Group px="lg" py="xs" gap="xl" justify="space-between"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', flexShrink: 0, background: 'white' }}>
        <Group gap="xl">
          <StatTile
            icon={<IconUsers size={16} />}
            label="Số CEO"
            value={`${visibleCEOs.length}${isFiltered ? `/${allCEOs.length}` : ''}`}
            accentColor="var(--mantine-color-blue-7)"
          />
          <StatTile
            icon={<IconPackage size={16} />}
            label="Tổng sản phẩm"
            value={fmtQty(totalQtyFiltered)}
          />
          {totalThungFiltered > 0 && (
            <StatTile
              icon={<IconBox size={16} />}
              label="Tổng thùng"
              value={fmt.format(round2(totalThungFiltered))}
              accentColor="var(--mantine-color-indigo-7)"
            />
          )}
          <StatTile
            icon={<IconCash size={16} />}
            label="Tổng tiền"
            value={fmtAmount(totalAmountFiltered)}
            accentColor="var(--mantine-color-green-7)"
          />
        </Group>
        <Group gap="xs" wrap="nowrap">
          {viewMode === 'matrix' && (
            <Button
              size="xs"
              variant="light"
              color="teal"
              leftSection={<IconFileExport size={14} />}
              onClick={handleExport}
              loading={exporting}
              disabled={visibleCEOs.length === 0}
            >
              Xuất Excel
            </Button>
          )}
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'detail' | 'matrix')}
            data={[
              { label: 'Bảng', value: 'matrix' },
              { label: 'Chi tiết', value: 'detail' },
            ]}
          />
        </Group>
      </Group>

      {/* Filter bar */}
      <Group px="lg" py="xs" gap="sm" wrap="wrap"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', background: 'var(--mantine-color-gray-0)', flexShrink: 0 }}>
        <Select
          placeholder="CEO"
          data={ceoOptions}
          value={ceoFilter}
          onChange={setCeoFilter}
          searchable clearable size="xs"
          style={{ minWidth: 160 }}
          filter={({ options, search: s }) =>
            options.filter((opt) =>
              'group' in opt ? true : normalizeSearch(opt.label).includes(normalizeSearch(s)),
            )
          }
        />
        <SearchInput
          placeholder="Mã / tên sản phẩm"
          value={productSearch}
          onChange={setProductSearch}
          minWidth={180}
        />
        <SearchInput
          placeholder="Mã hóa đơn"
          value={invoiceSearch}
          onChange={setInvoiceSearch}
          minWidth={150}
        />
        <Select
          size="xs"
          placeholder="Trạng thái nhập hàng"
          value={importStatus}
          onChange={(v) => setImportStatus(v as 'imported' | 'not-imported' | null)}
          data={[
            { value: 'imported', label: 'Có nhập hàng' },
            { value: 'not-imported', label: 'Không nhập hàng' },
          ]}
          clearable
          style={{ minWidth: 170 }}
        />
        <Select
          placeholder="Tháng"
          data={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          clearable size="xs"
          style={{ minWidth: 110 }}
        />
        <Switch
          size="xs"
          label="Chỉ sản phẩm chính"
          checked={onlyMain}
          onChange={(e) => setOnlyMain(e.currentTarget.checked)}
        />
        {isFiltered && (
          <Button size="xs" variant="subtle" color="red" onClick={clearFilters}>Xoá bộ lọc</Button>
        )}
      </Group>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        {viewMode === 'matrix' ? (
          <MatrixTable
            ceos={visibleCEOs}
            brand={brand.brand}
            quyCachMap={quyCachMap}
            masterCEOCodeSet={masterCEOCodeSet}
            nhomGroups={nhomGroups}
            productToGroupIdMap={productToGroupIdMap}
            allNhomGroups={allNhomGroups}
            productBrandMap={productBrandMap}
          />
        ) : (
          <>
            {/* Left: CEO list */}
            <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--mantine-color-gray-2)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {visibleCEOs.length === 0 ? (
                <Center py={32}>
                  <Text size="sm" c="dimmed">Không có CEO</Text>
                </Center>
              ) : (
                <ScrollArea style={{ flex: 1 }}>
                  <Stack gap={0} p="xs">
                    {visibleCEOs.map((c) => {
                      const crossBrands = new Set(
                        c.months
                          .flatMap((m) => m.products.map((p) => productBrandMap.get(p.productCode) ?? brand.brand))
                          .filter((b) => b !== brand.brand),
                      )
                      return (
                        <CEOListItem
                          key={c.ceo}
                          ceo={c}
                          active={c.ceo === activeCEO?.ceo}
                          onClick={() => setSelectedCEO(c.ceo)}
                          totalThung={calcTotalThung(c, brand.brand, quyCachMap, productBrandMap)}
                          inMasterData={masterCEOCodeSet.has(c.ceo)}
                          crossBrands={crossBrands}
                        />
                      )
                    })}
                  </Stack>
                </ScrollArea>
              )}
            </div>

            {/* Right: CEO detail */}
            {activeCEO ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                <Box px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', flexShrink: 0 }}>
                  <Group gap="sm" align="center">
                    <Box style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: activeInMasterData ? 'var(--mantine-color-blue-1)' : 'var(--mantine-color-red-0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconUser size={18} color={activeInMasterData ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-red-6)'} />
                    </Box>
                    <div>
                      <Group gap="xs">
                        <Text fw={700} c={activeInMasterData ? undefined : 'red.6'}>{activeCEO.ceo}</Text>
                        {activeCEO.ceoName && <Text c="dimmed">·</Text>}
                        {activeCEO.ceoName && <Text fw={500}>{activeCEO.ceoName}</Text>}
                      </Group>
                      <Group gap="md" mt={2}>
                        <Text size="xs" c="dimmed">{activeCEO.months.length} tháng</Text>
                        <Text size="xs" c="dimmed">·</Text>
                        <Text size="xs" c="dimmed">{fmtQty(activeCEO.totalQty)} sản phẩm</Text>
                        {activeTotalThung > 0 && (
                          <>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{fmt.format(round2(activeTotalThung))} thùng</Text>
                          </>
                        )}
                        <Text size="xs" c="dimmed">·</Text>
                        <Text size="xs" c="green.7" fw={600}>{fmtAmount(activeCEO.totalAmount)}</Text>
                      </Group>
                    </div>
                  </Group>
                </Box>
                <ScrollArea style={{ flex: 1 }}>
                  <Box p="md">
                    <CEODetailTable
                      ceo={activeCEO}
                      brand={brand.brand}
                      quyCachMap={quyCachMap}
                      nhomGroups={nhomGroups}
                      productToGroupIdMap={productToGroupIdMap}
                      allNhomGroups={allNhomGroups}
                      productBrandMap={productBrandMap}
                    />
                  </Box>
                </ScrollArea>
              </div>
            ) : (
              <Center style={{ flex: 1 }}>
                <Text c="dimmed">Chọn một CEO bên trái</Text>
              </Center>
            )}
          </>
        )}
      </div>
    </Stack>
  )
}
