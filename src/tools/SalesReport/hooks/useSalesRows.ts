import { useCallback, useEffect, useSyncExternalStore } from 'react'
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
// Hàng đợi nối tiếp (chain) để PUT cũ-mới không bao giờ chạy chồng nhau và sai
// thứ tự — nếu user edit lại khi 1 PUT đang chạy, payload mới được xếp sau và
// gửi đi ngay khi PUT trước hoàn tất.
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSnapshot: { qc: QueryClient; id: number; rows: SalesRow[] } | null = null
let inFlight: Promise<void> = Promise.resolve()

function runSave(qc: QueryClient, id: number, rows: SalesRow[]): Promise<void> {
  return api
    .put(`${EP}/${id}`, { rows })
    .then(() => {
      qc.invalidateQueries({ queryKey: SESSION_LIST_KEY })
    })
    .catch((e) => {
      notifications.show({
        title: 'Lưu phiên thất bại',
        message: e instanceof Error ? e.message : 'Lỗi không xác định',
        color: 'red',
      })
    })
}

/** Gửi snapshot đang chờ ngay lập tức, bỏ qua phần còn lại của debounce. */
export function flushSavePending(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!pendingSnapshot) return inFlight
  const snap = pendingSnapshot
  pendingSnapshot = null
  inFlight = inFlight.catch(() => undefined).then(() => runSave(snap.qc, snap.id, snap.rows))
  return inFlight
}

function scheduleSave(qc: QueryClient, id: number, rows: SalesRow[]) {
  pendingSnapshot = { qc, id, rows }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void flushSavePending()
  }, 500)
}

// Khi cửa sổ đóng: Tauri cho phép chặn close để await PUT cuối. Đăng ký 1 lần
// ở module-level, không phụ thuộc vòng đời React.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    void flushSavePending()
  })
  void (async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      await win.onCloseRequested(async (e) => {
        if (!pendingSnapshot && !saveTimer) return
        e.preventDefault()
        try {
          await flushSavePending()
        } finally {
          await win.destroy()
        }
      })
    } catch {
      // chạy ngoài Tauri (vite preview thuần) — bỏ qua
    }
  })()
}

export function useSalesRows() {
  const qc = useQueryClient()

  const activeId = useSyncExternalStore(subscribeActiveId, () => activeIdStore)

  // Khi chưa có phiên đang mở, dùng key dạng [..., null] thay vì giả id=-1 để
  // tránh tạo cache entry rác. Query luôn `enabled: activeId != null`.
  const { data: session = null, isLoading } = useQuery<SalesSession | null>({
    queryKey: activeId != null ? sessionDetailKey(activeId) : (['sales-sessions', 'detail', null] as const),
    queryFn: () => api.get<SalesSession>(`${EP}/${activeId}`),
    enabled: activeId != null,
  })

  // Flush autosave khi hook unmount (rời màn) hoặc cửa sổ đóng. Tauri close
  // không await được Promise nhưng listener kích hoạt PUT ngay, gần như luôn
  // kịp hoàn tất trước khi process exit. Đăng ký 1 lần ở module-level.
  useEffect(() => {
    return () => {
      void flushSavePending()
    }
  }, [])

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
