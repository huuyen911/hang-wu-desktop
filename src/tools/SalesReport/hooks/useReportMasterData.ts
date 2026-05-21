import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { RESOURCES } from '@/lib/queryKeys'
import { THUONG_HIEU_VALUES, isProductMainForBrand } from '@/domain/constants'
import type { SanPham } from '@/master-data/SanPham/types'
import type { CEO } from '@/master-data/CEO/types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'
import type { MasterSnapshot } from '../types'

/**
 * Tải master data (sản phẩm, CEO, nhóm sản phẩm) qua React Query — dùng chung
 * cache với các trang master-data, thay cho 3 lời gọi fetch + useEffect thủ
 * công trước đây (gây request trùng, không cache). Trả về sẵn các map dẫn xuất
 * đã memo hóa để các bảng báo cáo dùng trực tiếp.
 *
 * Khi truyền `snapshot` (phiên đã chốt): đọc master từ snapshot, KHÔNG fetch
 * live → số liệu cố định tại mốc chốt. Khi `snapshot` null/undefined: chế độ
 * động, fetch live như cũ.
 */
export function useReportMasterData(snapshot?: MasterSnapshot | null) {
  // Có snapshot → frozen; không có → live. Tắt query live khi đã frozen để
  // tránh fetch thừa.
  const live = !snapshot
  const { data: liveSanPham = [] } = useQuery({
    queryKey: RESOURCES.sanPham.key,
    queryFn: () => api.get<SanPham[]>(RESOURCES.sanPham.endpoint),
    enabled: live,
  })
  const { data: liveCEO = [] } = useQuery({
    queryKey: RESOURCES.ceo.key,
    queryFn: () => api.get<CEO[]>(RESOURCES.ceo.endpoint),
    enabled: live,
  })
  const { data: liveNhom = [] } = useQuery({
    queryKey: RESOURCES.nhomSanPham.key,
    queryFn: () => api.get<NhomSanPham[]>(RESOURCES.nhomSanPham.endpoint),
    enabled: live,
  })

  // ⚠️ Phòng thủ `?? []`: snapshot tạo từ bản app cũ hoặc thiếu field → không
  // crash, không vỡ báo cáo.
  const sanPhamList = snapshot ? (snapshot.san_pham ?? []) : liveSanPham
  const masterCEOs = snapshot ? (snapshot.ceo ?? []) : liveCEO
  const nhomSanPhamList = snapshot ? (snapshot.nhom_san_pham ?? []) : liveNhom

  const quyCachMap = useMemo(() => {
    const map = new Map<string, number>()
    sanPhamList.forEach((sp) => map.set(`${sp.ma_san_pham}|${sp.thuong_hieu}`, sp.quy_cach))
    return map
  }, [sanPhamList])

  // Set chứa "maSanPham|<thương hiệu>" cho từng thương hiệu mà SP là sản phẩm
  // chính. Một SP có thể là chính ở Elvawell nhưng phụ ở Weilaiya (độc lập với
  // thuong_hieu gốc của SP) — báo cáo tra theo thương hiệu của tab đang xem.
  const sanPhamChinhSet = useMemo(() => {
    const set = new Set<string>()
    sanPhamList.forEach((sp) => {
      THUONG_HIEU_VALUES.forEach((brand) => {
        if (isProductMainForBrand(sp, brand)) set.add(`${sp.ma_san_pham}|${brand}`)
      })
    })
    return set
  }, [sanPhamList])

  const masterCEOCodeSet = useMemo(
    () => new Set(masterCEOs.map((c) => c.ma_ceo)),
    [masterCEOs],
  )

  const nhomSanPhamByBrand = useMemo(() => {
    const map = new Map<string, NhomSanPham[]>()
    nhomSanPhamList.forEach((nhom) => {
      if (!map.has(nhom.thuong_hieu)) map.set(nhom.thuong_hieu, [])
      map.get(nhom.thuong_hieu)!.push(nhom)
    })
    return map
  }, [nhomSanPhamList])

  // Map mã sản phẩm → id nhóm (gom thùng theo nhóm trong MatrixTable).
  const productToGroupIdMap = useMemo(() => {
    const sanPhamById = new Map(sanPhamList.map((sp) => [sp.id, sp]))
    const map = new Map<string, number>()
    nhomSanPhamList.forEach((nhom) => {
      nhom.san_pham_ids.forEach((spId) => {
        const sp = sanPhamById.get(spId)
        if (sp) map.set(sp.ma_san_pham, nhom.id)
      })
    })
    return map
  }, [sanPhamList, nhomSanPhamList])

  const productBrandMap = useMemo(() => {
    const map = new Map<string, string>()
    sanPhamList.forEach((sp) => map.set(sp.ma_san_pham, sp.thuong_hieu))
    return map
  }, [sanPhamList])

  return {
    sanPhamList,
    masterCEOs,
    masterCEOCodeSet,
    nhomSanPhamList,
    nhomSanPhamByBrand,
    quyCachMap,
    sanPhamChinhSet,
    productToGroupIdMap,
    productBrandMap,
  }
}
