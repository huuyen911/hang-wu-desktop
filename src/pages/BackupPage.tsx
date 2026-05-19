import { useState } from 'react'
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Alert,
  Modal,
  List,
  Box,
} from '@mantine/core'
import {
  IconDownload,
  IconUpload,
  IconAlertTriangle,
  IconDatabase,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'

interface RestoredCounts {
  san_pham: number
  ceo: number
  nhom_san_pham: number
  sales_session: number
}

const APP_VERSION = '0.2.0'

const TABLE_LABELS: Record<string, string> = {
  san_pham: 'Sản phẩm',
  nhom_san_pham: 'Nhóm sản phẩm',
  ceo: 'CEO',
  sales_session: 'Phiên báo cáo bán hàng',
}

export default function BackupPage() {
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const path = await save({
        defaultPath: `hang-wu-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'Backup JSON', extensions: ['json'] }],
      })
      if (!path) return

      const json = await invoke<string>('build_backup', { appVersion: APP_VERSION })
      await invoke('write_backup_file', { path, content: json })

      notifications.show({
        color: 'green',
        title: 'Đã xuất bản sao lưu',
        message: path,
        autoClose: 6000,
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Xuất sao lưu thất bại',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    setConfirmOpen(false)
    setImporting(true)
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: 'Backup JSON', extensions: ['json'] }],
      })
      if (!path) return

      const json = await invoke<string>('read_backup_file', { path: path as string })
      const counts = await invoke<RestoredCounts>('restore_backup', { json })

      await queryClient.invalidateQueries()

      const summary = Object.entries(counts)
        .map(([k, v]) => `${TABLE_LABELS[k] ?? k}: ${v}`)
        .join(' · ')
      notifications.show({
        color: 'green',
        title: 'Phục hồi thành công',
        message: summary,
        autoClose: 8000,
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Phục hồi thất bại',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Box p="md" style={{ maxWidth: 760 }}>
      <Group gap="sm" mb="xs">
        <IconDatabase size={24} />
        <Title order={4}>Sao lưu & Phục hồi hệ thống</Title>
      </Group>
      <Text c="dimmed" size="sm" mb="lg">
        Sao lưu/phục hồi <b>toàn bộ</b> dữ liệu: sản phẩm, nhóm sản phẩm, CEO và lịch sử báo
        cáo bán hàng. Định dạng file là JSON.
      </Text>

      <Stack gap="md">
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text fw={600}>Xuất bản sao lưu</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Ghi toàn bộ dữ liệu hiện tại ra 1 file JSON. Bạn sẽ được chọn nơi lưu file.
              </Text>
            </div>
            <Button
              leftSection={<IconDownload size={18} />}
              onClick={handleExport}
              loading={exporting}
              disabled={importing}
            >
              Xuất bản sao lưu…
            </Button>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={600}>Phục hồi từ file sao lưu</Text>
          <Text size="sm" c="dimmed" mt={4}>
            Chọn 1 file sao lưu để nạp lại. Thao tác này diễn ra trọn vẹn trong một giao dịch —
            nếu có lỗi, dữ liệu hiện tại được giữ nguyên.
          </Text>
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            mt="md"
            title="Cảnh báo: ghi đè toàn bộ"
          >
            Khi phục hồi, <b>toàn bộ dữ liệu hiện tại sẽ bị xóa</b> và thay bằng dữ liệu trong
            file. Không thể hoàn tác — hãy xuất một bản sao lưu trước khi phục hồi.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button
              color="red"
              variant="filled"
              leftSection={<IconUpload size={18} />}
              onClick={() => setConfirmOpen(true)}
              loading={importing}
              disabled={exporting}
            >
              Phục hồi từ file…
            </Button>
          </Group>
        </Card>
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={<Text fw={600}>Xác nhận phục hồi</Text>}
        size="md"
        closeOnClickOutside={!importing}
      >
        <Text size="sm" mb="sm">
          Bạn sắp <b>xóa sạch toàn bộ dữ liệu hiện tại</b> và thay bằng dữ liệu trong file sao
          lưu được chọn. Việc này ảnh hưởng:
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
  )
}
