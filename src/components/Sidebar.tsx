import { NavLink, Stack, Title, Box, Text } from '@mantine/core'
import { NavLink as RouterNavLink } from 'react-router-dom'
import { IconDatabase } from '@tabler/icons-react'
import { tools } from '@/tools/registry'
import { masterDataPages } from '@/master-data/registry'

function SectionLabel({ children }: { children: string }) {
  return (
    <Text size="xs" fw={600} c="dark.3" px="xs" pt="sm" pb={2} style={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>
      {children}
    </Text>
  )
}

export default function Sidebar() {
  return (
    <Box h="100%" style={{ background: 'var(--mantine-color-dark-8)', display: 'flex', flexDirection: 'column' }}>
      <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-6)' }}>
        <Title order={5} c="white" style={{ letterSpacing: '-0.3px', textAlign: 'center' }}>
          Hằng Wonder Union
        </Title>
      </Box>

      <Stack gap={0} p="xs" flex={1}>
        <SectionLabel>Công cụ</SectionLabel>
        {tools.map((tool) => (
          <RouterNavLink key={tool.id} to={`/tools/${tool.id}`} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <NavLink
                label={tool.name}
                leftSection={tool.icon}
                active={isActive}
                variant="filled"
                style={{ borderRadius: 8 }}
                styles={{
                  root: { color: isActive ? 'white' : 'var(--mantine-color-dark-1)' },
                  label: { fontSize: 14 },
                }}
              />
            )}
          </RouterNavLink>
        ))}

        <SectionLabel>Dữ liệu</SectionLabel>
        {masterDataPages.map((page) => (
          <RouterNavLink key={page.id} to={`/master-data/${page.id}`} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <NavLink
                label={page.name}
                leftSection={page.icon}
                active={isActive}
                variant="filled"
                style={{ borderRadius: 8 }}
                styles={{
                  root: { color: isActive ? 'white' : 'var(--mantine-color-dark-1)' },
                  label: { fontSize: 14 },
                }}
              />
            )}
          </RouterNavLink>
        ))}

        <SectionLabel>Hệ thống</SectionLabel>
        <RouterNavLink to="/system/backup" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <NavLink
              label="Sao lưu & Phục hồi"
              leftSection={<IconDatabase size={20} />}
              active={isActive}
              variant="filled"
              style={{ borderRadius: 8 }}
              styles={{
                root: { color: isActive ? 'white' : 'var(--mantine-color-dark-1)' },
                label: { fontSize: 14 },
              }}
            />
          )}
        </RouterNavLink>
      </Stack>
    </Box>
  )
}
