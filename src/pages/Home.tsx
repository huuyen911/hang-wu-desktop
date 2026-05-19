import { SimpleGrid, Card, Text, Title, Group, Stack, Box } from '@mantine/core'
import { Link } from 'react-router-dom'
import { tools } from '@/tools/registry'

export default function Home() {
  return (
    <Stack p="xl" gap="lg">
      <div>
        <Title order={2}>Chào mừng</Title>
        <Text c="dimmed" mt={4}>Chọn một công cụ từ danh sách bên trái hoặc bên dưới.</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {tools.map((tool) => (
          <Card
            key={tool.id}
            component={Link}
            to={`/tools/${tool.id}`}
            shadow="xs"
            padding="lg"
            radius="md"
            withBorder
            style={{ textDecoration: 'none' }}
            styles={{ root: { transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 'var(--mantine-shadow-sm)' } } }}
          >
            <Group align="flex-start" gap="md">
              <Box style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--mantine-color-blue-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--mantine-color-blue-6)' }}>{tool.icon}</Box>
              <div>
                <Text fw={600} c="dark">{tool.name}</Text>
                <Text size="sm" c="dimmed" mt={2}>{tool.description}</Text>
              </div>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
