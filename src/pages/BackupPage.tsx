import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  List,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCloudDownload,
  IconCloudUpload,
  IconDatabase,
  IconDownload,
  IconKey,
  IconUpload,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import CloudCredentialsModal, {
  type CloudInfo,
} from "@/components/CloudCredentialsModal";

interface RestoredCounts {
  san_pham: number;
  ceo: number;
  nhom_san_pham: number;
  sales_session: number;
}

interface CloudBackupItem {
  key: string;
  size: number;
  last_modified: string;
}

interface UploadResult {
  key: string;
  deleted: number;
  prune_error: string | null;
}

/** Khớp với hằng KEEP bên cloud.rs — chỉ dùng để hiển thị. */
const CLOUD_KEEP = 10;

/** Việc đang chờ key R2 — chạy tiếp ngay sau khi người dùng nhập xong. */
type PendingAction = "backup" | "restore" | null;

/** Nguồn của bản sao lưu sắp nạp, để modal xác nhận nói đúng tên nguồn. */
type ConfirmTarget =
  | null
  | { kind: "file" }
  | { kind: "cloud"; name: string; json: string; exportedAt: string };

const APP_VERSION = __APP_VERSION__;

const TABLE_LABELS: Record<string, string> = {
  san_pham: "Sản phẩm",
  nhom_san_pham: "Nhóm sản phẩm",
  ceo: "CEO",
  sales_session: "Phiên báo cáo bán hàng",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN");
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export default function BackupPage() {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);

  const { data: cloudInfo, refetch: refetchCloud } = useQuery({
    queryKey: ["cloud-info"],
    queryFn: () => invoke<CloudInfo | null>("cloud_credentials_info"),
  });

  const [credOpen, setCredOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState<CloudBackupItem[]>([]);
  const [listing, setListing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const busy = exporting || importing || uploading || listing;

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
        message: errorMessage(err),
      });
    } finally {
      setExporting(false);
    }
  }

  /** Nạp dữ liệu vào DB — dùng chung cho cả đường file lẫn đường cloud. */
  async function applyRestore(json: string) {
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
  }

  async function handleImportFile() {
    setConfirm(null);
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
      await applyRestore(json);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Phục hồi thất bại",
        message: errorMessage(err),
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleRestoreStaged(json: string) {
    setConfirm(null);
    setImporting(true);
    try {
      await applyRestore(json);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Phục hồi thất bại",
        message: errorMessage(err),
      });
    } finally {
      setImporting(false);
    }
  }

  /** Chưa có key thì hỏi key trước, xong quay lại chạy đúng việc vừa bấm. */
  async function withCredentials(action: Exclude<PendingAction, null>) {
    // Bấm ngay lúc vừa mở trang thì query có thể chưa trả về — hỏi lại backend
    // thay vì kết luận là chưa cấu hình.
    const info = cloudInfo ?? (await refetchCloud()).data;
    if (!info) {
      setPending(action);
      setCredOpen(true);
      return;
    }
    if (action === "backup") await runCloudBackup();
    else await openCloudPicker();
  }

  async function handleCredentialsSaved() {
    setCredOpen(false);
    await refetchCloud();
    const action = pending;
    setPending(null);
    notifications.show({
      color: "green",
      title: "Đã kết nối R2",
      message: "Key được lưu trong Windows Credential Manager của máy này.",
    });
    if (action === "backup") await runCloudBackup();
    else if (action === "restore") await openCloudPicker();
  }

  async function handleClearKey() {
    try {
      await invoke("cloud_clear_credentials");
      await refetchCloud();
      setItems([]);
      notifications.show({
        color: "gray",
        title: "Đã xoá key R2",
        message: "Lần sao lưu hoặc phục hồi tới sẽ hỏi key mới.",
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Không xoá được key",
        message: errorMessage(err),
      });
    }
  }

  async function runCloudBackup() {
    setUploading(true);
    try {
      const res = await invoke<UploadResult>("cloud_upload_backup", {
        appVersion: APP_VERSION,
      });
      const name = res.key.replace(/^backups\//, "");
      notifications.show({
        color: "green",
        title: "Đã sao lưu lên R2",
        message:
          res.deleted > 0 ? `${name} · đã dọn ${res.deleted} bản cũ` : name,
        autoClose: 6000,
      });
      if (res.prune_error) {
        notifications.show({
          color: "yellow",
          title: "Sao lưu xong, nhưng chưa dọn được bản cũ",
          message: res.prune_error,
          autoClose: 8000,
        });
      }
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Sao lưu lên mây thất bại",
        message: errorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  }

  async function openCloudPicker() {
    setListing(true);
    try {
      const list = await invoke<CloudBackupItem[]>("cloud_list_backups");
      setItems(list);
      setPickerOpen(true);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Không lấy được danh sách bản sao lưu",
        message: errorMessage(err),
      });
    } finally {
      setListing(false);
    }
  }

  /** Tải bản đã chọn về trước, để modal xác nhận hiện được ngày xuất của nó. */
  async function stageCloudBackup(item: CloudBackupItem) {
    setDownloading(item.key);
    try {
      const json = await invoke<string>("cloud_download_backup", {
        key: item.key,
      });
      let exportedAt = "không đọc được";
      try {
        const raw: unknown = JSON.parse(json).exported_at;
        if (typeof raw === "string" && raw !== "") exportedAt = formatTime(raw);
      } catch {
        // Giữ nguyên "không đọc được" — restore_backup vẫn sẽ tự kiểm tra file.
      }
      setPickerOpen(false);
      setConfirm({
        kind: "cloud",
        name: item.key.replace(/^backups\//, ""),
        json,
        exportedAt,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Tải bản sao lưu thất bại",
        message: errorMessage(err),
      });
    } finally {
      setDownloading(null);
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
          <Group gap={8} mb={4} align="center">
            <IconDownload size={16} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Sao lưu bằng file</Text>
          </Group>
          <Text size="sm" c="dimmed" mt={2} style={{ lineHeight: 1.55 }}>
            Ghi toàn bộ dữ liệu ra một file JSON để tự cất giữ, hoặc nạp lại từ
            một file có sẵn. Phục hồi sẽ <b>xoá sạch dữ liệu hiện tại</b> và
            thay bằng nội dung file, không hoàn tác được.
          </Text>

          <Group justify="flex-end" mt="md" gap="sm">
            <Button
              variant="default"
              color="red"
              leftSection={<IconUpload size={16} />}
              onClick={() => setConfirm({ kind: "file" })}
              loading={importing}
              disabled={busy && !importing}
            >
              Phục hồi từ file
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={busy && !exporting}
            >
              Xuất ra file
            </Button>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Group gap={8} mb={4} align="center">
            <IconCloudUpload size={16} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Sao lưu lên mây (Cloudflare R2)</Text>
          </Group>
          <Text size="sm" c="dimmed" mt={2} style={{ lineHeight: 1.55 }}>
            Đẩy bản sao lưu lên kho lưu trữ riêng của bạn, để máy khác tải thẳng
            về mà không cần chép file tay. Bucket luôn giữ {CLOUD_KEEP} bản gần
            nhất — sao lưu xong, bản cũ hơn được xoá tự động. Phục hồi cũng{" "}
            <b>ghi đè toàn bộ dữ liệu hiện tại</b>.
          </Text>

          {cloudInfo ? (
            <Group
              justify="space-between"
              wrap="nowrap"
              gap="sm"
              mt="md"
              p="sm"
              style={{
                borderRadius: 8,
                background: "var(--mantine-color-gray-0)",
              }}
            >
              <Box style={{ minWidth: 0 }}>
                <Group gap={6} align="center" wrap="nowrap">
                  <IconKey size={14} color="var(--mantine-color-gray-6)" />
                  <Text size="sm" fw={500} truncate>
                    {cloudInfo.bucket}
                  </Text>
                  <Badge size="xs" variant="light" color="gray">
                    {cloudInfo.masked_key_id}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mt={2} truncate>
                  Account {cloudInfo.account_id}
                </Text>
              </Box>
              <Group gap={4} wrap="nowrap">
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => setCredOpen(true)}
                  disabled={busy}
                >
                  Đổi key
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={handleClearKey}
                  disabled={busy}
                >
                  Xoá key
                </Button>
              </Group>
            </Group>
          ) : (
            <Text size="xs" c="dimmed" mt="md">
              Chưa kết nối — lần đầu bấm một trong hai nút dưới đây, app sẽ hỏi
              key R2 của bạn.
            </Text>
          )}

          <Group justify="flex-end" mt="md" gap="sm">
            <Button
              variant="default"
              color="red"
              leftSection={<IconCloudDownload size={16} />}
              onClick={() => void withCredentials("restore")}
              loading={listing}
              disabled={busy && !listing}
            >
              Phục hồi từ mây
            </Button>
            <Button
              leftSection={<IconCloudUpload size={16} />}
              onClick={() => void withCredentials("backup")}
              loading={uploading}
              disabled={busy && !uploading}
            >
              Sao lưu lên mây
            </Button>
          </Group>
        </Card>

      </Stack>

      <CloudCredentialsModal
        opened={credOpen}
        onClose={() => {
          setCredOpen(false);
          setPending(null);
        }}
        onSaved={handleCredentialsSaved}
      />

      <Modal
        opened={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={<Text fw={600}>Chọn bản sao lưu trên R2</Text>}
        size="lg"
        centered
        closeOnClickOutside={downloading === null}
      >
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa có bản sao lưu nào trên bucket này.
          </Text>
        ) : (
          <Stack gap={6}>
            {items.map((item) => (
              <UnstyledButton
                key={item.key}
                onClick={() => stageCloudBackup(item)}
                disabled={downloading !== null}
                p="sm"
                style={{
                  borderRadius: 8,
                  border: "1px solid var(--mantine-color-gray-3)",
                  opacity: downloading && downloading !== item.key ? 0.5 : 1,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {item.key.replace(/^backups\//, "")}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatTime(item.last_modified)} · {formatSize(item.size)}
                    </Text>
                  </Box>
                  {downloading === item.key && <Loader size="xs" />}
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        )}
      </Modal>

      <Modal
        opened={confirm !== null}
        onClose={() => setConfirm(null)}
        title={<Text fw={600}>Xác nhận phục hồi</Text>}
        size="md"
        centered
        closeOnClickOutside={!importing}
      >
        {confirm?.kind === "cloud" && (
          <Alert color="orange" variant="light" mb="sm">
            <Text size="sm">
              Bản sao lưu: <b>{confirm.name}</b>
            </Text>
            <Text size="sm">
              Được xuất lúc: <b>{confirm.exportedAt}</b>
            </Text>
          </Alert>
        )}
        <Text size="sm" mb="sm">
          Bạn sắp <b>xóa sạch toàn bộ dữ liệu hiện tại</b> và thay bằng dữ liệu
          trong bản sao lưu được chọn. Việc này ảnh hưởng:
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
          <Button variant="default" onClick={() => setConfirm(null)}>
            Hủy
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (confirm?.kind === "cloud") void handleRestoreStaged(confirm.json);
              else void handleImportFile();
            }}
          >
            Tôi hiểu, tiếp tục phục hồi
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}
