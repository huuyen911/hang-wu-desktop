import { Group, Text, Button } from '@mantine/core'
import { Dropzone, type FileWithPath, MIME_TYPES } from '@mantine/dropzone'
import { IconUpload, IconFileSpreadsheet, IconX } from '@tabler/icons-react'

interface Props {
  onFile: (file: File) => void
}

export default function FileDropZone({ onFile }: Props) {
  function handleDrop(files: FileWithPath[]) {
    if (files.length > 0) onFile(files[0])
  }

  return (
    <Group justify="center" px="lg" pt="md" pb="xs">
      <Dropzone
        onDrop={handleDrop}
        accept={[MIME_TYPES.xlsx, 'application/vnd.ms-excel']}
        maxFiles={1}
        maxSize={50 * 1024 * 1024}
        style={{ width: '100%' }}
      >
        <Group justify="space-between" align="center" px="md" py="sm" style={{ pointerEvents: 'none' }}>
          <Group gap="sm" wrap="nowrap">
            <Dropzone.Accept>
              <IconUpload size={28} color="var(--mantine-color-blue-6)" stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={28} color="var(--mantine-color-red-6)" stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileSpreadsheet size={28} color="var(--mantine-color-dimmed)" stroke={1.5} />
            </Dropzone.Idle>
            <div>
              <Text size="sm" fw={600}>
                Kéo thả hoặc chọn file Excel để import
              </Text>
              <Text size="xs" c="dimmed">
                Chỉ nhận .xlsx, .xls — tối đa 50 MB
              </Text>
            </div>
          </Group>
          <Button variant="light" size="xs" style={{ pointerEvents: 'none' }}>
            Chọn file
          </Button>
        </Group>
      </Dropzone>
    </Group>
  )
}
