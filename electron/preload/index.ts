import { contextBridge, ipcRenderer } from 'electron'

export interface ApiResult<T = unknown> {
  status: number
  ok: boolean
  data: T
}

export interface BackupSummary {
  counts: Record<string, number>
  total: number
}

export type BackupResult =
  | { ok: true; canceled: true }
  | { ok: true; canceled: false; filePath?: string; summary: BackupSummary }
  | { ok: false; error: string }

// Cầu nối an toàn: renderer thấy hàm invoke ngữ nghĩa REST + 2 hàm sao lưu
// (dùng native dialog ở main, không thể gọi trực tiếp từ renderer).
const api = {
  invoke: <T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> => ipcRenderer.invoke('api', { method, path, body }),

  exportBackup: (): Promise<BackupResult> => ipcRenderer.invoke('backup:export'),

  importBackup: (): Promise<BackupResult> => ipcRenderer.invoke('backup:import'),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
