import { useCallback, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { api } from '@/lib/api'
import { RESOURCES } from '@/lib/queryKeys'
import type { SalesRow, SalesSession } from '../types'
import { SESSION_LIST_KEY, sessionDetailKey } from './useSalesSessions'

/**
 * Bản desktop: dữ liệu màn báo cáo KHÔNG còn nằm ở localStorage mà là một
 * "phiên" trong DB. Hook này quản lý phiên đang mở: tải dòng từ DB, chỉnh sửa
 * local rồi tự lưu (autosave) ngược lại phiên. Giữ nguyên bề mặt cũ
 * (data/rows/addRow/updateRow/deleteRow/reset) để DataView & SalesRowsTable
 * không phải sửa.
 */
export interface SalesData {
  fileName: string
  rows: SalesRow[]
}

const EP = RESOURCES.salesSession.endpoint

// Phiên đang mở: state in-memory dùng chung giữa các consumer của hook.
// KHÔNG lưu đâu cả → mở lại app luôn về màn lịch sử (user tự chọn phiên).
let activeIdStore: number | null = null
const activeIdListeners = new Set<() => void>()

function setActiveIdStore(id: number | null) {
  activeIdStore = id
  activeIdListeners.forEach((l) => l())
}

function subscribeActiveId(l: () => void): () => void {
  activeIdListeners.add(l)
  return () => {
    activeIdListeners.delete(l)
  }
}

// Autosave gộp nhiều thao tác liên tiếp thành 1 lần ghi DB.
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave(qc: QueryClient, id: number, rows: SalesRow[]) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    api
      .put(`${EP}/${id}`, { rows })
      .then(() => qc.invalidateQueries({ queryKey: SESSION_LIST_KEY }))
      .catch((e) =>
        notifications.show({
          title: 'Lưu phiên thất bại',
          message: e instanceof Error ? e.message : 'Lỗi không xác định',
          color: 'red',
        }),
      )
  }, 500)
}

export function useSalesRows() {
  const qc = useQueryClient()

  const activeId = useSyncExternalStore(subscribeActiveId, () => activeIdStore)

  const { data: session = null, isLoading } = useQuery<SalesSession | null>({
    queryKey: sessionDetailKey(activeId ?? -1),
    queryFn: () =>
      activeId != null ? api.get<SalesSession>(`${EP}/${activeId}`) : null,
    enabled: activeId != null,
    staleTime: Infinity,
  })

  const setActiveId = useCallback((id: number | null) => setActiveIdStore(id), [])

  // Cập nhật optimistic vào cache phiên rồi hẹn autosave xuống DB.
  const mutateRows = useCallback(
    (updater: (rows: SalesRow[]) => SalesRow[]) => {
      if (activeId == null) return
      const key = sessionDetailKey(activeId)
      const prev = qc.getQueryData<SalesSession>(key)
      if (!prev) return
      const nextRows = updater(prev.rows)
      qc.setQueryData<SalesSession>(key, {
        ...prev,
        rows: nextRows,
        row_count: nextRows.length,
      })
      scheduleSave(qc, activeId, nextRows)
    },
    [qc, activeId],
  )

  const addRow = useCallback(
    (row: SalesRow) => mutateRows((rows) => [row, ...rows]),
    [mutateRows],
  )

  const updateRow = useCallback(
    (id: string, patch: Partial<Omit<SalesRow, 'id'>>) =>
      mutateRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [mutateRows],
  )

  const deleteRow = useCallback(
    (id: string) => mutateRows((rows) => rows.filter((r) => r.id !== id)),
    [mutateRows],
  )

  /** Mở một phiên đã lưu. */
  const open = useCallback((id: number) => setActiveId(id), [setActiveId])

  /** Rời phiên đang xem (KHÔNG xoá phiên) — quay về màn chọn/lịch sử. */
  const reset = useCallback(() => setActiveId(null), [setActiveId])

  const data: SalesData | null = session
    ? { fileName: session.ten, rows: session.rows }
    : null

  return {
    activeSessionId: activeId,
    data,
    rows: session?.rows ?? null,
    fileName: session?.ten ?? null,
    isLoading,
    addRow,
    updateRow,
    deleteRow,
    open,
    reset,
  }
}
