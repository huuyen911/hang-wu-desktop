import { useMemo } from 'react'
import {
  Table,
  Text,
  TextInput,
  MultiSelect,
  Select,
  Badge,
  ActionIcon,
  Group,
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import type { NhomSanPham, NhomSanPhamFormValues, ThuongHieu } from './types'
import type { SanPham } from '../SanPham/types'
import { useCrudResource } from '@/hooks/useCrudResource'
import { api } from '@/lib/api'
import { RESOURCES } from '@/lib/queryKeys'
import { THUONG_HIEU_OPTIONS, brandColor } from '@/domain/constants'
import CrudShell from '@/components/crud/CrudShell'
import FormModal from '@/components/crud/FormModal'
import DeleteConfirmModal from '@/components/crud/DeleteConfirmModal'

const EMPTY_FORM: NhomSanPhamFormValues = {
  ten_nhom: '',
  thuong_hieu: '',
  san_pham_ids: [],
}

function validate(form: NhomSanPhamFormValues): Partial<Record<keyof NhomSanPhamFormValues, string>> {
  const errors: Partial<Record<keyof NhomSanPhamFormValues, string>> = {}
  if (!form.ten_nhom.trim()) errors.ten_nhom = 'Tên nhóm sản phẩm là bắt buộc'
  if (!form.thuong_hieu) errors.thuong_hieu = 'Vui lòng chọn thương hiệu'
  if (form.san_pham_ids.length === 0) errors.san_pham_ids = 'Vui lòng chọn ít nhất một sản phẩm'
  return errors
}

export default function NhomSanPhamPage() {
  const c = useCrudResource<NhomSanPham, NhomSanPhamFormValues>({
    resource: RESOURCES.nhomSanPham,
    entityLabel: 'nhóm sản phẩm',
    emptyForm: EMPTY_FORM,
    toForm: (item) => ({
      ten_nhom: item.ten_nhom,
      thuong_hieu: item.thuong_hieu,
      san_pham_ids: item.san_pham_ids.map(String),
    }),
    toPayload: (form) => ({
      ten_nhom: form.ten_nhom,
      thuong_hieu: form.thuong_hieu as ThuongHieu,
      san_pham_ids: form.san_pham_ids.map(Number),
    }),
    validate,
    nameOfForm: (f) => f.ten_nhom,
    nameOfItem: (i) => i.ten_nhom,
    searchFields: (i) => [i.ten_nhom],
  })

  const setForm = c.setForm

  const { data: sanPhamList = [] } = useQuery({
    queryKey: RESOURCES.sanPham.key,
    queryFn: () => api.get<SanPham[]>(RESOURCES.sanPham.endpoint),
  })

  // Chỉ liệt kê SP là *sản phẩm chính* của thương hiệu đã chọn. Cờ SP chính
  // độc lập với thuong_hieu gốc của SP (xem useReportMasterData), nên không lọc
  // theo sp.thuong_hieu. Vẫn giữ lại các SP đã được chọn sẵn (lúc sửa nhóm cũ)
  // dù hiện không còn là SP chính, để không mất nhãn/lựa chọn.
  const sanPhamOptions = useMemo(() => {
    if (!c.form.thuong_hieu) return []
    const selected = new Set(c.form.san_pham_ids)
    const isMain = (sp: SanPham) =>
      c.form.thuong_hieu === 'Weilaiya'
        ? sp.la_san_pham_chinh_weilaiya
        : sp.la_san_pham_chinh_elvawell
    return sanPhamList
      .filter((sp) => isMain(sp) || selected.has(String(sp.id)))
      .map((sp) => ({ value: String(sp.id), label: `${sp.ma_san_pham} – ${sp.ten_san_pham}` }))
  }, [sanPhamList, c.form.thuong_hieu, c.form.san_pham_ids])

  const sanPhamMap = useMemo(
    () => new Map(sanPhamList.map((sp) => [sp.id, sp])),
    [sanPhamList],
  )

  const table = (
    <Table stickyHeader striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Tên nhóm sản phẩm</Table.Th>
          <Table.Th style={{ width: 120 }}>Thương hiệu</Table.Th>
          <Table.Th>Sản phẩm</Table.Th>
          <Table.Th style={{ textAlign: 'center', width: 100 }}>Thao tác</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {c.filtered.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="sm" fw={500}>{item.ten_nhom}</Text>
            </Table.Td>
            <Table.Td>
              <Badge color={brandColor(item.thuong_hieu)} variant="light" size="sm">
                {item.thuong_hieu}
              </Badge>
            </Table.Td>
            <Table.Td>
              {item.san_pham_ids.length === 0 ? (
                <Text size="xs" c="dimmed">Chưa có sản phẩm</Text>
              ) : (
                item.san_pham_ids.map((spId) => {
                  const sp = sanPhamMap.get(spId)
                  return (
                    <Text key={spId} size="sm">
                      {sp ? `• ${sp.ma_san_pham} - ${sp.ten_san_pham}` : `• #${spId}`}
                    </Text>
                  )
                })
              )}
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Group gap={6} justify="center">
                <ActionIcon variant="light" color="blue" onClick={() => c.openEdit(item)} title="Sửa">
                  <IconPencil size={15} />
                </ActionIcon>
                <ActionIcon variant="light" color="red" onClick={() => c.setDeleteTarget(item)} title="Xóa">
                  <IconTrash size={15} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )

  return (
    <CrudShell
      title="Danh sách nhóm sản phẩm"
      addLabel="+ Thêm nhóm"
      onAdd={c.openCreate}
      search={c.search}
      onSearchChange={c.setSearch}
      searchPlaceholder="Tìm theo tên nhóm sản phẩm..."
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={c.filtered.length === 0}
      emptyText={c.search ? 'Không tìm thấy nhóm sản phẩm phù hợp' : 'Chưa có nhóm sản phẩm nào'}
      table={table}
    >
      <FormModal
        opened={c.modalOpen}
        isEdit={!!c.editItem}
        entityLabel="nhóm sản phẩm"
        onClose={c.closeModal}
        onSubmit={c.handleSave}
        isSaving={c.isSaving}
      >
        <TextInput
          label="Tên nhóm sản phẩm"
          placeholder="VD: Nhóm dưỡng da, Nhóm làm sạch..."
          required
          value={c.form.ten_nhom}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, ten_nhom: v })) }}
          error={c.errors.ten_nhom}
        />
        <Select
          label="Thương hiệu"
          placeholder="Chọn thương hiệu"
          required
          data={THUONG_HIEU_OPTIONS}
          value={c.form.thuong_hieu || null}
          onChange={(val) => setForm((f) => ({ ...f, thuong_hieu: (val as ThuongHieu) ?? '', san_pham_ids: [] }))}
          error={c.errors.thuong_hieu}
        />
        <MultiSelect
          label="Sản phẩm"
          placeholder={c.form.thuong_hieu ? 'Chọn sản phẩm trong nhóm...' : 'Vui lòng chọn thương hiệu trước'}
          required
          disabled={!c.form.thuong_hieu}
          data={sanPhamOptions}
          value={c.form.san_pham_ids}
          onChange={(val) => setForm((f) => ({ ...f, san_pham_ids: val }))}
          searchable
          clearable
          hidePickedOptions
          error={c.errors.san_pham_ids}
          description={c.form.san_pham_ids.length > 0 ? `Đã chọn ${c.form.san_pham_ids.length} sản phẩm` : undefined}
        />
      </FormModal>

      <DeleteConfirmModal
        opened={!!c.deleteTarget}
        entityLabel="nhóm sản phẩm"
        name={c.deleteTarget?.ten_nhom}
        onClose={() => c.setDeleteTarget(null)}
        onConfirm={c.confirmDelete}
        isDeleting={c.isDeleting}
      />
    </CrudShell>
  )
}
