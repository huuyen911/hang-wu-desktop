import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { IconPackage, IconUserStar, IconLayersSubtract } from '@tabler/icons-react'

export interface MasterDataMeta {
  id: string
  name: string
  icon: ReactNode
  component: LazyExoticComponent<ComponentType>
}

export const masterDataPages: MasterDataMeta[] = [
  {
    id: 'san-pham',
    name: 'Sản phẩm',
    icon: <IconPackage size={20} />,
    component: lazy(() => import('./SanPham')),
  },
  {
    id: 'nhom-san-pham',
    name: 'Nhóm sản phẩm',
    icon: <IconLayersSubtract size={20} />,
    component: lazy(() => import('./NhomSanPham')),
  },
  {
    id: 'ceo',
    name: 'CEO',
    icon: <IconUserStar size={20} />,
    component: lazy(() => import('./CEO')),
  },
]

export function getMasterDataById(id: string): MasterDataMeta | undefined {
  return masterDataPages.find((p) => p.id === id)
}
