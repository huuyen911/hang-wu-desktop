import { AppShell } from '@mantine/core'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <AppShell navbar={{ width: 240, breakpoint: 'sm' }} padding={0}>
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
