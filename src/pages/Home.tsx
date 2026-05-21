import { masterDataPages } from "@/master-data/registry";
import { tools } from "@/tools/registry";
import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconDatabase } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type CardColor = "blue" | "teal" | "orange";

interface HomeCardItem {
  id: string;
  to: string;
  name: string;
  description?: string;
  icon: ReactNode;
}

const masterDataDescriptions: Record<string, string> = {
  "san-pham": "Quản lý danh mục sản phẩm",
  "nhom-san-pham": "Quản lý nhóm sản phẩm",
  ceo: "Quản lý danh sách CEO",
};

function HomeCard({ item, color }: { item: HomeCardItem; color: CardColor }) {
  return (
    <Card
      component={Link}
      to={item.to}
      padding="lg"
      radius="md"
      withBorder
      className="hwu-tool-card"
      data-color={color}
      style={{ textDecoration: "none" }}
    >
      <Group align="flex-start" gap="md" wrap="nowrap">
        <ThemeIcon
          size={44}
          radius="md"
          variant="light"
          color={color}
          className="hwu-tool-card__icon"
          style={{ flexShrink: 0 }}
        >
          {item.icon}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="center" gap={4} wrap="nowrap">
            <Text fw={600} c="dark" size="sm" style={{ lineHeight: 1.3 }}>
              {item.name}
            </Text>
            <IconArrowRight size={16} className="hwu-tool-card__arrow" />
          </Group>
          {item.description && (
            <Text size="xs" c="dimmed" mt={6} style={{ lineHeight: 1.5 }}>
              {item.description}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
}

function HomeSection({
  label,
  items,
  color,
}: {
  label: string;
  items: HomeCardItem[];
  color: CardColor;
}) {
  return (
    <div>
      <Text
        size="xs"
        fw={700}
        c="dimmed"
        mb="sm"
        style={{ textTransform: "uppercase", letterSpacing: "0.8px" }}
      >
        {label}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {items.map((item) => (
          <HomeCard key={item.id} item={item} color={color} />
        ))}
      </SimpleGrid>
    </div>
  );
}

export default function Home() {
  const toolItems: HomeCardItem[] = tools.map((tool) => ({
    id: tool.id,
    to: `/tools/${tool.id}`,
    name: tool.name,
    description: tool.description,
    icon: tool.icon,
  }));

  const masterDataItems: HomeCardItem[] = masterDataPages.map((page) => ({
    id: page.id,
    to: `/master-data/${page.id}`,
    name: page.name,
    description: masterDataDescriptions[page.id],
    icon: page.icon,
  }));

  const systemItems: HomeCardItem[] = [
    {
      id: "backup",
      to: "/system/backup",
      name: "Sao lưu & Phục hồi",
      description: "Sao lưu và phục hồi dữ liệu",
      icon: <IconDatabase size={20} />,
    },
  ];

  return (
    <Stack p="xl" gap="xl" maw={1200}>
      <style>{`
        .hwu-tool-card {
          transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease;
          position: relative;
        }
        .hwu-tool-card:hover {
          box-shadow: var(--mantine-shadow-md);
          transform: translateY(-2px);
        }
        .hwu-tool-card:hover .hwu-tool-card__arrow { transform: translateX(2px); opacity: 1; }
        .hwu-tool-card:focus-visible { outline: 2px solid var(--mantine-color-blue-5); outline-offset: 2px; }
        .hwu-tool-card__arrow {
          transition: transform .18s ease, opacity .18s ease;
          opacity: 0;
        }
        .hwu-tool-card__icon { transition: background .18s ease; }
        .hwu-tool-card[data-color="blue"]:hover { border-color: var(--mantine-color-blue-3); }
        .hwu-tool-card[data-color="blue"]:hover .hwu-tool-card__icon { background: var(--mantine-color-blue-1); }
        .hwu-tool-card[data-color="blue"] .hwu-tool-card__arrow { color: var(--mantine-color-blue-6); }
        .hwu-tool-card[data-color="teal"]:hover { border-color: var(--mantine-color-teal-3); }
        .hwu-tool-card[data-color="teal"]:hover .hwu-tool-card__icon { background: var(--mantine-color-teal-1); }
        .hwu-tool-card[data-color="teal"] .hwu-tool-card__arrow { color: var(--mantine-color-teal-6); }
        .hwu-tool-card[data-color="orange"]:hover { border-color: var(--mantine-color-orange-3); }
        .hwu-tool-card[data-color="orange"]:hover .hwu-tool-card__icon { background: var(--mantine-color-orange-1); }
        .hwu-tool-card[data-color="orange"] .hwu-tool-card__arrow { color: var(--mantine-color-orange-6); }
      `}</style>

      <div>
        <Title order={2} style={{ letterSpacing: "-0.4px" }}>
          Chào mừng
        </Title>
        <Text c="dimmed" mt={6} size="sm">
          Chọn một mục từ danh sách bên trái hoặc bên dưới.
        </Text>
      </div>

      <HomeSection label="Công cụ" items={toolItems} color="blue" />
      <HomeSection label="Dữ liệu" items={masterDataItems} color="teal" />
      <HomeSection label="Hệ thống" items={systemItems} color="orange" />
    </Stack>
  );
}
