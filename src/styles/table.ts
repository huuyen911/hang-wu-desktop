import type { TableProps } from "@mantine/core";
import type React from "react";

export const TABLE_HEAD_BG = "var(--mantine-color-gray-1)";
export const TABLE_TOTAL_BG = "var(--mantine-color-blue-1)";
export const TABLE_ROW_ALT_BG = "var(--mantine-color-gray-0)";

export const thBase: React.CSSProperties = {
  padding: "7px 8px",
  fontSize: 12,
  fontWeight: 600,
  background: TABLE_HEAD_BG,
  borderBottom: "2px solid var(--mantine-color-gray-3)",
  whiteSpace: "nowrap",
  textAlign: "left",
};

export const thSticky: React.CSSProperties = {
  ...thBase,
  position: "sticky",
  top: 0,
  zIndex: 1,
};

export const tdBase: React.CSSProperties = {
  padding: "5px 8px",
  fontSize: 12,
  borderBottom: "1px solid var(--mantine-color-gray-1)",
  whiteSpace: "nowrap",
};

export function rowBg(idx: number): string {
  return idx % 2 === 0 ? "white" : TABLE_ROW_ALT_BG;
}

// Preset dùng chung cho mọi Mantine <Table /> trong app — giữ cho các bảng có
// header, viền, font, padding... đồng bộ với những bảng HTML tự dựng ở
// SalesReport (xem thBase/tdBase phía trên) và CEODetailTable trong detail session.
export const mantineTableProps = {
  stickyHeader: true,
  withTableBorder: true,
  withColumnBorders: true,
  highlightOnHover: true,
  verticalSpacing: 6,
  horizontalSpacing: 8,
  fz: "xs",
} as const satisfies Partial<TableProps>;
