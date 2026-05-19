/** Định dạng số / tiền tệ dùng chung trong báo cáo bán hàng. */

const nf = new Intl.NumberFormat('vi-VN')
const cf = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export const fmt = nf
export const fmtQty = (n: number) => nf.format(n)
export const fmtAmount = (n: number) => cf.format(n)

/** Làm tròn 2 chữ số thập phân (dùng cho số lượng thùng). */
export const round2 = (n: number) => Math.round(n * 100) / 100
