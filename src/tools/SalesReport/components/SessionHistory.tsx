import DeleteConfirmModal from "@/components/crud/DeleteConfirmModal";
import { mantineTableProps } from "@/styles/table";
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconFolderOpen,
  IconHistory,
  IconLock,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useSalesSessions } from "../hooks/useSalesSessions";
import type { SalesSessionMeta } from "../types";

interface Props {
  onOpen: (id: number) => void;
}

function fmtTime(s: string): string {
  const d = dayjs(s);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : s;
}

export default function SessionHistory({ onOpen }: Props) {
  const { sessions, isLoading, rename, remove } = useSalesSessions();
  const [renameTarget, setRenameTarget] = useState<SalesSessionMeta | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SalesSessionMeta | null>(
    null,
  );

  function startRename(s: SalesSessionMeta) {
    setRenameTarget(s);
    setRenameValue(s.ten);
  }

  function submitRename() {
    const ten = renameValue.trim();
    if (!renameTarget || !ten) return;
    rename.mutate(
      { id: renameTarget.id, ten },
      {
        onSuccess: () => {
          notifications.show({
            title: "Đã đổi tên phiên",
            message: ten,
            color: "green",
          });
          setRenameTarget(null);
        },
        onError: (e) =>
          notifications.show({
            title: "Lỗi",
            message: e instanceof Error ? e.message : "Không đổi tên được",
            color: "red",
          }),
      },
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        notifications.show({
          title: "Đã xóa phiên",
          message: deleteTarget.ten,
          color: "orange",
        });
        setDeleteTarget(null);
      },
      onError: (e) =>
        notifications.show({
          title: "Lỗi",
          message: e instanceof Error ? e.message : "Không xóa được",
          color: "red",
        }),
    });
  }

  return (
    <Stack gap="sm" px="lg" pb="lg">
      <Group gap="xs" mt="sm">
        <IconHistory size={16} color="var(--mantine-color-dimmed)" />
        <Text fw={600} size="sm">
          Lịch sử phiên đã import
        </Text>
      </Group>

      {isLoading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : sessions.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          Chưa có phiên nào. Import một file Excel để bắt đầu.
        </Text>
      ) : (
        <Table {...mantineTableProps}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col" style={{ width: 36, textAlign: "center" }}>
                #
              </Table.Th>
              <Table.Th scope="col">Tên phiên</Table.Th>
              <Table.Th scope="col">File</Table.Th>
              <Table.Th scope="col" style={{ width: 80, textAlign: "center" }}>
                Số dòng
              </Table.Th>
              <Table.Th scope="col" style={{ width: 140 }}>
                Ngày import
              </Table.Th>
              <Table.Th scope="col" style={{ width: 150 }}>
                Cập nhật gần nhất
              </Table.Th>
              <Table.Th scope="col" style={{ width: 100, textAlign: "center" }}>
                Thao tác
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessions.map((s, i) => (
              <Table.Tr key={s.id}>
                <Table.Td
                  style={{
                    textAlign: "center",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  {i + 1}
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text fw={600} size="xs">
                      {s.ten}
                    </Text>
                    {s.locked_at != null && (
                      <Badge
                        color="orange"
                        variant="light"
                        size="xs"
                        leftSection={<IconLock size={10} />}
                      >
                        Đã chốt
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {s.file_name}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: "center" }}>
                  <Badge variant="light" color="blue" size="sm">
                    {s.row_count}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {fmtTime(s.created_at)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {s.updated_at !== s.created_at ? (
                    <Text size="xs" c="blue.7" fw={600}>
                      {fmtTime(s.updated_at)}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="center" wrap="nowrap">
                    <Tooltip label="Mở phiên">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => onOpen(s.id)}
                        aria-label={`Mở phiên ${s.ten}`}
                      >
                        <IconFolderOpen size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip
                      label={
                        s.locked_at != null
                          ? "Phiên đã chốt — hủy chốt để thao tác"
                          : "Đổi tên"
                      }
                    >
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => startRename(s)}
                        disabled={s.locked_at != null}
                        aria-label={`Đổi tên phiên ${s.ten}`}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip
                      label={
                        s.locked_at != null
                          ? "Phiên đã chốt — hủy chốt để thao tác"
                          : "Xóa"
                      }
                    >
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => setDeleteTarget(s)}
                        disabled={s.locked_at != null}
                        aria-label={`Xoá phiên ${s.ten}`}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={<Text fw={600}>Đổi tên phiên</Text>}
        size="md"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Tên phiên"
            value={renameValue}
            onChange={(e) => setRenameValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRenameTarget(null)}>
              Hủy
            </Button>
            <Button
              onClick={submitRename}
              loading={rename.isPending}
              disabled={!renameValue.trim()}
            >
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>

      <DeleteConfirmModal
        opened={deleteTarget !== null}
        entityLabel="phiên"
        name={deleteTarget?.ten}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isDeleting={remove.isPending}
      />
    </Stack>
  );
}
