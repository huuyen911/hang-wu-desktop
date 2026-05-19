import { Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getToolById } from '@/tools/registry'

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = toolId ? getToolById(toolId) : undefined

  if (!tool) return <Navigate to="/" replace />

  const Component = tool.component

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>
      }
    >
      <Component />
    </Suspense>
  )
}
