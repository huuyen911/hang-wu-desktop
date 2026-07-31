import {
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

export interface CloudInfo {
  account_id: string;
  bucket: string;
  masked_key_id: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: (info: CloudInfo) => void;
}

/**
 * Nhập key Cloudflare R2. Key được kiểm chứng bằng một lần gọi thử lên bucket
 * rồi mới lưu vào Windows Credential Manager — sai thì không lưu gì cả.
 */
export default function CloudCredentialsModal({
  opened,
  onClose,
  onSaved,
}: Props) {
  const [accountId, setAccountId] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [bucket, setBucket] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAccountId("");
    setAccessKeyId("");
    setSecretAccessKey("");
    setBucket("");
    setError(null);
  }

  function handleClose() {
    if (saving) return;
    reset();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const info = await invoke<CloudInfo>("cloud_save_credentials", {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucket,
      });
      reset();
      onSaved(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600}>Kết nối Cloudflare R2</Text>}
      size="md"
      centered
      closeOnClickOutside={!saving}
    >
      <Text size="sm" c="dimmed" mb="md" style={{ lineHeight: 1.55 }}>
        Lấy 4 thông tin này trong Cloudflare Dashboard →{" "}
        <b>R2 → Manage API tokens</b>. Key chỉ được lưu trên máy này, trong
        Windows Credential Manager, và không nằm trong file cấu hình nào.
      </Text>

      <Stack gap="sm">
        <TextInput
          label="Account ID"
          placeholder="ví dụ: 8f4c1b2a9d..."
          value={accountId}
          onChange={(e) => setAccountId(e.currentTarget.value)}
          disabled={saving}
        />
        <TextInput
          label="Tên bucket"
          placeholder="ví dụ: hang-wu-backup"
          value={bucket}
          onChange={(e) => setBucket(e.currentTarget.value)}
          disabled={saving}
        />
        <TextInput
          label="Access Key ID"
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.currentTarget.value)}
          disabled={saving}
        />
        <PasswordInput
          label="Secret Access Key"
          description="Cloudflare chỉ hiện chuỗi này đúng một lần lúc tạo token."
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.currentTarget.value)}
          disabled={saving}
        />

        {error && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="Không kết nối được"
          >
            {error}
          </Alert>
        )}

        <Text size="xs" c="dimmed">
          Token cần quyền <b>Object Read &amp; Write</b> trên đúng bucket này.
          Xem hướng dẫn tại{" "}
          <Anchor
            size="xs"
            href="https://developers.cloudflare.com/r2/api/tokens/"
            target="_blank"
          >
            developers.cloudflare.com
          </Anchor>
          .
        </Text>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Kiểm tra &amp; lưu
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
