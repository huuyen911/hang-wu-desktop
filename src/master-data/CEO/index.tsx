import {
  Table,
  Text,
  TextInput,
  Select,
  Badge,
  ActionIcon,
  Group,
  Tooltip,
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import type { CEO, CEOFormValues, NhanVienChamSoc } from './types'
import { useCrudResource } from '@/hooks/useCrudResource'
import { RESOURCES } from '@/lib/queryKeys'
import { NHAN_VIEN_OPTIONS, nhanVienColor } from '@/domain/constants'
import { mantineTableProps } from '@/styles/table'
import CrudShell from '@/components/crud/CrudShell'
import FormModal from '@/components/crud/FormModal'
import DeleteConfirmModal from '@/components/crud/DeleteConfirmModal'

const EMPTY_FORM: CEOFormValues = {
  ma_ceo: '',
  ten_ceo: '',
  ceo_cap_tren_id: null,
  nhan_vien_cham_soc: '',
}

function validate(form: CEOFormValues): Partial<Record<keyof CEOFormValues, string>> {
  const errors: Partial<Record<keyof CEOFormValues, string>> = {}
  if (!form.ma_ceo.trim()) errors.ma_ceo = 'Mã CEO là bắt buộc'
  if (!form.ten_ceo.trim()) errors.ten_ceo = 'Tên CEO là bắt buộc'
  if (!form.nhan_vien_cham_soc) errors.nhan_vien_cham_soc = 'Vui lòng chọn nhân viên chăm sóc'
  return errors
}

export default function CEOPage() {
  const c = useCrudResource<CEO, CEOFormValues>({
    resource: RESOURCES.ceo,
    entityLabel: 'CEO',
    emptyForm: EMPTY_FORM,
    toForm: (item) => ({
      ma_ceo: item.ma_ceo,
      ten_ceo: item.ten_ceo,
      ceo_cap_tren_id: item.ceo_cap_tren_id ? String(item.ceo_cap_tren_id) : null,
      nhan_vien_cham_soc: item.nhan_vien_cham_soc,
    }),
    toPayload: (form) => ({
      ...form,
      ceo_cap_tren_id: form.ceo_cap_tren_id ? Number(form.ceo_cap_tren_id) : null,
    }),
    validate,
    nameOfForm: (f) => f.ten_ceo,
    nameOfItem: (i) => i.ten_ceo,
    searchFields: (i) => [i.ma_ceo, i.ten_ceo, i.nhan_vien_cham_soc],
  })

  const setForm = c.setForm

  const capTrenOptions = c.items
    .filter((item) => item.id !== c.editItem?.id)
    .map((item) => ({ value: String(item.id), label: `${item.ma_ceo} – ${item.ten_ceo}` }))

  function getCapTrenName(id: number | null): string {
    if (!id) return '—'
    const found = c.items.find((item) => item.id === id)
    return found ? `${found.ma_ceo} – ${found.ten_ceo}` : '—'
  }

  const table = (
    <Table {...mantineTableProps}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th scope="col">Mã CEO</Table.Th>
          <Table.Th scope="col">Tên CEO</Table.Th>
          <Table.Th scope="col">CEO cấp trên</Table.Th>
          <Table.Th scope="col">Nhân viên chăm sóc</Table.Th>
          <Table.Th scope="col" style={{ textAlign: 'center', width: 100 }}>Thao tác</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {c.filtered.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="xs" ff="monospace" fw={500}>{item.ma_ceo}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="xs">{item.ten_ceo}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="xs" c={item.ceo_cap_tren_id ? undefined : 'dimmed'}>
                {getCapTrenName(item.ceo_cap_tren_id)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Badge color={nhanVienColor(item.nhan_vien_cham_soc)} variant="light" size="sm">
                {item.nhan_vien_cham_soc}
              </Badge>
            </Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
              <Group gap={6} justify="center" wrap="nowrap">
                <Tooltip label="Sửa" withArrow>
                  <ActionIcon variant="light" color="blue" size="sm" onClick={() => c.openEdit(item)} aria-label={`Sửa CEO ${item.ma_ceo}`}>
                    <IconPencil size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Xóa" withArrow>
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => c.setDeleteTarget(item)} aria-label={`Xoá CEO ${item.ma_ceo}`}>
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

  return (
    <CrudShell
      title="Danh sách CEO"
      addLabel="Thêm CEO"
      onAdd={c.openCreate}
      search={c.search}
      onSearchChange={c.setSearch}
      searchPlaceholder="Tìm theo mã, tên hoặc nhân viên chăm sóc..."
      searchMaxWidth={420}
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={c.filtered.length === 0}
      emptyText={c.search ? 'Không tìm thấy CEO phù hợp' : 'Chưa có CEO nào'}
      totalCount={c.items.length}
      filteredCount={c.filtered.length}
      table={table}
    >
      <FormModal
        opened={c.modalOpen}
        isEdit={!!c.editItem}
        entityLabel="CEO"
        onClose={c.closeModal}
        onSubmit={c.handleSave}
        isSaving={c.isSaving}
      >
        <TextInput
          label="Mã CEO"
          placeholder="VD: CEO-001"
          required
          value={c.form.ma_ceo}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, ma_ceo: v })) }}
          error={c.errors.ma_ceo}
        />
        <TextInput
          label="Tên CEO"
          placeholder="Nhập tên CEO"
          required
          value={c.form.ten_ceo}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, ten_ceo: v })) }}
          error={c.errors.ten_ceo}
        />
        <Select
          label="CEO cấp trên"
          placeholder="Không có (tùy chọn)"
          clearable
          data={capTrenOptions}
          value={c.form.ceo_cap_tren_id}
          onChange={(val) => setForm((f) => ({ ...f, ceo_cap_tren_id: val }))}
          searchable
        />
        <Select
          label="Nhân viên chăm sóc"
          placeholder="Chọn nhân viên"
          required
          data={NHAN_VIEN_OPTIONS}
          value={c.form.nhan_vien_cham_soc || null}
          onChange={(val) => setForm((f) => ({ ...f, nhan_vien_cham_soc: (val as NhanVienChamSoc) ?? '' }))}
          error={c.errors.nhan_vien_cham_soc}
        />
      </FormModal>

      <DeleteConfirmModal
        opened={!!c.deleteTarget}
        entityLabel="CEO"
        name={c.deleteTarget?.ten_ceo}
        code={c.deleteTarget?.ma_ceo}
        onClose={() => c.setDeleteTarget(null)}
        onConfirm={c.confirmDelete}
        isDeleting={c.isDeleting}
      />
    </CrudShell>
  )
}
