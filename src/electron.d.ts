// Kiểu cho cầu nối IPC mà preload expose qua contextBridge (window.api).
export {}

interface ApiResult<T = unknown> {
  status: number
  ok: boolean
  data: T
}

interface BackupSummary {
  counts: Record<string, number>
  total: number
}

type BackupResult =
  | { ok: true; canceled: true }
  | { ok: true; canceled: false; filePath?: string; summary: BackupSummary }
  | { ok: false; error: string }

declare global {
  interface Window {
    api: {
      invoke: <T = unknown>(
        method: string,
        path: string,
        body?: unknown,
      ) => Promise<ApiResult<T>>
      exportBackup: () => Promise<BackupResult>
      importBackup: () => Promise<BackupResult>
    }
  }
}
