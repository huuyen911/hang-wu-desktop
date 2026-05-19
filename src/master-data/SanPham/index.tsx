import {
  Table,
  Text,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Badge,
  ActionIcon,
  Center,
  Group,
} from '@mantine/core'
import { IconPencil, IconTrash, IconCheck, IconX } from '@tabler/icons-react'
import type { SanPham, SanPhamFormValues, ThuongHieu } from './types'
import { useCrudResource } from '@/hooks/useCrudResource'
import { RESOURCES } from '@/lib/queryKeys'
import { THUONG_HIEU_OPTIONS, brandColor } from '@/domain/constants'
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
    }),
    toPayload: (form) => ({ ...form, quy_cach: Number(form.quy_cach) }),
    validate,
    nameOfForm: (f) => f.ten_san_pham,
    nameOfItem: (i) => i.ten_san_pham,
    searchFields: (i) => [i.ma_san_pham, i.ten_san_pham, i.thuong_hieu],
  })

  const setForm = c.setForm

  const mainFlag = (on: boolean) =>
    on ? (
      <IconCheck size={18} color="green" stroke={2.5} />
    ) : (
      <IconX size={18} color="red" stroke={2.5} />
    )

  const table = (
    <Table stickyHeader striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Mã sản phẩm</Table.Th>
          <Table.Th>Tên sản phẩm</Table.Th>
          <Table.Th style={{ textAlign: 'center' }}>Quy cách</Table.Th>
          <Table.Th>Thương hiệu</Table.Th>
          <Table.Th style={{ textAlign: 'center' }}>Chính (Elvawell)</Table.Th>
          <Table.Th style={{ textAlign: 'center' }}>Chính (Weilaiya)</Table.Th>
          <Table.Th style={{ textAlign: 'center' }}>Thao tác</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {c.filtered.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="sm" ff="monospace" fw={500}>{item.ma_san_pham}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{item.ten_san_pham}</Text>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Text size="sm">{item.quy_cach}</Text>
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
      title="Danh sách sản phẩm"
      addLabel="+ Thêm sản phẩm"
      onAdd={c.openCreate}
      search={c.search}
      onSearchChange={c.setSearch}
      searchPlaceholder="Tìm theo mã, tên hoặc thương hiệu..."
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={c.filtered.length === 0}
      emptyText={c.search ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
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
