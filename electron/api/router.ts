import { HttpError } from './errors'
import { createRow, deleteRow, listRows, updateRow } from './crud'
import { ceoConfig, sanPhamConfig } from './resources'
import { createNhom, deleteNhom, listNhom, updateNhom } from './nhomSanPham'
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from './salesSession'

export interface ApiResult {
  status: number
  ok: boolean
  data: unknown
}

const ok = (data: unknown, status = 200): ApiResult => ({ status, ok: true, data })

// Map (method, path) → handler. Tự viết tay, thay cho router của Hono.
// path dạng '/api/<resource>' hoặc '/api/<resource>/<id>'.
function dispatch(method: string, path: string, body: unknown): ApiResult {
  const segments = path.replace(/^\/+/, '').split('/') // ['api','san-pham','12']
  if (segments[0] !== 'api') throw new HttpError(404, 'Not found')
  const resource = segments[1]
  const id = segments[2]

  switch (resource) {
    case 'san-pham':
      if (method === 'GET' && !id) return ok(listRows(sanPhamConfig))
      if (method === 'POST' && !id) return ok(createRow(sanPhamConfig, body as never), 201)
      if (method === 'PUT' && id) return ok(updateRow(sanPhamConfig, id, body as never))
      if (method === 'DELETE' && id) return ok(deleteRow(sanPhamConfig, id))
      break

    case 'ceo':
      if (method === 'GET' && !id) return ok(listRows(ceoConfig))
      if (method === 'POST' && !id) return ok(createRow(ceoConfig, body as never), 201)
      if (method === 'PUT' && id) return ok(updateRow(ceoConfig, id, body as never))
      if (method === 'DELETE' && id) return ok(deleteRow(ceoConfig, id))
      break

    case 'nhom-san-pham':
      if (method === 'GET' && !id) return ok(listNhom())
      if (method === 'POST' && !id) return ok(createNhom(body as never), 201)
      if (method === 'PUT' && id) return ok(updateNhom(id, body as never))
      if (method === 'DELETE' && id) return ok(deleteNhom(id))
      break

    case 'sales-session':
      if (method === 'GET' && !id) return ok(listSessions())
      if (method === 'GET' && id) return ok(getSession(id))
      if (method === 'POST' && !id) return ok(createSession(body as never), 201)
      if (method === 'PUT' && id) return ok(updateSession(id, body as never))
      if (method === 'DELETE' && id) return ok(deleteSession(id))
      break
  }

  throw new HttpError(404, 'Not found')
}

/** Entry point cho IPC: luôn trả ApiResult, không bao giờ throw qua IPC. */
export function handleApi(method: string, path: string, body: unknown): ApiResult {
  try {
    return dispatch(method.toUpperCase(), path, body)
  } catch (e) {
    if (e instanceof HttpError) {
      return { status: e.status, ok: false, data: { error: e.message } }
    }
    const message = e instanceof Error ? e.message : 'Lỗi không xác định'
    return { status: 500, ok: false, data: { error: message } }
  }
}
