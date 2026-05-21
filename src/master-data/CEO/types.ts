export type NhanVienChamSoc = "Hằng" | "Hiền";

export interface CEO {
  id: number;
  ma_ceo: string;
  ten_ceo: string;
  ceo_cap_tren_id: number | null;
  nhan_vien_cham_soc: NhanVienChamSoc;
  created_at: string;
  updated_at: string;
}

export interface CEOFormValues {
  ma_ceo: string;
  ten_ceo: string;
  ceo_cap_tren_id: string | null;
  nhan_vien_cham_soc: NhanVienChamSoc | "";
}
