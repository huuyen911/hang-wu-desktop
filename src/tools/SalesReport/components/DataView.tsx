import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconLockOpen,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { aggregateRows } from "../aggregate";
import { useReportMasterData } from "../hooks/useReportMasterData";
import { flushSavePending, useSalesRows } from "../hooks/useSalesRows";
import { useSalesSessions } from "../hooks/useSalesSessions";
import BrandPanel, {
  DEFAULT_FILTER_STATE,
  type FilterState,
} from "./BrandPanel";
import SalesRowsTable from "./SalesRowsTable";

interface Props {
  sessionName: string;
  onReset: () => void;
}

function fmtTime(s: string): string {
  const d = dayjs(s);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : s;
}

export default function DataView({ sessionName, onReset }: Props) {
  const { activeSessionId, rows, lockedAt, masterSnapshot } = useSalesRows();
  const { lock, unlock } = useSalesSessions();
  const [tab, setTab] = useState<"report" | "data">("report");
  // Modal xác nhận chốt / hủy chốt.
  const [confirm, setConfirm] = useState<null | "lock" | "unlock">(null);

  const isLocked = lockedAt != null;

  // Mọi thao tác CRUD chỉ sửa `rows`; bảng/chi tiết tổng hợp lại từ đó.
  const data = useMemo(() => aggregateRows(rows ?? []), [rows]);

  const [activeBrand, setActiveBrand] = useState(data.brands[0]?.brand ?? "");
  const [brandFilters, setBrandFilters] = useState<Map<string, FilterState>>(
    new Map(),
  );
  const currentBrand =
    data.brands.find((b) => b.brand === activeBrand)?.brand ??
    data.brands[0]?.brand ??
    "";

  // null → live (chưa chốt); có snapshot → frozen (đã chốt). `productBonusByCode`
  // cũng dẫn xuất từ master snapshot nên thưởng CEO đóng băng cùng báo cáo.
  const {
    masterCEOs,
    masterCEOCodeSet,
    nhomSanPhamList,
    nhomSanPhamByBrand,
    quyCachMap,
    sanPhamChinhSet,
    productToGroupIdMap,
    productBrandMap,
    productBonusByCode,
  } = useReportMasterData(masterSnapshot);

  async function handleLock() {
    if (activeSessionId == null) return;
    // Đảm bảo edit cuối cùng đã lưu xuống DB TRƯỚC khi backend chụp snapshot.
    await flushSavePending();
    lock.mutate(activeSessionId, {
      onSuccess: () => {
        setConfirm(null);
        notifications.show({
          color: "green",
          icon: <IconLock size={18} />,
          message:
            "Đã chốt phiên — số liệu & thưởng đã cố định theo master hiện tại",
        });
      },
      onError: (e) =>
        notifications.show({
          color: "red",
          title: "Chốt phiên thất bại",
          message: e instanceof Error ? e.message : "Lỗi không xác định",
        }),
    });
  }

  function handleUnlock() {
    if (activeSessionId == null) return;
    unlock.mutate(activeSessionId, {
      onSuccess: () => {
        setConfirm(null);
        notifications.show({
          color: "green",
          icon: <IconCheck size={18} />,
          message: "Đã hủy chốt — báo cáo đã cập nhật theo master mới nhất",
        });
      },
      onError: (e) =>
        notifications.show({
          color: "red",
          title: "Hủy chốt thất bại",
          message: e instanceof Error ? e.message : "Lỗi không xác định",
        }),
    });
  }

  return (
    <Stack h="100%" gap={0}>
      {/* Top bar */}
      <Group
        px="lg"
        py="sm"
        justify="space-between"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          background: "white",
          flexShrink: 0,
        }}
      >
        <Group gap="xs">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={14} />}
            onClick={onReset}
            aria-label="Quay về danh sách phiên"
          >
            Danh sách phiên
          </Button>
          <Text fw={600} size="sm">
            {sessionName}
          </Text>
          {isLocked && (
            <Badge
              color="orange"
              variant="light"
              size="sm"
              leftSection={<IconLock size={11} />}
            >
              Đã chốt lúc {fmtTime(lockedAt)}
            </Badge>
          )}
        </Group>
        <Group gap="sm">
          {isLocked ? (
            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconLockOpen size={14} />}
              onClick={() => setConfirm("unlock")}
            >
              Hủy chốt
            </Button>
          ) : (
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconLock size={14} />}
              onClick={() => setConfirm("lock")}
            >
              Chốt phiên
            </Button>
          )}
          <SegmentedControl
            size="xs"
            value={tab}
            onChange={(v) => setTab(v as "report" | "data")}
            data={[
              { label: "Báo cáo", value: "report" },
              { label: "Dữ liệu", value: "data" },
            ]}
          />
        </Group>
      </Group>

      {tab === "data" ? (
        <SalesRowsTable />
      ) : data.brands.length === 0 ? (
        <Box style={{ flex: 1, display: "flex" }}>
          <Stack align="center" justify="center" style={{ flex: 1 }} gap="xs">
            <Text c="dimmed">
              Chưa có dữ liệu. Sang tab “Dữ liệu” để thêm dòng.
            </Text>
          </Stack>
        </Box>
      ) : (
        <Tabs
          value={currentBrand}
          onChange={(v) => v && setActiveBrand(v)}
          variant="default"
          keepMounted={false}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <ScrollArea
            type="scroll"
            scrollbarSize={4}
            style={{
              flexShrink: 0,
              borderBottom: "1px solid var(--mantine-color-gray-2)",
              background: "white",
            }}
          >
            <Tabs.List
              style={{ flexWrap: "nowrap", paddingLeft: 8, paddingRight: 8 }}
            >
              {data.brands.map((b) => (
                <Tabs.Tab
                  key={b.brand}
                  value={b.brand}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {b.brand}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </ScrollArea>

          {/* Active brand content */}
          <Box
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {data.brands.map((b) =>
              b.brand === currentBrand ? (
                <BrandPanel
                  key={b.brand}
                  brand={b}
                  allBrands={data.brands}
                  quyCachMap={quyCachMap}
                  sanPhamChinhSet={sanPhamChinhSet}
                  masterCEOList={masterCEOs}
                  masterCEOCodeSet={masterCEOCodeSet}
                  nhomGroups={nhomSanPhamByBrand.get(b.brand) ?? []}
                  productToGroupIdMap={productToGroupIdMap}
                  allNhomGroups={nhomSanPhamList}
                  productBrandMap={productBrandMap}
                  productBonusByCode={productBonusByCode}
                  filters={brandFilters.get(b.brand) ?? DEFAULT_FILTER_STATE}
                  onFiltersChange={(update) =>
                    setBrandFilters((prev) => {
                      const next = new Map(prev);
                      next.set(b.brand, {
                        ...(prev.get(b.brand) ?? DEFAULT_FILTER_STATE),
                        ...update,
                      });
                      return next;
                    })
                  }
                />
              ) : null,
            )}
          </Box>
        </Tabs>
      )}

      {/* Modal xác nhận CHỐT phiên */}
      <Modal
        opened={confirm === "lock"}
        onClose={() => !lock.isPending && setConfirm(null)}
        title={
          <Group gap={8}>
            <IconLock size={18} />
            <Text fw={600}>Chốt phiên “{sessionName}”?</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Số liệu báo cáo{" "}
            <Text span fw={700}>
              và phần tính thưởng CEO
            </Text>{" "}
            sẽ được{" "}
            <Text span fw={700}>
              CỐ ĐỊNH
            </Text>{" "}
            theo master data tại thời điểm này. Sau khi chốt, dù có sửa sản phẩm
            / quy cách / nhóm / CEO / mức thưởng trong master, phiên này{" "}
            <Text span fw={700}>
              VẪN GIỮ NGUYÊN
            </Text>{" "}
            số liệu &amp; thưởng.
          </Text>
          <Text size="sm" c="dimmed">
            Phiên sẽ bị khóa: không sửa / đổi tên / xóa được cho tới khi bạn hủy
            chốt.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setConfirm(null)}
              disabled={lock.isPending}
            >
              Để sau
            </Button>
            <Button
              color="blue"
              onClick={handleLock}
              loading={lock.isPending}
              leftSection={<IconLock size={14} />}
            >
              Chốt phiên
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal xác nhận HỦY CHỐT */}
      <Modal
        opened={confirm === "unlock"}
        onClose={() => !unlock.isPending && setConfirm(null)}
        title={
          <Group gap={8}>
            <IconLockOpen size={18} />
            <Text fw={600}>Hủy chốt phiên “{sessionName}”?</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          {isLocked && (
            <Text size="sm">
              Phiên đang được chốt ở mốc{" "}
              <Text span fw={700}>
                {fmtTime(lockedAt)}
              </Text>
              .
            </Text>
          )}
          <Text size="sm">
            Ngay khi bạn xác nhận, báo cáo &amp; thưởng sẽ{" "}
            <Text span fw={700}>
              CẬP NHẬT LẬP TỨC
            </Text>{" "}
            theo master data mới nhất hiện tại. Các số liệu phụ thuộc master —
            đặc biệt là{" "}
            <Text span fw={700}>
              SỐ THÙNG
            </Text>
            , cách gom nhóm, mức thưởng, bộ lọc “chỉ sản phẩm chính” — có thể
            thay đổi so với bản đã chốt.
          </Text>
          <Text size="sm" c="dimmed">
            Phiên sẽ chuyển về chế độ động: mọi thay đổi master sau này đều ảnh
            hưởng tới phiên. Bạn có thể chốt lại bất cứ lúc nào.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setConfirm(null)}
              disabled={unlock.isPending}
            >
              Giữ chốt
            </Button>
            <Button
              color="orange"
              onClick={handleUnlock}
              loading={unlock.isPending}
              leftSection={<IconLockOpen size={14} />}
            >
              Hủy chốt &amp; cập nhật ngay
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
