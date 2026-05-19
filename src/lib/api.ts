/**
 * Lớp gọi API dùng chung. Bản desktop: thay HTTP fetch bằng IPC tới Electron
 * main (window.api.invoke). Giữ nguyên bề mặt get/post/put/del + ApiError nên
 * toàn bộ hook/trang phía trên không phải sửa.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await window.api.invoke<T | { error?: string }>(method, path, body)
  if (!res.ok) {
    const msg =
      (res.data as { error?: string } | null)?.error ?? `Lỗi máy chủ (${res.status})`
    throw new ApiError(msg, res.status)
  }
  return res.data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),

  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),

  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),

  del: <T = { success: boolean }>(path: string) => request<T>('DELETE', path),
}
