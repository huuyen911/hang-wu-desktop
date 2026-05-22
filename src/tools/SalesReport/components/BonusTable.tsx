import { Badge, Center, Group, Modal, Table, Text } from "@mantine/core";
import { useState } from "react";
import { mantineTableProps } from "@/styles/table";
import type { CeoBonusRow } from "../bonus";
import { fmt, fmtAmount } from "../format";

interface Props {
  rows: CeoBonusRow[];
}

const W_STT = 48;
const W_MA = 120;
const W_TEN = 200;
const W_THUNG = 95;
const W_MONEY = 150;

// Bảng "Tính thưởng" — mỗi dòng một CEO, bấm vào dòng để mở modal chi tiết.
export default function BonusTable({ rows }: Props) {
  const [selected, setSelected] = useState<CeoBonusRow | null>(null);

  if (rows.length === 0) {
    return (
      <Center style={{ flex: 1 }}>
        <Text c="dimmed" size="sm">
          Không có dữ liệu
        </Text>
      </Center>
    );
  }

  const totalOwnThung = rows.reduce((s, r) => s + r.ownThung, 0);
  const totalReceivedThung = rows.reduce((s, r) => s + r.receivedThung, 0);
  const totalOwn = rows.reduce((s, r) => s + r.ownTotal, 0);
  const totalReceived = rows.reduce((s, r) => s + r.receivedTotal, 0);
  const totalGrand = rows.reduce((s, r) => s + r.grandTotal, 0);

  const BG_HEAD = "var(--mantine-color-gray-1)";

  const thBase: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 3,
    background: BG_HEAD,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    borderBottom: "2px solid var(--mantine-color-gray-3)",
    whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = {
    borderBottom: "1px solid var(--mantine-color-gray-1)",
    padding: "7px 10px",
    fontSize: 12,
  };

  return (
    <div style={{ flex: 1, overflow: "auto", minWidth: 0, minHeight: 0 }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
          minWidth: W_STT + W_MA + W_TEN + W_THUNG * 2 + W_MONEY * 3,
          width: "100%",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...thBase, width: W_STT, textAlign: "center" }}>STT</th>
            <th style={{ ...thBase, width: W_MA }}>Mã CEO</th>
            <th style={{ ...thBase, width: W_TEN }}>Tên CEO</th>
            <th style={{ ...thBase, width: W_THUNG, textAlign: "right" }}>
              Thùng bản thân
            </th>
            <th style={{ ...thBase, width: W_MONEY, textAlign: "right" }}>
              Thưởng bản thân
            </th>
            <th style={{ ...thBase, width: W_THUNG, textAlign: "right" }}>
              Thùng từ cấp dưới
            </th>
            <th style={{ ...thBase, width: W_MONEY, textAlign: "right" }}>
              Thưởng từ cấp dưới
            </th>
            <th style={{ ...thBase, width: W_MONEY, textAlign: "right" }}>
              Tổng thưởng
            </th>
          </tr>
          <tr>
            <th style={{ ...thBase, ...totalHeadStyle, textAlign: "center" }}>
              Σ
            </th>
            <th style={{ ...thBase, ...totalHeadStyle }}>Tổng</th>
            <th style={{ ...thBase, ...totalHeadStyle }} />
            <th
              style={{ ...thBase, ...totalHeadStyle, textAlign: "right" }}
              title={fmt.format(totalOwnThung)}
            >
              {fmt.format(totalOwnThung)}
            </th>
            <th
              style={{ ...thBase, ...totalHeadStyle, textAlign: "right" }}
              title={fmtAmount(totalOwn)}
            >
              {fmtAmount(totalOwn)}
            </th>
            <th
              style={{ ...thBase, ...totalHeadStyle, textAlign: "right" }}
              title={fmt.format(totalReceivedThung)}
            >
              {fmt.format(totalReceivedThung)}
            </th>
            <th
              style={{ ...thBase, ...totalHeadStyle, textAlign: "right" }}
              title={fmtAmount(totalReceived)}
            >
              {fmtAmount(totalReceived)}
            </th>
            <th
              style={{
                ...thBase,
                ...totalHeadStyle,
                textAlign: "right",
                color: "var(--mantine-color-green-8)",
              }}
              title={fmtAmount(totalGrand)}
            >
              {fmtAmount(totalGrand)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const rowBg =
              idx % 2 === 0 ? "white" : "var(--mantine-color-gray-0)";
            const hasDetail = r.details.length > 0 || r.received.length > 0;
            return (
              <tr
                key={r.ceo}
                className={hasDetail ? "bonus-row" : undefined}
                onClick={hasDetail ? () => setSelected(r) : undefined}
                style={{
                  background: rowBg,
                  cursor: hasDetail ? "pointer" : "default",
                }}
              >
                <td
                  style={{
                    ...tdBase,
                    textAlign: "center",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  {idx + 1}
                </td>
                <td
                  style={{
                    ...tdBase,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: r.inMaster
                      ? undefined
                      : "var(--mantine-color-red-6)",
                  }}
                >
                  {r.ceo}
                </td>
                <td
                  style={{
                    ...tdBase,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={r.ceoName}
                >
                  {r.ceoName || "—"}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: "right",
                    color: r.ownThung
                      ? "var(--mantine-color-dark-3)"
                      : "var(--mantine-color-gray-4)",
                  }}
                >
                  {r.ownThung ? fmt.format(r.ownThung) : "—"}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: "right",
                    color: r.ownTotal
                      ? "var(--mantine-color-dark-5)"
                      : "var(--mantine-color-gray-4)",
                  }}
                >
                  {r.ownTotal ? fmtAmount(r.ownTotal) : "—"}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: "right",
                    color: r.receivedThung
                      ? "var(--mantine-color-dark-3)"
                      : "var(--mantine-color-gray-4)",
                  }}
                >
                  {r.receivedThung ? fmt.format(r.receivedThung) : "—"}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: "right",
                    color: r.receivedTotal
                      ? "var(--mantine-color-grape-7)"
                      : "var(--mantine-color-gray-4)",
                  }}
                >
                  {r.receivedTotal ? fmtAmount(r.receivedTotal) : "—"}
                </td>
                <td
                  style={{
                    ...tdBase,
                    textAlign: "right",
                    fontWeight: 700,
                    color: r.grandTotal
                      ? "var(--mantine-color-green-7)"
                      : "var(--mantine-color-gray-4)",
                  }}
                >
                  {r.grandTotal ? fmtAmount(r.grandTotal) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        opened={selected != null}
        onClose={() => setSelected(null)}
        size="xl"
        title={
          selected && (
            <Group gap={8} wrap="nowrap">
              <Text ff="monospace" fw={700}>
                {selected.ceo}
              </Text>
              {selected.ceoName && <Text c="dimmed">— {selected.ceoName}</Text>}
              <Badge color="green" variant="light" radius="sm">
                Tổng {fmtAmount(selected.grandTotal)}
              </Badge>
            </Group>
          )
        }
      >
        {selected && <BonusDetail row={selected} />}
      </Modal>
    </div>
  );
}

const totalHeadStyle: React.CSSProperties = {
  top: 33,
  background: "var(--mantine-color-blue-1)",
  borderBottom: "2px solid var(--mantine-color-blue-3)",
  color: "var(--mantine-color-blue-8)",
  fontWeight: 700,
};

function BonusDetail({ row }: { row: CeoBonusRow }) {
  return (
    <Group align="flex-start" gap="xl" wrap="wrap">
      {/* Thưởng bản thân theo nhóm / SP */}
      <div style={{ minWidth: 420, flex: 1 }}>
        <Text size="xs" fw={700} c="dimmed" mb={6}>
          Thưởng bản thân
        </Text>
        {row.details.length === 0 ? (
          <Text size="xs" c="dimmed">
            Không có thùng phát sinh.
          </Text>
        ) : (
          <Table {...mantineTableProps} striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nhóm / Sản phẩm</Table.Th>
                <Table.Th ta="right">Thùng</Table.Th>
                <Table.Th ta="right">Thưởng/thùng</Table.Th>
                <Table.Th ta="right">Thành tiền</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {row.details.map((d) => (
                <Table.Tr key={String(d.key)}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge
                        size="xs"
                        variant="light"
                        color={d.isGroup ? "blue" : "gray"}
                        radius="sm"
                      >
                        {d.isGroup ? "Nhóm" : "SP"}
                      </Badge>
                      <Text size="xs" fw={500} truncate maw={220} title={d.label}>
                        {d.label}
                      </Text>
                      {d.subLabel && (
                        <Text size="xs" c="dimmed" truncate maw={160}>
                          {d.subLabel}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {fmt.format(d.thung)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {d.thuongCeo ? fmtAmount(d.thuongCeo) : "—"}
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    fw={600}
                    c={d.ownAmount ? "green.7" : undefined}
                  >
                    {d.ownAmount ? fmtAmount(d.ownAmount) : "—"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {/* Thưởng nhận từ cấp dưới */}
      <div style={{ minWidth: 420, flex: 1 }}>
        <Text size="xs" fw={700} c="dimmed" mb={6}>
          Thưởng từ cấp dưới
        </Text>
        {row.received.length === 0 ? (
          <Text size="xs" c="dimmed">
            Không có CEO cấp dưới phát sinh thưởng.
          </Text>
        ) : (
          <Table {...mantineTableProps} striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>CEO cấp dưới</Table.Th>
                <Table.Th>Nhóm / Sản phẩm</Table.Th>
                <Table.Th ta="right">Thùng</Table.Th>
                <Table.Th ta="right">Thưởng/thùng</Table.Th>
                <Table.Th ta="right">Thành tiền</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {row.received.map((c) => (
                <Table.Tr key={`${c.fromCeo}|${c.key}`}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" ff="monospace" fw={600}>
                        {c.fromCeo}
                      </Text>
                      {c.fromName && (
                        <Text size="xs" c="dimmed" truncate maw={140}>
                          {c.fromName}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge
                        size="xs"
                        variant="light"
                        color={c.isGroup ? "blue" : "gray"}
                        radius="sm"
                      >
                        {c.isGroup ? "Nhóm" : "SP"}
                      </Badge>
                      <Text size="xs" fw={500} truncate maw={200} title={c.label}>
                        {c.label}
                      </Text>
                      {c.subLabel && (
                        <Text size="xs" c="dimmed" truncate maw={140}>
                          {c.subLabel}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {fmt.format(c.thung)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {c.thuongCapTren ? fmtAmount(c.thuongCapTren) : "—"}
                  </Table.Td>
                  <Table.Td ta="right" fw={600} c="grape.7">
                    {fmtAmount(c.superiorAmount)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>
    </Group>
  );
}
