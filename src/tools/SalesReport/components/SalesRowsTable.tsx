import DeleteConfirmModal from "@/components/crud/DeleteConfirmModal";
import { normalizeSearch } from "@/utils/search";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Pagination,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { fmtAmount, fmtAmountOrDash, fmtQty } from "../format";
import { useSalesRows } from "../hooks/useSalesRows";
import type { SalesRow } from "../types";
import { rowBg, tdBase, thSticky } from "../utils/tableStyles";
import SalesRowFormModal from "./SalesRowFormModal";
import SearchInput from "./SearchInput";

const PAGE_SIZE = 50;

export default function SalesRowsTable() {
  const { rows, addRow, updateRow, deleteRow, lockedAt } = useSalesRows();
  const list = rows ?? [];
  // Phiên đã chốt → chế độ chỉ đọc: ẩn nút thêm/sửa/xóa dòng.
  const isLocked = lockedAt != null;

  const [ceoFilter, setCeoFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [formRow, setFormRow] = useState<SalesRow | null | undefined>(
    undefined,
  );
  const [delRow, setDelRow] = useState<SalesRow | null>(null);

  const ceoOptions = useMemo(() => {
    const nameMap = new Map<string, string>();
    list.forEach((r) => {
      if (!r.ceo) return;
      if (!nameMap.has(r.ceo) || (!nameMap.get(r.ceo) && r.ceoName)) {
        nameMap.set(r.ceo, r.ceoName ?? "");
      }
    });
    return [...nameMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "vi"))
      .map(([ceo, name]) => ({
        value: ceo,
        label: name ? `${ceo} — ${name}` : ceo,
      }));
  }, [list]);
  const brandOptions = useMemo(
    () => [...new Set(list.map((r) => r.brand).filter(Boolean))].sort(),
    [list],
  );
  const monthOptions = useMemo(
    () => [...new Set(list.map((r) => r.month).filter(Boolean))].sort(),
    [list],
  );

  const qProduct = normalizeSearch(productSearch.trim());
  const qInvoice = normalizeSearch(invoiceSearch.trim());

  const filtered = useMemo(
    () =>
      list
        .filter((r) => {
          if (ceoFilter && r.ceo !== ceoFilter) return false;
          if (brandFilter && r.brand !== brandFilter) return false;
          if (monthFilter && r.month !== monthFilter) return false;
          if (
            qProduct &&
            ![r.productCode, r.productName].some((v) =>
              normalizeSearch(v ?? "").includes(qProduct),
            )
          )
            return false;
          if (qInvoice && !normalizeSearch(r.invoice ?? "").includes(qInvoice))
            return false;
          return true;
        })
        .sort((a, b) => {
          const ceoA = (a.ceo ?? "").localeCompare(b.ceo ?? "", "vi");
          if (ceoA !== 0) return ceoA;
          return (a.productCode ?? "").localeCompare(b.productCode ?? "", "vi");
        }),
    [list, ceoFilter, brandFilter, monthFilter, qProduct, qInvoice],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (curPage - 1) * PAGE_SIZE,
    curPage * PAGE_SIZE,
  );

  const isFiltered =
    !!ceoFilter || !!brandFilter || !!monthFilter || !!qProduct || !!qInvoice;

  function resetFilters() {
    setCeoFilter(null);
    setBrandFilter(null);
    setMonthFilter(null);
    setProductSearch("");
    setInvoiceSearch("");
    setPage(1);
  }

  function handleSubmit(row: SalesRow) {
    if (formRow) updateRow(row.id, row);
    else addRow(row);
    setFormRow(undefined);
  }

  const thStyle = thSticky;
  const tdStyle = tdBase;

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <Group
        px="lg"
        py="xs"
        gap="sm"
        wrap="wrap"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          background: "var(--mantine-color-gray-0)",
          flexShrink: 0,
        }}
      >
        {!isLocked && (
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setFormRow(null)}
          >
            Thêm dòng
          </Button>
        )}

        <Select
          placeholder="CEO"
          data={ceoOptions}
          value={ceoFilter}
          onChange={(v) => {
            setCeoFilter(v);
            setPage(1);
          }}
          clearable
          searchable
          size="xs"
          style={{ minWidth: 160 }}
          filter={({ options, search }) =>
            options.filter((opt) =>
              "group" in opt
                ? true
                : normalizeSearch(opt.label).includes(normalizeSearch(search)),
            )
          }
        />
        <Select
          placeholder="Thương hiệu"
          data={brandOptions}
          value={brandFilter}
          onChange={(v) => {
            setBrandFilter(v);
            setPage(1);
          }}
          clearable
          searchable
          size="xs"
          style={{ minWidth: 130 }}
        />
        <SearchInput
          placeholder="Mã / tên sản phẩm"
          value={productSearch}
          onChange={(v) => {
            setProductSearch(v);
            setPage(1);
          }}
          minWidth={180}
        />
        <SearchInput
          placeholder="Mã hóa đơn"
          value={invoiceSearch}
          onChange={(v) => {
            setInvoiceSearch(v);
            setPage(1);
          }}
          minWidth={150}
        />
        <Select
          placeholder="Tháng"
          data={monthOptions}
          value={monthFilter}
          onChange={(v) => {
            setMonthFilter(v);
            setPage(1);
          }}
          clearable
          size="xs"
          style={{ minWidth: 110 }}
        />
        {isFiltered && (
          <Button size="xs" variant="subtle" color="red" onClick={resetFilters}>
            Xoá bộ lọc
          </Button>
        )}
        <Text size="sm" c="dimmed" style={{ marginLeft: "auto" }}>
          <Text span fw={600} c="dark">
            {fmtQty(filtered.length)}
          </Text>
          {isFiltered ? `/${fmtQty(list.length)}` : ""} dòng
        </Text>
      </Group>

      {/* Table */}
      {list.length === 0 ? (
        <Center style={{ flex: 1 }}>
          <Stack align="center" gap="xs">
            <Text c="dimmed" size="sm">
              Chưa có dòng nào.
            </Text>
            {!isLocked && (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => setFormRow(null)}
              >
                Thêm dòng đầu tiên
              </Button>
            )}
          </Stack>
        </Center>
      ) : filtered.length === 0 ? (
        <Center style={{ flex: 1 }}>
          <Text c="dimmed" size="sm">
            Không có dòng khớp bộ lọc.
          </Text>
        </Center>
      ) : (
        <Box style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <style>{`.srt-tbl th,.srt-tbl td{border-right:1px solid var(--mantine-color-gray-2)}`}</style>
          <table
            className="srt-tbl"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1200,
            }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 48, textAlign: "center" }}
                >
                  STT
                </th>
                <th scope="col" style={{ ...thStyle, width: 90 }}>
                  Mã CEO
                </th>
                <th scope="col" style={{ ...thStyle, width: 150 }}>
                  Tên CEO
                </th>
                <th scope="col" style={{ ...thStyle, width: 90 }}>
                  Thương hiệu
                </th>
                <th scope="col" style={{ ...thStyle, width: 110 }}>
                  Mã sản phẩm
                </th>
                <th scope="col" style={{ ...thStyle, width: 200 }}>
                  Tên sản phẩm
                </th>
                <th scope="col" style={{ ...thStyle, width: 60 }}>
                  Đơn vị tính
                </th>
                <th scope="col" style={{ ...thStyle, width: 130 }}>
                  Mã hóa đơn
                </th>
                <th scope="col" style={{ ...thStyle, width: 140 }}>
                  Thời gian
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 90, textAlign: "right" }}
                >
                  Số lượng
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 110, textAlign: "right" }}
                >
                  Đơn giá
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 130, textAlign: "right" }}
                >
                  Thành tiền
                </th>
                {!isLocked && (
                  <th
                    scope="col"
                    style={{ ...thStyle, width: 80, textAlign: "center" }}
                  >
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id} style={{ background: rowBg(i) }}>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "var(--mantine-color-dimmed)",
                    }}
                  >
                    {(curPage - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    {r.ceo}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={r.ceoName}
                  >
                    {r.ceoName || "—"}
                  </td>
                  <td style={tdStyle}>{r.brand}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--mantine-color-blue-7)",
                    }}
                  >
                    {r.productCode}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={r.productName}
                  >
                    {r.productName || "—"}
                  </td>
                  <td
                    style={{ ...tdStyle, color: "var(--mantine-color-dimmed)" }}
                  >
                    {r.unit || "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "var(--mantine-color-dark-4)",
                    }}
                  >
                    {r.invoice || "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--mantine-color-dimmed)",
                      fontSize: 11,
                    }}
                  >
                    {r.date || "—"}
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {fmtQty(r.qty)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: "var(--mantine-color-dimmed)",
                    }}
                  >
                    {fmtAmountOrDash(r.unitPrice)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: "var(--mantine-color-green-7)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtAmount(r.amount)}
                  </td>
                  {!isLocked && (
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <Group gap={4} justify="center" wrap="nowrap">
                        <Tooltip label="Sửa" withArrow>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            onClick={() => setFormRow(r)}
                            aria-label={`Sửa dòng ${r.productCode}`}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Xóa" withArrow>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => setDelRow(r)}
                            aria-label={`Xoá dòng ${r.productCode}`}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {filtered.length > PAGE_SIZE && (
        <Group
          justify="center"
          py="xs"
          style={{
            borderTop: "1px solid var(--mantine-color-gray-2)",
            flexShrink: 0,
          }}
        >
          <Pagination
            size="sm"
            total={pageCount}
            value={curPage}
            onChange={setPage}
          />
        </Group>
      )}

      <SalesRowFormModal
        opened={formRow !== undefined}
        row={formRow}
        onClose={() => setFormRow(undefined)}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmModal
        opened={!!delRow}
        entityLabel="dòng"
        name={delRow ? `${delRow.productCode} — ${delRow.ceo}` : ""}
        code={delRow?.invoice || undefined}
        onClose={() => setDelRow(null)}
        onConfirm={() => {
          if (delRow) deleteRow(delRow.id);
          setDelRow(null);
        }}
        isDeleting={false}
      />
    </Stack>
  );
}
