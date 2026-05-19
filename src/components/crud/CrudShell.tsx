import type { ReactNode } from 'react'
import { Box, Group, Title, Button, TextInput, Alert, Center, Loader, Text } from '@mantine/core'

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
  table,
  children,
}: Props) {
  return (
    <Box p="md" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Group justify="space-between" mb="md">
        <Title order={4}>{title}</Title>
        <Button onClick={onAdd}>{addLabel}</Button>
      </Group>

      <TextInput
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        mb="md"
        style={{ maxWidth: searchMaxWidth }}
      />

      {error != null && (
        <Alert color="red" mb="md">
          {error instanceof Error ? error.message : 'Lỗi không xác định'}
        </Alert>
      )}

      <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
