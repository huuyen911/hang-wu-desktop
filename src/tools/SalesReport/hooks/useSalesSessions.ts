import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { api } from '@/lib/api'
import { RESOURCES } from '@/lib/queryKeys'
import type { SalesRow, SalesSession, SalesSessionMeta } from '../types'

const EP = RESOURCES.salesSession.endpoint

// Tách riêng key list vs detail để invalidate list không làm refetch (mất các
// chỉnh sửa optimistic của) phiên đang mở.
export const SESSION_LIST_KEY = ['sales-sessions', 'list'] as const
export const sessionDetailKey = (id: number) =>
  ['sales-sessions', 'detail', id] as const

/** Quản lý lịch sử phiên: liệt kê / tạo / đổi tên / xoá. */
export function useSalesSessions() {
  const qc = useQueryClient()
  const invalidateList = () => qc.invalidateQueries({ queryKey: SESSION_LIST_KEY })

  const list = useQuery({
    queryKey: SESSION_LIST_KEY,
    queryFn: () => api.get<SalesSessionMeta[]>(EP),
  })

  const create = useMutation({
    mutationFn: (v: { ten: string; file_name: string; rows: SalesRow[] }) =>
      api.post<SalesSession>(EP, v),
    onSuccess: invalidateList,
  })

  const rename = useMutation({
    mutationFn: (v: { id: number; ten: string }) =>
      api.put<SalesSessionMeta>(`${EP}/${v.id}`, { ten: v.ten }),
    onSuccess: invalidateList,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`${EP}/${id}`),
    onSuccess: invalidateList,
  })

  // Lock/unlock là command tùy biến (không khớp REST mapping của `api`) → gọi
  // thẳng invoke như cách export Excel làm. Invalidate cả list (badge/cờ) lẫn
  // detail phiên đó (nguồn snapshot cho báo cáo) để cập nhật ngay lập tức.
  const lock = useMutation({
    mutationFn: (id: number) => invoke<SalesSession>('lock_sales_session', { id }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: SESSION_LIST_KEY })
      qc.invalidateQueries({ queryKey: sessionDetailKey(id) })
    },
  })

  const unlock = useMutation({
    mutationFn: (id: number) => invoke<SalesSession>('unlock_sales_session', { id }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: SESSION_LIST_KEY })
      qc.invalidateQueries({ queryKey: sessionDetailKey(id) })
    },
  })

  return {
    sessions: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    create,
    rename,
    remove,
    lock,
    unlock,
  }
}
