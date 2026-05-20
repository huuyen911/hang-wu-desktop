import { useState } from 'react'
import { Button, Text, Stack, Progress, Group } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconDownload, IconRefresh } from '@tabler/icons-react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

type Phase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready'

export default function UpdateButton() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [update, setUpdate] = useState<Update | null>(null)
  const [downloaded, setDownloaded] = useState(0)
  const [total, setTotal] = useState(0)

  async function handleCheck() {
    setPhase('checking')
    try {
      const u = await check()
      if (!u) {
        notifications.show({
          color: 'teal',
          title: 'Đã là phiên bản mới nhất',
          message: `v${__APP_VERSION__}`,
        })
        setPhase('idle')
        return
      }
      setUpdate(u)
      setPhase('available')
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Không kiểm tra được cập nhật',
        message: String(e),
      })
      setPhase('idle')
    }
  }

  async function handleInstall() {
    if (!update) return
    setPhase('downloading')
    setDownloaded(0)
    setTotal(0)
    try {
      await update.downloadAndInstall((evt) => {
        if (evt.event === 'Started') {
          setTotal(evt.data.contentLength ?? 0)
        } else if (evt.event === 'Progress') {
          setDownloaded((prev) => prev + evt.data.chunkLength)
        } else if (evt.event === 'Finished') {
          setPhase('ready')
        }
      })
      await relaunch()
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Cập nhật thất bại',
        message: String(e),
      })
      setPhase('available')
    }
  }

  if (phase === 'available' && update) {
    return (
      <Stack gap={6} align="stretch">
        <Text size="xs" c="dark.1" ta="center">
          Có bản mới: <b>v{update.version}</b>
        </Text>
        <Button
          size="xs"
          variant="filled"
          color="blue"
          leftSection={<IconDownload size={14} />}
          onClick={handleInstall}
        >
          Tải & cài đặt
        </Button>
      </Stack>
    )
  }

  if (phase === 'downloading' || phase === 'ready') {
    const pct = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0
    return (
      <Stack gap={6} align="stretch">
        <Group justify="space-between" gap={4}>
          <Text size="xs" c="dark.1">
            {phase === 'ready' ? 'Đang khởi động lại…' : 'Đang tải…'}
          </Text>
          <Text size="xs" c="dark.1">
            {total > 0 ? `${pct}%` : ''}
          </Text>
        </Group>
        <Progress value={total > 0 ? pct : 100} animated size="xs" />
      </Stack>
    )
  }

  return (
    <Button
      size="xs"
      variant="subtle"
      color="gray"
      loading={phase === 'checking'}
      leftSection={<IconRefresh size={14} />}
      onClick={handleCheck}
      fullWidth
      styles={{ root: { color: 'var(--mantine-color-dark-1)' } }}
    >
      Kiểm tra cập nhật
    </Button>
  )
}
