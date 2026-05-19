import { invoke } from '@tauri-apps/api/core'

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
  // path format: /api/resource  or  /api/resource/id
  const parts = path.replace(/^\/api\//, '').split('/')
  const resource = parts[0].replace(/-/g, '_') // "nhom-san-pham" → "nhom_san_pham"
  const id = parts[1] ? parseInt(parts[1], 10) : undefined

  let command: string
  const args: Record<string, unknown> = {}

  if (method === 'GET' && id === undefined) {
    command = `list_${resource}`
  } else if (method === 'GET' && id !== undefined) {
    command = `get_${resource}`
    args.id = id
  } else if (method === 'POST') {
    command = `create_${resource}`
    args.data = body
  } else if (method === 'PUT') {
    command = `update_${resource}`
    args.id = id
    args.data = body
  } else if (method === 'DELETE') {
    command = `delete_${resource}`
    args.id = id
  } else {
    throw new ApiError(`Unknown route: ${method} ${path}`, 400)
  }

  try {
    return await invoke<T>(command, args)
  } catch (err) {
    const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
    throw new ApiError(msg, 500)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}
