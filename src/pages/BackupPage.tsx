import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  List,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconDatabase,
  IconDownload,
  IconUpload,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

interface RestoredCounts {
  san_pham: number;
  ceo: number;
  nhom_san_pham: number;
  sales_session: number;
}

const APP_VERSION = __APP_VERSION__;

const TABLE_LABELS: Record<string, string> = {
  san_pham: "Sản phẩm",
  nhom_san_pham: "Nhóm sản phẩm",
  ceo: "CEO",
  sales_session: "Phiên báo cáo bán hàng",
};

export default function BackupPage() {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const path = await save({
        defaultPath: `hang-wu-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "Backup JSON", extensions: ["json"] }],
      });
      if (!path) return;

      const json = await invoke<string>("build_backup", {
        appVersion: APP_VERSION,
      });
      await invoke("write_backup_file", { path, content: json });

      notifications.show({
        color: "green",
        title: "Đã xuất bản sao lưu",
        message: path,
        autoClose: 6000,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Xuất sao lưu thất bại",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setConfirmOpen(false);
    setImporting(true);
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "Backup JSON", extensions: ["json"] }],
      });
      if (!path) return;

      const json = await invoke<string>("read_backup_file", {
        path: path as string,
      });
      const counts = await invoke<RestoredCounts>("restore_backup", { json });

      await queryClient.invalidateQueries();

      const summary = Object.entries(counts)
        .map(([k, v]) => `${TABLE_LABELS[k] ?? k}: ${v}`)
        .join(" · ");
      notifications.show({
        color: "green",
        title: "Phục hồi thành công",
        message: summary,
        autoClose: 8000,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Phục hồi thất bại",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Box p="xl" style={{ maxWidth: 760 }}>
      <Group gap="md" mb="xs" align="center" wrap="nowrap">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--mantine-color-blue-0)",
            color: "var(--mantine-color-blue-7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconDatabase size={22} />
        </Box>
        <Box style={{ flex: 1 }}>
          <Group gap={8} align="baseline">
            <Title order={4} style={{ letterSpacing: "-0.2px" }}>
              Sao lưu & Phục hồi
            </Title>
            <Text size="xs" c="dimmed">
              v{APP_VERSION}
            </Text>
          </Group>
          <Text c="dimmed" size="sm" mt={2}>
            Sao lưu / phục hồi toàn bộ dữ liệu: sản phẩm, nhóm sản phẩm, CEO và
            lịch sử báo cáo bán hàng. Định dạng file JSON.
          </Text>
        </Box>
      </Group>

      <Stack gap="md" mt="lg">
        <Card withBorder radius="md" padding="lg">
          <Group
            justify="space-between"
            align="flex-start"
            wrap="nowrap"
            gap="lg"
          >
            <Box style={{ flex: 1 }}>
              <Group gap={8} mb={4} align="center">
                <IconDownload size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={600}>Xuất bản sao lưu</Text>
              </Group>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.55 }}>
                Ghi toàn bộ dữ liệu hiện tại ra một file JSON. Bạn sẽ được chọn
                nơi lưu file.
              </Text>
            </Box>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={importing}
            >
              Xuất bản sao lưu
            </Button>
          </Group>
        </Card>

        <Card
          withBorder
          radius="md"
          padding="lg"
          style={{ borderLeft: "3px solid var(--mantine-color-red-5)" }}
        >
          <Group gap={8} mb={4} align="center">
            <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
            <Text fw={600}>Phục hồi từ file sao lưu</Text>
          </Group>
          <Text size="sm" c="dimmed" mt={2} style={{ lineHeight: 1.55 }}>
            Chọn một file sao lưu để nạp lại. Thao tác diễn ra trong một giao
            dịch — nếu lỗi, dữ liệu hiện tại được giữ nguyên.
          </Text>
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            mt="md"
            title="Cảnh báo: ghi đè toàn bộ"
          >
            Khi phục hồi, <b>toàn bộ dữ liệu hiện tại sẽ bị xóa</b> và thay bằng
            dữ liệu trong file. Không thể hoàn tác — hãy xuất một bản sao lưu
            trước khi phục hồi.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button
              color="red"
              variant="filled"
              leftSection={<IconUpload size={16} />}
              onClick={() => setConfirmOpen(true)}
              loading={importing}
              disabled={exporting}
            >
              Phục hồi từ file
            </Button>
          </Group>
        </Card>
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={<Text fw={600}>Xác nhận phục hồi</Text>}
        size="md"
        centered
        closeOnClickOutside={!importing}
      >
        <Text size="sm" mb="sm">
          Bạn sắp <b>xóa sạch toàn bộ dữ liệu hiện tại</b> và thay bằng dữ liệu
          trong file sao lưu được chọn. Việc này ảnh hưởng:
        </Text>
        <List size="sm" mb="md" spacing={2}>
          {Object.values(TABLE_LABELS).map((label) => (
            <List.Item key={label}>{label}</List.Item>
          ))}
        </List>
        <Text size="sm" c="red" fw={500} mb="md">
          Hành động này không thể hoàn tác.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmOpen(false)}>
            Hủy
          </Button>
          <Button color="red" onClick={handleImport}>
            Tôi hiểu, tiếp tục phục hồi
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
