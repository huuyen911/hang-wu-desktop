import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { RESOURCES } from '@/lib/queryKeys'
import type { SanPham } from '@/master-data/SanPham/types'
import type { CEO } from '@/master-data/CEO/types'
import type { NhomSanPham } from '@/master-data/NhomSanPham/types'

/**
 * Tải master data (sản phẩm, CEO, nhóm sản phẩm) qua React Query — dùng chung
 * cache với các trang master-data, thay cho 3 lời gọi fetch + useEffect thủ
 * công trước đây (gây request trùng, không cache). Trả về sẵn các map dẫn xuất
 * đã memo hóa để các bảng báo cáo dùng trực tiếp.
 */
export function useReportMasterData() {
  const { data: sanPhamList = [] } = useQuery({
    queryKey: RESOURCES.sanPham.key,
    queryFn: () => api.get<SanPham[]>(RESOURCES.sanPham.endpoint),
  })
  const { data: masterCEOs = [] } = useQuery({
    queryKey: RESOURCES.ceo.key,
    queryFn: () => api.get<CEO[]>(RESOURCES.ceo.endpoint),
  })
  const { data: nhomSanPhamList = [] } = useQuery({
    queryKey: RESOURCES.nhomSanPham.key,
    queryFn: () => api.get<NhomSanPham[]>(RESOURCES.nhomSanPham.endpoint),
  })

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
      if (sp.la_san_pham_chinh_elvawell) set.add(`${sp.ma_san_pham}|Elvawell`)
      if (sp.la_san_pham_chinh_weilaiya) set.add(`${sp.ma_san_pham}|Weilaiya`)
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
