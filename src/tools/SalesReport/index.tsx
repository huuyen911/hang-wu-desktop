import {
  Alert,
  Button,
  Center,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import FileDropZone from "./FileDropZone";
import DataView from "./components/DataView";
import ImportNameModal from "./components/ImportNameModal";
import SessionHistory from "./components/SessionHistory";
import { useSalesRows } from "./hooks/useSalesRows";
import { sessionDetailKey, useSalesSessions } from "./hooks/useSalesSessions";
import { parseExcelByPath } from "./parser";
import type { SalesRow } from "./types";

type LocalStatus =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "error"; message: string };

// "bao-cao.xlsx" → "bao-cao" để gợi ý tên phiên.
function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

interface Pending {
  fileName: string;
  rows: SalesRow[];
}

export default function SalesReport() {
  const qc = useQueryClient();
  const { activeSessionId, data, isLoading, open, reset } = useSalesRows();
  const { create, sessions, isLoading: sessionsLoading } = useSalesSessions();
  const noSessions = !sessionsLoading && sessions.length === 0;
  const [local, setLocal] = useState<LocalStatus>({ status: "idle" });
  const [pending, setPending] = useState<Pending | null>(null);

  async function handlePath(path: string) {
    setLocal({ status: "parsing" });
    try {
      const rows = await parseExcelByPath(path);
      if (rows.length === 0) {
        setLocal({
          status: "error",
          message:
            "Không tìm thấy dữ liệu hợp lệ trong file. Hãy kiểm tra lại định dạng.",
        });
        return;
      }
      setPending({ fileName: basename(path), rows });
      setLocal({ status: "idle" });
    } catch (err) {
      setLocal({
        status: "error",
        message: `Lỗi đọc file: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  function confirmImport(ten: string) {
    if (!pending) return;
    create.mutate(
      { ten, file_name: pending.fileName, rows: pending.rows },
      {
        onSuccess: (session) => {
          // Backend trả đầy đủ rows (SalesSessionDetail) — không cần vá thủ công.
          qc.setQueryData(sessionDetailKey(session.id), session);
          open(session.id);
          setPending(null);
          notifications.show({
            title: "Đã lưu phiên",
            message: `${session.ten} · ${session.row_count} dòng`,
            color: "green",
          });
        },
        onError: (e) =>
          notifications.show({
            title: "Lưu phiên thất bại",
            message: e instanceof Error ? e.message : "Lỗi không xác định",
            color: "red",
          }),
      },
    );
  }

  // Đang có phiên mở → hiện báo cáo (chờ tải chi tiết nếu mở từ lịch sử).
  if (activeSessionId != null) {
    if (data) {
      return <DataView sessionName={data.fileName} onReset={reset} />;
    }
    return (
      <Center h="100%" style={{ flexDirection: "column", gap: 12 }}>
        {isLoading ? (
          <>
            <Loader size="md" />
            <Text c="dimmed">Đang mở phiên...</Text>
          </>
        ) : (
          <Stack align="center" gap="md">
            <Text c="dimmed">Không tải được phiên này.</Text>
            <Button variant="light" onClick={reset}>
              Về danh sách
            </Button>
          </Stack>
        )}
      </Center>
    );
  }

  return (
    <Stack h="100%" gap={0} style={{ overflow: "auto" }}>
      <Stack
        px="lg"
        py="md"
        gap={2}
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
      >
        <Title order={3}>Báo cáo bán hàng theo khách hàng</Title>
        <Text size="sm" c="dimmed">
          Tổng hợp dữ liệu từ file Excel — xử lý hoàn toàn trên máy, không gửi
          dữ liệu ra ngoài
        </Text>
      </Stack>

      {local.status === "parsing" && (
        <Center flex={1} style={{ flexDirection: "column", gap: 12 }}>
          <Loader size="md" />
          <Text c="dimmed">Đang phân tích dữ liệu...</Text>
        </Center>
      )}

      {local.status === "error" && (
        <Center flex={1}>
          <Stack align="center" gap="md" maw={420} w="100%">
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="Lỗi đọc file"
              color="red"
              variant="light"
              w="100%"
            >
              {local.message}
            </Alert>
            <Button
              variant="light"
              color="red"
              onClick={() => setLocal({ status: "idle" })}
            >
              Thử lại
            </Button>
          </Stack>
        </Center>
      )}

      {local.status === "idle" && (
        <>
          <FileDropZone onPath={handlePath} large={noSessions} />
          <SessionHistory onOpen={open} />
        </>
      )}

      <ImportNameModal
        opened={pending !== null}
        defaultName={pending ? stripExt(pending.fileName) : ""}
        fileName={pending?.fileName ?? ""}
        rowCount={pending?.rows.length ?? 0}
        isSaving={create.isPending}
        onClose={() => !create.isPending && setPending(null)}
        onConfirm={confirmImport}
      />
    </Stack>
  );
}
