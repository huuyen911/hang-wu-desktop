/**
 * Lỗi mang theo HTTP-style status để router map về phản hồi cho renderer,
 * giữ đúng hành vi cũ của backend Hono (400/404/409/500).
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
