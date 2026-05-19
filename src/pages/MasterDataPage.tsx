import { Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getMasterDataById } from '@/master-data/registry'
import { Center, Loader } from '@mantine/core'

export default function MasterDataPage() {
  const { pageId } = useParams<{ pageId: string }>()
  const page = pageId ? getMasterDataById(pageId) : undefined

  if (!page) return <Navigate to="/" replace />

  const Component = page.component

  return (
    <Suspense fallback={<Center h={200}><Loader /></Center>}>
      <Component />
    </Suspense>
  )
}
