import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  entityLabel: string;
  name?: string;
  /** Mã/định danh phụ hiển thị trong ngoặc, nếu có. */
  code?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

/** Modal xác nhận xóa dùng chung cho mọi trang master-data. */
export default function DeleteConfirmModal({
  opened,
  entityLabel,
  name,
  code,
  onClose,
  onConfirm,
  isDeleting,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Xác nhận xóa</Text>}
      size="sm"
      closeOnClickOutside={!isDeleting}
    >
      <Text size="sm" mb="md">
        Bạn có chắc muốn xóa {entityLabel}{" "}
        <Text component="span" fw={600}>
          {name}
        </Text>
        {code ? ` (${code})` : ""}?
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose} disabled={isDeleting}>
          Hủy
        </Button>
        <Button color="red" onClick={onConfirm} loading={isDeleting}>
          Xóa
        </Button>
      </Group>
    </Modal>
  );
}
