import { NavLink, Stack, Title, Box, Text } from '@mantine/core'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import { IconDatabase, IconHome } from '@tabler/icons-react'
import { tools } from '@/tools/registry'
import { masterDataPages } from '@/master-data/registry'
import UpdateButton from '@/components/UpdateButton'

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      size="xs"
      fw={600}
      c="dark.3"
      px="sm"
      pt="md"
      pb={6}
      style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
    >
      {children}
    </Text>
  )
}

interface SideNavLinkProps {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

function SideNavLink({ to, label, icon, end }: SideNavLinkProps) {
  const location = useLocation()
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <NavLink
      component={RouterNavLink}
      to={to}
      end={end}
      label={label}
      leftSection={icon}
      active={isActive}
      aria-current={isActive ? 'page' : undefined}
      classNames={{ root: 'hwu-sidenav' }}
      styles={{
        root: {
          borderRadius: 8,
          padding: '8px 12px',
          color: isActive ? 'white' : 'var(--mantine-color-dark-1)',
          background: isActive ? 'var(--mantine-color-blue-6)' : 'transparent',
          boxShadow: isActive ? '0 1px 2px rgba(0,0,0,.25)' : 'none',
        },
        label: { fontSize: 14, fontWeight: isActive ? 600 : 500 },
        section: { color: isActive ? 'white' : 'var(--mantine-color-dark-2)' },
      }}
    />
  )
}

export default function Sidebar() {
  return (
    <Box
      h="100%"
      style={{
        background: 'var(--mantine-color-dark-8)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .hwu-sidenav { transition: background .12s ease, color .12s ease; }
        .hwu-sidenav:hover:not([data-active]) { background: var(--mantine-color-dark-6) !important; color: white !important; }
        .hwu-sidenav:hover:not([data-active]) .mantine-NavLink-section { color: white !important; }
      `}</style>
      <Box
        px="md"
        py="md"
        style={{ borderBottom: '1px solid var(--mantine-color-dark-6)' }}
      >
        <Title
          order={5}
          c="white"
          style={{ letterSpacing: '-0.3px', textAlign: 'center', lineHeight: 1.2 }}
        >
          Hằng Wonder Union
        </Title>
      </Box>

      <Stack gap={2} p="xs" flex={1} style={{ overflowY: 'auto', minHeight: 0 }}>
        <SideNavLink to="/" end label="Trang chủ" icon={<IconHome size={18} />} />

        <SectionLabel>Công cụ</SectionLabel>
        {tools.map((tool) => (
          <SideNavLink
            key={tool.id}
            to={`/tools/${tool.id}`}
            label={tool.name}
            icon={tool.icon}
          />
        ))}

        <SectionLabel>Dữ liệu</SectionLabel>
        {masterDataPages.map((page) => (
          <SideNavLink
            key={page.id}
            to={`/master-data/${page.id}`}
            label={page.name}
            icon={page.icon}
          />
        ))}

        <SectionLabel>Hệ thống</SectionLabel>
        <SideNavLink
          to="/system/backup"
          label="Sao lưu & Phục hồi"
          icon={<IconDatabase size={18} />}
        />
      </Stack>

      <Box
        px="sm"
        py={10}
        style={{ borderTop: '1px solid var(--mantine-color-dark-6)' }}
      >
        <Stack gap={6}>
          <UpdateButton />
          <Text size="xs" c="dark.3" ta="center" style={{ letterSpacing: '0.3px' }}>
            v{__APP_VERSION__}
          </Text>
        </Stack>
      </Box>
    </Box>
  )
}
