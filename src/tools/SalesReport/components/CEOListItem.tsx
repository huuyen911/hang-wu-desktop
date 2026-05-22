import { Box, Group, Stack, Text } from "@mantine/core";
import { fmtDecimal, fmtQty } from "../format";
import type { CEOSummary } from "../types";
import BrandTag from "./BrandTag";

interface Props {
  ceo: CEOSummary;
  active: boolean;
  onClick: () => void;
  totalThung: number;
  inMasterData: boolean;
  crossBrands: Set<string>;
}

export default function CEOListItem({
  ceo,
  active,
  onClick,
  totalThung,
  inMasterData,
  crossBrands,
}: Props) {
  return (
    <Box
      component="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        padding: "10px 14px",
        borderRadius: 8,
        background: active ? "var(--mantine-color-blue-6)" : "transparent",
        transition: "background 0.15s",
        borderBottom: active ? "none" : "1px solid var(--mantine-color-gray-2)",
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.background = "var(--mantine-color-gray-1)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Group gap={4} wrap="nowrap">
            <Text
              fw={700}
              size="sm"
              ff="monospace"
              c={active ? "white" : inMasterData ? "dark" : "red.6"}
            >
              {ceo.ceo}
            </Text>
            {[...crossBrands].map((cb) => (
              <BrandTag key={cb} brand={cb} active={active} />
            ))}
          </Group>
          {ceo.ceoName && (
            <Text size="xs" c={active ? "blue.1" : "dimmed"} truncate>
              {ceo.ceoName}
            </Text>
          )}
        </Stack>
        <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
          {ceo.totalQty > 0 ? (
            <>
              {totalThung > 0 && (
                <Text
                  size="xs"
                  fw={600}
                  c={active ? "white" : "dark"}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {fmtDecimal(totalThung)} thùng
                </Text>
              )}
              <Text
                size="xs"
                c={active ? "blue.1" : "dimmed"}
                style={{ whiteSpace: "nowrap" }}
              >
                {fmtQty(ceo.totalQty)} sản phẩm
              </Text>
            </>
          ) : (
            <Text
              size="xs"
              c={active ? "blue.2" : "dimmed"}
              style={{ whiteSpace: "nowrap", fontStyle: "italic" }}
            >
              Không có dữ liệu
            </Text>
          )}
        </Stack>
      </Group>
    </Box>
  );
}
