import { useEffect, useMemo, useState } from 'react'
import {
  Box, Group, Stack, Text, Button,
  TextInput, Select, ActionIcon, ScrollArea,
  Center, SegmentedControl, Switch,
} from '@mantine/core'
import { IconSearch, IconX, IconUser } from '@tabler/icons-react'
import type { BrandSummary, CEOSummary } from '../types'
import type { CEO } from '@/master-data/CEO/types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import { normalizeSearch } from '@/utils/search'
import { fmt, fmtQty, fmtAmount, round2 } from '../format'
import { applyOnlyMain, calcTotalThung, makeBrandMatcher, mergeCEOsAcrossBrands } from '../utils/report'
import MatrixTable from './MatrixTable'
import CEODetailTable from './CEODetailTable'
import CEOListItem from './CEOListItem'

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

  const matchesBrand = useMemo(() => makeBrandMatcher(brand.brand), [brand.brand])

  const [selectedCEO, setSelectedCEO] = useState<string>(
    brand.ceos.find((c) => matchesBrand(c.ceo))?.ceo ?? '',
  )
  const [ceoFilter, setCeoFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [onlyMain, setOnlyMain] = useState(true)

  useEffect(() => {
    setSelectedCEO(brand.ceos.find((c) => matchesBrand(c.ceo))?.ceo ?? '')
    setCeoFilter(null)
    setMonthFilter(null)
    setProductSearch('')
    setInvoiceSearch('')
    setOnlyMain(true)
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
        .map((c) => (onlyMain ? applyOnlyMain(c, brand.brand, sanPhamChinhSet) : c)),
    [allCEOs, ceoFilter, monthFilter, search, qInvoice, onlyMain, brand.brand, sanPhamChinhSet],
  )

  const activeCEO = visibleCEOs.find((c) => c.ceo === selectedCEO) ?? visibleCEOs[0]

  const totalQtyFiltered = visibleCEOs.reduce((s, c) => s + c.totalQty, 0)
  const totalAmountFiltered = visibleCEOs.reduce((s, c) => s + c.totalAmount, 0)
  const totalThungFiltered = visibleCEOs.reduce(
    (s, c) => s + calcTotalThung(c, brand.brand, quyCachMap, productBrandMap),
    0,
  )

  const isFiltered = !!ceoFilter || !!monthFilter || !!productSearch.trim() || !!invoiceSearch.trim() || !onlyMain

  function clearFilters() {
    setCeoFilter(null)
    setMonthFilter(null)
    setProductSearch('')
    setInvoiceSearch('')
    setOnlyMain(true)
  }

  const activeTotalThung = activeCEO ? calcTotalThung(activeCEO, brand.brand, quyCachMap, productBrandMap) : 0
  const activeInMasterData = activeCEO ? masterCEOCodeSet.has(activeCEO.ceo) : true

  return (
    <Stack h="100%" gap={0}>
      {/* Stats row */}
      <Group px="lg" py="xs" gap="lg"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', flexShrink: 0 }}>
        <Text size="sm" c="dimmed">
          Số CEO: <Text span fw={600} c="dark">{visibleCEOs.length}{isFiltered ? `/${allCEOs.length}` : ''}</Text>
        </Text>
        <Text size="sm" c="dimmed">
          Tổng sản phẩm: <Text span fw={600} c="dark">{fmtQty(totalQtyFiltered)}</Text>
        </Text>
        {totalThungFiltered > 0 && (
          <Text size="sm" c="dimmed">
            Tổng thùng: <Text span fw={600} c="dark">{fmt.format(round2(totalThungFiltered))}</Text>
          </Text>
        )}
        <Text size="sm" c="dimmed">
          Tổng tiền: <Text span fw={600} c="green.7">{fmtAmount(totalAmountFiltered)}</Text>
        </Text>
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
        <Select
          placeholder="Tháng"
          data={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          clearable size="xs"
          style={{ minWidth: 110 }}
        />
        <TextInput
          placeholder="Mã / tên sản phẩm"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          size="xs"
          leftSection={<IconSearch size={13} />}
          rightSection={productSearch
            ? <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setProductSearch('')}>
                <IconX size={11} />
              </ActionIcon>
            : null}
          style={{ minWidth: 180 }}
        />
        <TextInput
          placeholder="Mã hóa đơn"
          value={invoiceSearch}
          onChange={(e) => setInvoiceSearch(e.target.value)}
          size="xs"
          leftSection={<IconSearch size={13} />}
          rightSection={invoiceSearch
            ? <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setInvoiceSearch('')}>
                <IconX size={11} />
              </ActionIcon>
            : null}
          style={{ minWidth: 150 }}
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
        <div style={{ marginLeft: 'auto' }}>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'detail' | 'matrix')}
            data={[
              { label: 'Bảng', value: 'matrix' },
              { label: 'Chi tiết', value: 'detail' },
            ]}
          />
        </div>
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
