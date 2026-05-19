import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { IconReportAnalytics } from '@tabler/icons-react'

export interface ToolMeta {
  id: string
  name: string
  description: string
  icon: ReactNode
  component: LazyExoticComponent<ComponentType>
}

export const tools: ToolMeta[] = [
  {
    id: 'sales-report',
    name: 'Hàng bán theo khách',
    description: 'Tổng hợp dữ liệu từ file báo cáo bán hàng theo khách hàng',
    icon: <IconReportAnalytics size={20} />,
    component: lazy(() => import('./SalesReport')),
  },
]

export function getToolById(id: string): ToolMeta | undefined {
  return tools.find((t) => t.id === id)
}
