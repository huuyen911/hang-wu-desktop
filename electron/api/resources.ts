import type { CrudConfig } from './crud'
import { isNhanVien, isThuongHieu } from './validation'

export interface SanPhamBody {
  ma_san_pham?: string
  ten_san_pham?: string
  quy_cach?: unknown
  thuong_hieu?: string
  la_san_pham_chinh_weilaiya?: unknown
  la_san_pham_chinh_elvawell?: unknown
}

export const sanPhamConfig: CrudConfig<SanPhamBody> = {
  table: 'san_pham',
  listSql: 'SELECT * FROM san_pham ORDER BY thuong_hieu, ma_san_pham',
  notFoundMsg: 'Không tìm thấy sản phẩm',
  uniqueMsg: 'Mã sản phẩm đã tồn tại',
  columns: [
    'ma_san_pham',
    'ten_san_pham',
    'quy_cach',
    'thuong_hieu',
    'la_san_pham_chinh_weilaiya',
    'la_san_pham_chinh_elvawell',
  ],
  validate: (b) => {
    if (!b.ma_san_pham || !b.ten_san_pham || !b.quy_cach || !b.thuong_hieu) {
      return 'Vui lòng điền đầy đủ thông tin bắt buộc'
    }
    if (!isThuongHieu(b.thuong_hieu)) return 'Thương hiệu không hợp lệ'
    return null
  },
  toValues: (b) => [
    b.ma_san_pham,
    b.ten_san_pham,
    Number(b.quy_cach),
    b.thuong_hieu,
    b.la_san_pham_chinh_weilaiya ? 1 : 0,
    b.la_san_pham_chinh_elvawell ? 1 : 0,
  ],
}

export interface CeoBody {
  ma_ceo?: string
  ten_ceo?: string
  ceo_cap_tren_id?: unknown
  nhan_vien_cham_soc?: string
}

export const ceoConfig: CrudConfig<CeoBody> = {
  table: 'ceo',
  listSql: 'SELECT * FROM ceo ORDER BY ma_ceo',
  notFoundMsg: 'Không tìm thấy CEO',
  uniqueMsg: 'Mã CEO đã tồn tại',
  columns: ['ma_ceo', 'ten_ceo', 'ceo_cap_tren_id', 'nhan_vien_cham_soc'],
  validate: (b, id) => {
    if (!b.ma_ceo || !b.ten_ceo || !b.nhan_vien_cham_soc) {
      return 'Vui lòng điền đầy đủ thông tin bắt buộc'
    }
    if (!isNhanVien(b.nhan_vien_cham_soc)) return 'Nhân viên chăm sóc không hợp lệ'
    if (b.ceo_cap_tren_id != null && id != null && String(b.ceo_cap_tren_id) === id) {
      return 'CEO không thể là cấp trên của chính mình'
    }
    return null
  },
  toValues: (b) => [
    b.ma_ceo,
    b.ten_ceo,
    b.ceo_cap_tren_id != null ? Number(b.ceo_cap_tren_id) : null,
    b.nhan_vien_cham_soc,
  ],
}
