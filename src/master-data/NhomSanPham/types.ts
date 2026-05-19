import type { ThuongHieu } from '../SanPham/types'

export type { ThuongHieu }

export interface NhomSanPham {
  id: number
  ten_nhom: string
  thuong_hieu: ThuongHieu
  san_pham_ids: number[]
  created_at: string
  updated_at: string
}

export interface NhomSanPhamFormValues {
  ten_nhom: string
  thuong_hieu: ThuongHieu | ''
  san_pham_ids: string[]
}
