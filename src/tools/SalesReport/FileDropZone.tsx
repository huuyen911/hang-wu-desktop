import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

interface Props {
  onPath: (path: string) => void;
  /** Hiển thị to, thân thiện khi chưa có phiên nào. */
  large?: boolean;
}

function hasExcelExt(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export default function FileDropZone({ onPath, large = false }: Props) {
  const [dragOver, setDragOver] = useState(false);

  // Tauri intercepts OS-level file drops và phát qua sự kiện này — không qua
  // HTML5 drag/drop nên không thể dùng <input type="file"> hay Mantine Dropzone
  // thuần cho drop. Lắng nghe ở đây để vẫn nhận drag-drop từ Explorer.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          const p = event.payload;
          if (p.type === "over" || p.type === "enter") {
            setDragOver(true);
          } else if (p.type === "leave") {
            setDragOver(false);
          } else if (p.type === "drop") {
            setDragOver(false);
            const path = p.paths.find(hasExcelExt);
            if (path) onPath(path);
          }
        });
      } catch {
        // chạy ngoài Tauri (vite preview) — bỏ qua
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [onPath]);

  async function pickFile() {
    const path = await open({
      multiple: false,
      filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    });
    if (typeof path === "string") onPath(path);
  }

  const Icon = dragOver ? IconUpload : IconFileSpreadsheet;
  const iconColor = dragOver
    ? "var(--mantine-color-blue-6)"
    : "var(--mantine-color-gray-5)";

  return (
    <Group justify="center" px="lg" pt="md" pb="xs">
      <Box
        onClick={pickFile}
        role="button"
        tabIndex={0}
        aria-label="Chọn hoặc kéo thả file Excel"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pickFile();
          }
        }}
        style={{
          width: "100%",
          cursor: "pointer",
          border: `2px dashed ${dragOver ? "var(--mantine-color-blue-5)" : "var(--mantine-color-gray-3)"}`,
          borderRadius: 10,
          background: dragOver
            ? "var(--mantine-color-blue-0)"
            : "var(--mantine-color-gray-0)",
          transform: dragOver ? "scale(1.005)" : "scale(1)",
          boxShadow: dragOver ? "0 4px 12px rgba(34,139,230,0.15)" : "none",
          transition:
            "background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s",
          outline: "none",
        }}
      >
        {large ? (
          <Stack align="center" gap="sm" py="xl" px="md">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: dragOver ? "var(--mantine-color-blue-1)" : "white",
                border: `1px solid ${dragOver ? "var(--mantine-color-blue-3)" : "var(--mantine-color-gray-2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <Icon size={32} color={iconColor} stroke={1.5} />
            </Box>
            <Stack align="center" gap={4}>
              <Text size="md" fw={600}>
                {dragOver ? "Thả file vào đây" : "Kéo thả file Excel vào đây"}
              </Text>
              <Text size="sm" c="dimmed">
                hoặc bấm để chọn từ máy · chỉ nhận .xlsx, .xls
              </Text>
            </Stack>
            <Button
              variant="light"
              size="sm"
              mt="xs"
              onClick={(e) => {
                e.stopPropagation();
                pickFile();
              }}
            >
              Chọn file
            </Button>
          </Stack>
        ) : (
          <Group justify="space-between" align="center" px="md" py="sm">
            <Group gap="sm" wrap="nowrap">
              <Icon size={28} color={iconColor} stroke={1.5} />
              <div>
                <Text size="sm" fw={600}>
                  Kéo thả hoặc bấm để chọn file Excel
                </Text>
                <Text size="xs" c="dimmed">
                  Chỉ nhận .xlsx, .xls
                </Text>
              </div>
            </Group>
            <Button
              variant="light"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                pickFile();
              }}
            >
              Chọn file
            </Button>
          </Group>
        )}
      </Box>
    </Group>
  );
}
