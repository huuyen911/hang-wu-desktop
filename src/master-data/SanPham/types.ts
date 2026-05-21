export type ThuongHieu = 'Weilaiya' | 'Elvawell'

export interface SanPham {
  id: number
  ma_san_pham: string
  ten_san_pham: string
  quy_cach: number
  thuong_hieu: ThuongHieu
  la_san_pham_chinh_weilaiya: boolean
  la_san_pham_chinh_elvawell: boolean
  thuong_ceo?: number | null
  thuong_cap_tren?: number | null
  created_at: string
  updated_at: string
}

export interface SanPhamFormValues {
  ma_san_pham: string
  ten_san_pham: string
  quy_cach: number | ''
  thuong_hieu: ThuongHieu | ''
  la_san_pham_chinh_weilaiya: boolean
  la_san_pham_chinh_elvawell: boolean
  thuong_ceo: number | ''
  thuong_cap_tren: number | ''
}
