import type { ReactNode } from 'react'
import {
  Box,
  Group,
  Title,
  Button,
  TextInput,
  Alert,
  Center,
  Loader,
  Text,
  ActionIcon,
} from '@mantine/core'
import { IconPlus, IconSearch, IconX } from '@tabler/icons-react'

interface Props {
  title: string
  addLabel: string
  onAdd: () => void
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder: string
  searchMaxWidth?: number
  error?: unknown
  isLoading: boolean
  isEmpty: boolean
  emptyText: string
  /** Tổng số bản ghi (chưa lọc). Khi truyền cùng filteredCount sẽ hiển thị "X/Y". */
  totalCount?: number
  filteredCount?: number
  /** Bảng dữ liệu — chỉ render khi không loading và có dữ liệu. */
  table: ReactNode
  /** Modal tạo/sửa, xác nhận xóa... — luôn render (kể cả khi danh sách rỗng). */
  children?: ReactNode
}

/**
 * Khung dùng chung cho mọi trang master-data: tiêu đề + nút thêm, ô tìm kiếm,
 * cảnh báo lỗi, và vùng nội dung tự xử lý trạng thái loading / rỗng.
 */
export default function CrudShell({
  title,
  addLabel,
  onAdd,
  search,
  onSearchChange,
  searchPlaceholder,
  searchMaxWidth = 360,
  error,
  isLoading,
  isEmpty,
  emptyText,
  totalCount,
  filteredCount,
  table,
  children,
}: Props) {
  // Tách dấu "+" thừa nếu có để dùng IconPlus.
  const cleanLabel = addLabel.replace(/^\s*\+\s*/, '')
  const showCount = totalCount != null
  const isFiltered = !!search.trim()

  return (
    <Box p="md" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .hwu-crud-table tbody td { vertical-align: middle; }
      `}</style>
      <Group justify="space-between" mb="md" align="flex-end">
        <Box>
          <Title order={4} style={{ letterSpacing: '-0.2px' }}>{title}</Title>
        </Box>
        <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
          {cleanLabel}
        </Button>
      </Group>

      <Group gap="sm" mb="md" wrap="nowrap" align="center">
        <TextInput
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          rightSection={
            search ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => onSearchChange('')}
                aria-label="Xoá tìm kiếm"
              >
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          style={{ flex: 1, maxWidth: searchMaxWidth }}
        />
        {showCount && (
          <Text size="sm" c="dimmed">
            <Text span fw={600} c="dark">{filteredCount ?? totalCount}</Text>
            {isFiltered && filteredCount !== totalCount ? `/${totalCount}` : ''} bản ghi
          </Text>
        )}
      </Group>

      {error != null && (
        <Alert color="red" mb="md">
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </Alert>
      )}

      <Box className="hwu-crud-table" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : isEmpty ? (
          <Center h={200}>
            <Text c="dimmed">{emptyText}</Text>
          </Center>
        ) : (
          table
        )}
      </Box>

      {children}
    </Box>
  )
}
