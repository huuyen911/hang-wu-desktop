import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { api } from '@/lib/api'
import { normalizeSearch } from '@/utils/search'

export interface CrudResource {
  key: readonly string[]
  endpoint: string
}

export interface CrudConfig<T extends { id: number }, F> {
  resource: CrudResource
  /** Nhãn loại thực thể, ví dụ "sản phẩm", "CEO" — dùng trong thông báo. */
  entityLabel: string
  emptyForm: F
  toForm: (item: T) => F
  toPayload: (form: F) => unknown
  validate: (form: F) => Partial<Record<keyof F, string>>
  /** Tên hiển thị của một bản ghi (cho thông báo lưu/xóa). */
  nameOfForm: (form: F) => string
  nameOfItem: (item: T) => string
  /** Các trường dùng để lọc theo ô tìm kiếm. */
  searchFields: (item: T) => Array<string | null | undefined>
}

/** Viết hoa chữ cái đầu — thông báo dùng "Sản phẩm", trong khi modal dùng "sản phẩm". */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function notifyError(e: unknown) {
  notifications.show({
    title: 'Lỗi',
    message: e instanceof Error ? e.message : 'Lỗi không xác định',
    color: 'red',
  })
}

/**
 * Hook gom toàn bộ cơ chế lặp lại của một trang master-data: tải danh sách,
 * mutation lưu/xóa kèm thông báo, trạng thái modal tạo/sửa, xác nhận xóa và
 * lọc theo tìm kiếm. Mỗi trang chỉ còn phải khai báo cấu hình + render bảng/form.
 */
export function useCrudResource<T extends { id: number }, F>(cfg: CrudConfig<T, F>) {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: cfg.resource.key,
    queryFn: () => api.get<T[]>(cfg.resource.endpoint),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<T | null>(null)
  const [form, setForm] = useState<F>(cfg.emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof F, string>>>({})
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [search, setSearch] = useState('')

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: cfg.resource.key })
  }

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) =>
      editItem
        ? api.put(`${cfg.resource.endpoint}/${editItem.id}`, payload)
        : api.post(cfg.resource.endpoint, payload),
    onSuccess: () => {
      notifications.show({
        title: editItem ? 'Cập nhật thành công' : 'Thêm mới thành công',
        message: `${capitalize(cfg.entityLabel)} "${cfg.nameOfForm(form)}" đã được lưu`,
        color: 'green',
      })
      invalidate()
      closeModal()
    },
    onError: notifyError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`${cfg.resource.endpoint}/${id}`),
    onSuccess: (_data, _id) => {
      notifications.show({
        title: 'Đã xóa',
        message: `${capitalize(cfg.entityLabel)} "${deleteTarget ? cfg.nameOfItem(deleteTarget) : ''}" đã được xóa`,
        color: 'orange',
      })
      invalidate()
      setDeleteTarget(null)
    },
    onError: notifyError,
  })

  function openCreate() {
    setEditItem(null)
    setForm(cfg.emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(item: T) {
    setEditItem(item)
    setForm(cfg.toForm(item))
    setErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditItem(null)
  }

  function handleSave() {
    const validationErrors = cfg.validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    saveMutation.mutate(cfg.toPayload(form))
  }

  function confirmDelete() {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
  }

  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim())
    if (!q) return items
    return items.filter((item) =>
      cfg.searchFields(item).some((f) => f != null && normalizeSearch(f).includes(q)),
    )
  }, [items, search, cfg])

  return {
    items,
    filtered,
    isLoading,
    error,
    search,
    setSearch,
    // modal / form
    modalOpen,
    editItem,
    form,
    setForm,
    errors,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    isSaving: saveMutation.isPending,
    // delete
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
  }
}
