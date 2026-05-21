import { useMemo, useState } from 'react'
import {
  Table,
  Text,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Checkbox,
  Badge,
  ActionIcon,
  Button,
  Center,
  Group,
  Tooltip,
} from '@mantine/core'
import { IconPencil, IconTrash, IconCheck, IconX } from '@tabler/icons-react'
import type { SanPham, SanPhamFormValues, ThuongHieu } from './types'
import { useCrudResource } from '@/hooks/useCrudResource'
import { RESOURCES } from '@/lib/queryKeys'
import { THUONG_HIEU_OPTIONS, brandColor } from '@/domain/constants'
import { mantineTableProps } from '@/styles/table'
import CrudShell from '@/components/crud/CrudShell'
import FormModal from '@/components/crud/FormModal'
import DeleteConfirmModal from '@/components/crud/DeleteConfirmModal'

const EMPTY_FORM: SanPhamFormValues = {
  ma_san_pham: '',
  ten_san_pham: '',
  quy_cach: '',
  thuong_hieu: '',
  la_san_pham_chinh_weilaiya: false,
  la_san_pham_chinh_elvawell: false,
  thuong_ceo: '',
  thuong_cap_tren: '',
}

function validate(form: SanPhamFormValues): Partial<Record<keyof SanPhamFormValues, string>> {
  const errors: Partial<Record<keyof SanPhamFormValues, string>> = {}
  if (!form.ma_san_pham.trim()) errors.ma_san_pham = 'Mã sản phẩm là bắt buộc'
  if (!form.ten_san_pham.trim()) errors.ten_san_pham = 'Tên sản phẩm là bắt buộc'
  if (form.quy_cach === '' || Number(form.quy_cach) <= 0)
    errors.quy_cach = 'Quy cách phải là số nguyên dương'
  if (!form.thuong_hieu) errors.thuong_hieu = 'Vui lòng chọn thương hiệu'
  return errors
}

export default function SanPhamPage() {
  const c = useCrudResource<SanPham, SanPhamFormValues>({
    resource: RESOURCES.sanPham,
    entityLabel: 'sản phẩm',
    emptyForm: EMPTY_FORM,
    toForm: (item) => ({
      ma_san_pham: item.ma_san_pham,
      ten_san_pham: item.ten_san_pham,
      quy_cach: item.quy_cach,
      thuong_hieu: item.thuong_hieu,
      la_san_pham_chinh_weilaiya: item.la_san_pham_chinh_weilaiya,
      la_san_pham_chinh_elvawell: item.la_san_pham_chinh_elvawell,
      thuong_ceo: item.thuong_ceo ?? '',
      thuong_cap_tren: item.thuong_cap_tren ?? '',
    }),
    toPayload: (form) => ({
      ...form,
      quy_cach: Number(form.quy_cach),
      thuong_ceo: form.thuong_ceo === '' ? null : Number(form.thuong_ceo),
      thuong_cap_tren: form.thuong_cap_tren === '' ? null : Number(form.thuong_cap_tren),
    }),
    validate,
    nameOfForm: (f) => f.ten_san_pham,
    nameOfItem: (i) => i.ten_san_pham,
    searchFields: (i) => [i.ma_san_pham, i.ten_san_pham],
  })

  const [filterBrand, setFilterBrand] = useState<string | null>(null)
  const [filterChinhElva, setFilterChinhElva] = useState(false)
  const [filterChinhWei, setFilterChinhWei] = useState(false)

  const displayFiltered = useMemo(() => {
    let result = c.filtered
    if (filterBrand) result = result.filter((i) => i.thuong_hieu === filterBrand)
    if (filterChinhElva) result = result.filter((i) => i.la_san_pham_chinh_elvawell)
    if (filterChinhWei) result = result.filter((i) => i.la_san_pham_chinh_weilaiya)
    return result
  }, [c.filtered, filterBrand, filterChinhElva, filterChinhWei])

  const setForm = c.setForm

  const mainFlag = (on: boolean) =>
    on ? (
      <IconCheck size={18} color="green" stroke={2.5} />
    ) : (
      <IconX size={18} color="red" stroke={2.5} />
    )

  const table = (
    <Table {...mantineTableProps}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th scope="col">Mã sản phẩm</Table.Th>
          <Table.Th scope="col">Tên sản phẩm</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'center', width: 100 }}>Quy cách</Table.Th>
          <Table.Th scope="col" style={{ width: 120 }}>Thương hiệu</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'center', width: 130 }}>Chính (Elvawell)</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'center', width: 130 }}>Chính (Weilaiya)</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'right', width: 130 }}>Thưởng CEO</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'right', width: 130 }}>Thưởng cấp trên</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'center', width: 100 }}>Thao tác</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {displayFiltered.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="xs" ff="monospace" fw={500}>{item.ma_san_pham}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="xs">{item.ten_san_pham}</Text>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Text size="xs">{item.quy_cach}</Text>
            </Table.Td>
            <Table.Td>
              <Badge color={brandColor(item.thuong_hieu)} variant="light" size="sm">
                {item.thuong_hieu}
              </Badge>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Center>{mainFlag(item.la_san_pham_chinh_elvawell)}</Center>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Center>{mainFlag(item.la_san_pham_chinh_weilaiya)}</Center>
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text size="xs">{item.thuong_ceo != null ? item.thuong_ceo.toLocaleString('vi-VN') : '—'}</Text>
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text size="xs">{item.thuong_cap_tren != null ? item.thuong_cap_tren.toLocaleString('vi-VN') : '—'}</Text>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Group gap={6} justify="center" wrap="nowrap">
                <Tooltip label="Sửa" withArrow>
                  <ActionIcon variant="light" color="blue" size="sm" onClick={() => c.openEdit(item)} aria-label={`Sửa sản phẩm ${item.ma_san_pham}`}>
                    <IconPencil size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Xóa" withArrow>
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => c.setDeleteTarget(item)} aria-label={`Xoá sản phẩm ${item.ma_san_pham}`}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )

  const FILTER_W = 250

  const isAnyFilterActive = !!c.search || !!filterBrand || filterChinhElva || filterChinhWei

  function clearAllFilters() {
    c.setSearch('')
    setFilterBrand(null)
    setFilterChinhElva(false)
    setFilterChinhWei(false)
  }

  const extraFilters = (
    <>
      <Select
        placeholder="Thương hiệu"
        data={THUONG_HIEU_OPTIONS}
        value={filterBrand}
        onChange={setFilterBrand}
        clearable
        size="xs"
        style={{ width: FILTER_W }}
      />
      <Checkbox
        label="Chính (Elvawell)"
        checked={filterChinhElva}
        onChange={(e) => setFilterChinhElva(e.currentTarget.checked)}
        size="xs"
      />
      <Checkbox
        label="Chính (Weilaiya)"
        checked={filterChinhWei}
        onChange={(e) => setFilterChinhWei(e.currentTarget.checked)}
        size="xs"
      />
      {isAnyFilterActive && (
        <Button size="xs" variant="subtle" color="red" onClick={clearAllFilters}>
          Xoá bộ lọc
        </Button>
      )}
    </>
  )

  return (
    <CrudShell
      title="Danh sách sản phẩm"
      addLabel="Thêm sản phẩm"
      onAdd={c.openCreate}
      search={c.search}
      onSearchChange={c.setSearch}
      searchPlaceholder="Tìm theo mã, tên sản phẩm..."
      searchMaxWidth={FILTER_W}
      searchFixed
      searchSize="xs"
      extraFilters={extraFilters}
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={displayFiltered.length === 0}
      emptyText={isAnyFilterActive ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
      totalCount={c.items.length}
      filteredCount={displayFiltered.length}
      table={table}
    >
      <FormModal
        opened={c.modalOpen}
        isEdit={!!c.editItem}
        entityLabel="sản phẩm"
        onClose={c.closeModal}
        onSubmit={c.handleSave}
        isSaving={c.isSaving}
      >
        <TextInput
          label="Mã sản phẩm"
          placeholder="VD: WLY-001"
          required
          value={c.form.ma_san_pham}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, ma_san_pham: v })) }}
          error={c.errors.ma_san_pham}
        />
        <TextInput
          label="Tên sản phẩm"
          placeholder="Nhập tên sản phẩm"
          required
          value={c.form.ten_san_pham}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, ten_san_pham: v })) }}
          error={c.errors.ten_san_pham}
        />
        <NumberInput
          label="Quy cách (số lượng / thùng)"
          placeholder="VD: 36"
          required
          min={1}
          allowDecimal={false}
          value={c.form.quy_cach}
          onChange={(val) => setForm((f) => ({ ...f, quy_cach: val as number | '' }))}
          error={c.errors.quy_cach}
        />
        <Select
          label="Thương hiệu"
          placeholder="Chọn thương hiệu"
          required
          data={THUONG_HIEU_OPTIONS}
          value={c.form.thuong_hieu || null}
          onChange={(val) => setForm((f) => ({ ...f, thuong_hieu: (val as ThuongHieu) ?? '' }))}
          error={c.errors.thuong_hieu}
        />
        <NumberInput
          label="Thưởng CEO"
          placeholder="Nhập số tiền thưởng CEO"
          min={0}
          allowDecimal={false}
          thousandSeparator="."
          decimalSeparator=","
          value={c.form.thuong_ceo}
          onChange={(val) => setForm((f) => ({ ...f, thuong_ceo: val as number | '' }))}
        />
        <NumberInput
          label="Thưởng cấp trên"
          placeholder="Nhập số tiền thưởng cấp trên"
          min={0}
          allowDecimal={false}
          thousandSeparator="."
          decimalSeparator=","
          value={c.form.thuong_cap_tren}
          onChange={(val) => setForm((f) => ({ ...f, thuong_cap_tren: val as number | '' }))}
        />
        <Switch
          label="Sản phẩm chính — Elvawell"
          description="Bật nếu đây là sản phẩm chính bên Elvawell (kể cả khi SP thuộc thương hiệu khác)"
          checked={c.form.la_san_pham_chinh_elvawell}
          onChange={(e) => { const v = e.currentTarget.checked; setForm((f) => ({ ...f, la_san_pham_chinh_elvawell: v })) }}
          mt={4}
        />
        <Switch
          label="Sản phẩm chính — Weilaiya"
          description="Bật nếu đây là sản phẩm chính bên Weilaiya (kể cả khi SP thuộc thương hiệu khác)"
          checked={c.form.la_san_pham_chinh_weilaiya}
          onChange={(e) => { const v = e.currentTarget.checked; setForm((f) => ({ ...f, la_san_pham_chinh_weilaiya: v })) }}
          mt={4}
        />
      </FormModal>

      <DeleteConfirmModal
        opened={!!c.deleteTarget}
        entityLabel="sản phẩm"
        name={c.deleteTarget?.ten_san_pham}
        code={c.deleteTarget?.ma_san_pham}
        onClose={() => c.setDeleteTarget(null)}
        onConfirm={c.confirmDelete}
        isDeleting={c.isDeleting}
      />
    </CrudShell>
  )
}
