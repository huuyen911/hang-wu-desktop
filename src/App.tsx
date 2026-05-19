// Bản desktop tải qua file:// → dùng hash router thay vì browser router.
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import ToolPage from '@/pages/ToolPage'
import MasterDataPage from '@/pages/MasterDataPage'
import BackupPage from '@/pages/BackupPage'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tools/:toolId', element: <ToolPage /> },
      { path: 'master-data/:pageId', element: <MasterDataPage /> },
      { path: 'system/backup', element: <BackupPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
