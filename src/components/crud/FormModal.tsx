import type { ReactNode } from 'react'
import { Modal, Stack, Group, Button, Text } from '@mantine/core'

interface Props {
  opened: boolean
  isEdit: boolean
  entityLabel: string
  onClose: () => void
  onSubmit: () => void
  isSaving: boolean
  children: ReactNode
}

/** Modal tạo/sửa dùng chung — phần trường nhập liệu do từng trang truyền vào. */
export default function FormModal({
  opened,
  isEdit,
  entityLabel,
  onClose,
  onSubmit,
  isSaving,
  children,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{isEdit ? `Chỉnh sửa ${entityLabel}` : `Thêm ${entityLabel} mới`}</Text>}
      size="md"
      closeOnClickOutside={!isSaving}
    >
      <Stack gap="sm">
        {children}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={onSubmit} loading={isSaving}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
