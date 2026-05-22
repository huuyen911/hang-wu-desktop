import { brandShort } from "@/domain/constants";
import { thSticky } from "@/styles/table";
import { Box, Group, Modal, Text } from "@mantine/core";
import { fmt, fmtAmount, fmtAmountOrDash, fmtDecimal, fmtQty } from "../format";
import type { CEOSummary, ProductRow } from "../types";
import BrandTag from "./BrandTag";

export type ColProductEntry = {
  product: ProductRow;
  month: string;
  quyCach: number | null;
  productBrand: string;
};

export type ModalCellInfo = {
  ceo: CEOSummary;
  col: {
    key: number | string;
    name: string;
    subName?: string;
    isUngrouped: boolean;
    crossBrand?: string;
  };
  colLabel?: string;
  thung: number | null;
  entries: ColProductEntry[];
  brand: string;
};

const thStyle = thSticky;

const MAX_VISIBLE_ROWS = 15;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 32;

// Modal chi tiết một ô trong MatrixTable — liệt kê từng dòng hóa đơn.
export default function CellDetailModal({
  info,
  onClose,
}: {
  info: ModalCellInfo;
  onClose: () => void;
}) {
  const { ceo, col, colLabel: colLabelOverride, entries, brand } = info;

  type FlatLine = {
    productCode: string;
    productName: string;
    unit: string;
    quyCach: number | null;
    invoice: string;
    qty: number;
    unitPrice: number;
    amount: number;
    date: string;
    thung: number | null;
    productBrand: string;
  };
  const flatLines: FlatLine[] = [];
  entries.forEach(({ product, quyCach, productBrand }) => {
    (product.rawLines ?? []).forEach((line) => {
      flatLines.push({
        productCode: product.productCode,
        productName: product.productName || "",
        unit: product.unit,
        quyCach,
        date: line.date ?? "",
        invoice: line.invoice,
        qty: line.qty,
        unitPrice: line.unitPrice,
        amount: line.amount,
        thung: quyCach ? line.qty / quyCach : null,
        productBrand,
      });
    });
  });

  flatLines.sort((a, b) => a.productCode.localeCompare(b.productCode));

  // Gom các dòng cùng mã sản phẩm thành 1 hàng
  type AggRow = {
    productCode: string;
    productName: string;
    unit: string;
    quyCach: number | null;
    productBrand: string;
    totalQty: number;
    totalAmount: number;
    totalThung: number | null;
    invoices: string[];
    dates: string[];
    unitPrices: number[];
  };
  const aggMap = new Map<string, AggRow>();
  flatLines.forEach((line) => {
    if (!aggMap.has(line.productCode)) {
      aggMap.set(line.productCode, {
        productCode: line.productCode,
        productName: line.productName,
        unit: line.unit,
        quyCach: line.quyCach,
        productBrand: line.productBrand,
        totalQty: 0,
        totalAmount: 0,
        totalThung: line.quyCach !== null ? 0 : null,
        invoices: [],
        dates: [],
        unitPrices: [],
      });
    }
    const agg = aggMap.get(line.productCode)!;
    agg.totalQty += line.qty;
    agg.totalAmount += line.amount;
    if (agg.totalThung !== null && line.thung !== null)
      agg.totalThung += line.thung;
    if (line.invoice && !agg.invoices.includes(line.invoice))
      agg.invoices.push(line.invoice);
    if (line.date && !agg.dates.includes(line.date))
      agg.dates.push(line.date);
    if (line.unitPrice > 0 && !agg.unitPrices.includes(line.unitPrice))
      agg.unitPrices.push(line.unitPrice);
  });
  const aggRows = [...aggMap.values()];

  const noData = flatLines.length === 0;
  // Tổng thùng lấy thẳng từ ô đã bấm (đã làm tròn xuống theo TỪNG nhóm/SP ở
  // MatrixTable). KHÔNG cộng dồn raw của mọi dòng rồi floor một lần ở đây — cộng
  // các phần thùng lẻ của nhiều nhóm/SP rồi mới floor sẽ ra số lớn hơn và lệch
  // với giá trị hiển thị trên ma trận.
  const totalThung = info.thung;
  const totalQty = flatLines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = flatLines.reduce((s, l) => s + l.amount, 0);
  const colLabel =
    colLabelOverride ??
    (col.isUngrouped ? `Sản phẩm ${col.name}` : `Nhóm "${col.name}"`);

  return (
    <Modal
      opened
      onClose={onClose}
      size="70%"
      centered
      styles={{ body: { padding: "16px" }, header: { padding: "12px 16px" } }}
      title={
        <Group gap="xs" wrap="nowrap">
          <Text fw={700} size="sm" ff="monospace">
            {ceo.ceo}
          </Text>
          {ceo.ceoName && (
            <Text size="sm" c="dimmed">
              — {ceo.ceoName}
            </Text>
          )}
          <Text size="sm" c="dimmed">
            ·
          </Text>
          {col.crossBrand && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--mantine-color-orange-7)",
                background: "var(--mantine-color-orange-1)",
                border: "1px solid var(--mantine-color-orange-3)",
                borderRadius: 3,
                padding: "0 4px",
              }}
            >
              {brandShort(col.crossBrand)}
            </span>
          )}
          <Text size="sm" c="dimmed">
            {colLabel}
          </Text>
          {col.subName && (
            <Text size="xs" c="dimmed">
              — {col.subName}
            </Text>
          )}
        </Group>
      }
    >
      <style>{`
        .cdm-tbl th, .cdm-tbl td { border-right: 1px solid var(--mantine-color-gray-2); }
      `}</style>
      {noData ? (
        <Text size="sm" c="dimmed">
          CEO này không có đơn hàng nào cho {colLabel} trong kỳ báo cáo.
        </Text>
      ) : (
        <Box
          style={{
            overflow: "auto",
            maxHeight:
              HEADER_HEIGHT + ROW_HEIGHT * MAX_VISIBLE_ROWS + FOOTER_HEIGHT,
          }}
        >
          <table
            className="cdm-tbl"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              minWidth: 980,
            }}
          >
            <thead>
              <tr>
                <th scope="col" style={{ ...thStyle, width: 100 }}>
                  Mã sản phẩm
                </th>
                <th scope="col" style={{ ...thStyle, width: 190 }}>
                  Tên sản phẩm
                </th>
                <th scope="col" style={{ ...thStyle, width: 140 }}>
                  Mã hóa đơn
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 55, textAlign: "center" }}
                >
                  Đơn vị tính
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 75, textAlign: "right" }}
                >
                  Số lượng
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 65, textAlign: "right" }}
                >
                  Quy cách
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 90, textAlign: "right" }}
                >
                  Số lượng thùng
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 80, textAlign: "center" }}
                >
                  Thời gian
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 110, textAlign: "right" }}
                >
                  Đơn giá
                </th>
                <th
                  scope="col"
                  style={{ ...thStyle, width: 120, textAlign: "right" }}
                >
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {aggRows.map((row, i) => {
                const missingQC = row.quyCach === null;
                const rowBg = missingQC
                  ? "var(--mantine-color-orange-0)"
                  : i % 2 === 1
                    ? "var(--mantine-color-gray-0)"
                    : "white";
                return (
                  <tr
                    key={row.productCode}
                    style={{
                      background: rowBg,
                      borderBottom: "1px solid var(--mantine-color-gray-1)",
                    }}
                  >
                    <td
                      style={{
                        padding: "5px 8px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: 11,
                        color: missingQC
                          ? "var(--mantine-color-orange-7)"
                          : "var(--mantine-color-blue-7)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {row.productBrand !== brand && (
                          <BrandTag brand={row.productBrand} sansSerif />
                        )}
                        {row.productCode}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        maxWidth: 190,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.productName}
                    >
                      {row.productName || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "var(--mantine-color-dark-4)",
                        whiteSpace: "pre",
                        lineHeight: 1.6,
                      }}
                    >
                      {row.invoices.length > 0 ? row.invoices.join("\n") : "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        color: "var(--mantine-color-dimmed)",
                      }}
                    >
                      {row.unit}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {fmtQty(row.totalQty)}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "right",
                        color: missingQC
                          ? "var(--mantine-color-orange-6)"
                          : "var(--mantine-color-dimmed)",
                      }}
                    >
                      {row.quyCach !== null ? fmt.format(row.quyCach) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: missingQC
                          ? "var(--mantine-color-orange-6)"
                          : "var(--mantine-color-blue-8)",
                      }}
                    >
                      {row.totalThung !== null ? (
                        fmtDecimal(row.totalThung)
                      ) : (
                        <span
                          style={{
                            color: "var(--mantine-color-orange-5)",
                            fontSize: 11,
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        fontSize: 10,
                        color: "var(--mantine-color-dimmed)",
                        whiteSpace: "pre",
                        lineHeight: 1.6,
                      }}
                    >
                      {row.dates.length > 0 ? row.dates.join("\n") : "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "right",
                        fontSize: 10,
                        color: "var(--mantine-color-dimmed)",
                        whiteSpace: "pre",
                        lineHeight: 1.6,
                      }}
                    >
                      {row.unitPrices.length > 0
                        ? row.unitPrices.map((v) => fmtAmountOrDash(v)).join("\n")
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "right",
                        color: "var(--mantine-color-green-7)",
                        fontWeight: 600,
                      }}
                    >
                      {fmtAmount(row.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ position: "sticky", bottom: 0, zIndex: 1 }}>
              <tr
                style={{
                  background: "var(--mantine-color-blue-1)",
                  fontWeight: 700,
                  borderTop: "2px solid var(--mantine-color-blue-3)",
                }}
              >
                <td
                  colSpan={3}
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    color: "var(--mantine-color-blue-8)",
                  }}
                >
                  Tổng ({aggRows.length} sản phẩm)
                </td>
                <td />
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    color: "var(--mantine-color-blue-9)",
                  }}
                >
                  {fmtQty(totalQty)}
                </td>
                <td />
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    color: "var(--mantine-color-blue-9)",
                  }}
                >
                  {totalThung && totalThung > 0 ? fmt.format(totalThung) : "—"}
                </td>
                <td />
                <td />
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    color: "var(--mantine-color-green-8)",
                  }}
                >
                  {fmtAmount(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Box>
      )}
    </Modal>
  );
}
