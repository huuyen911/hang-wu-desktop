import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";

interface Props {
  opened: boolean;
  defaultName: string;
  fileName: string;
  rowCount: number;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (ten: string) => void;
}

/** Hỏi tên phiên trước khi lưu một lần import vào lịch sử. */
export default function ImportNameModal({
  opened,
  defaultName,
  fileName,
  rowCount,
  isSaving,
  onClose,
  onConfirm,
}: Props) {
  const [ten, setTen] = useState(defaultName);

  // Mỗi lần mở modal cho file mới → gợi ý lại tên mặc định.
  useEffect(() => {
    if (opened) setTen(defaultName);
  }, [opened, defaultName]);

  const trimmed = ten.trim();

  function submit() {
    if (trimmed && !isSaving) onConfirm(trimmed);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Lưu phiên import</Text>}
      size="md"
      closeOnClickOutside={!isSaving}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          File{" "}
          <Text component="span" fw={600}>
            {fileName}
          </Text>{" "}
          — {rowCount} dòng hợp lệ. Đặt tên để xem lại trong lịch sử.
        </Text>
        <TextInput
          label="Tên phiên"
          placeholder="VD: Báo cáo tháng 4/2026"
          value={ten}
          onChange={(e) => setTen(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          data-autofocus
          required
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={submit} loading={isSaving} disabled={!trimmed}>
            Lưu & mở
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
