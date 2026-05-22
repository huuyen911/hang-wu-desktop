import type { NhomSanPham } from "@/master-data/NhomSanPham/types";
import { Box, Center, Group, Stack, Table, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { Fragment } from "react";
import { fmt, fmtAmount, fmtAmountOrDash, fmtDecimal, fmtQty } from "../format";
import type { CEOSummary } from "../types";
import BrandTag from "./BrandTag";

interface Props {
  ceo: CEOSummary;
  brand: string;
  quyCachMap: Map<string, number>;
  nhomGroups: NhomSanPham[];
  productToGroupIdMap: Map<string, number>;
  allNhomGroups: NhomSanPham[];
  productBrandMap: Map<string, string>;
}

// Bảng chi tiết CEO — 1 bảng duy nhất, nhóm theo nhóm sản phẩm.
export default function CEODetailTable({
  ceo,
  brand,
  quyCachMap,
  nhomGroups,
  productToGroupIdMap,
  allNhomGroups,
  productBrandMap,
}: Props) {
  const nhomIdToNhomMap = new Map(allNhomGroups.map((n) => [n.id, n]));
  const currentBrandNhomIdSet = new Set(nhomGroups.map((n) => n.id));

  // Gộp tất cả sản phẩm từ mọi tháng vào 1 danh sách phẳng
  const allProducts = ceo.months.flatMap((m) => m.products);

  if (allProducts.length === 0) {
    return (
      <Center py={48}>
        <Stack align="center" gap="xs">
          <IconSearch size={28} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="sm">
            Không có sản phẩm phù hợp
          </Text>
        </Stack>
      </Center>
    );
  }

  const nhomProductsMap = new Map<number | null, typeof allProducts>();
  allProducts.forEach((p) => {
    const nhomId = productToGroupIdMap.get(p.productCode) ?? null;
    if (!nhomProductsMap.has(nhomId)) nhomProductsMap.set(nhomId, []);
    nhomProductsMap.get(nhomId)!.push(p);
  });

  const sortByCode = (prods: typeof allProducts) =>
    [...prods].sort((a, b) =>
      (a.productCode ?? "").localeCompare(b.productCode ?? "", "vi"),
    );

  const orderedGroups: Array<{
    nhom: NhomSanPham | null;
    products: typeof allProducts;
  }> = [];
  nhomGroups.forEach((nhom) => {
    const prods = nhomProductsMap.get(nhom.id);
    if (prods && prods.length > 0)
      orderedGroups.push({ nhom, products: sortByCode(prods) });
  });
  const crossBrandNhomIds = [...nhomProductsMap.keys()].filter(
    (id): id is number => id !== null && !currentBrandNhomIdSet.has(id),
  );
  crossBrandNhomIds
    .sort((a, b) => {
      const na = nhomIdToNhomMap.get(a);
      const nb = nhomIdToNhomMap.get(b);
      if (!na || !nb) return 0;
      return (
        na.thuong_hieu.localeCompare(nb.thuong_hieu) ||
        na.ten_nhom.localeCompare(nb.ten_nhom)
      );
    })
    .forEach((id) => {
      const nhom = nhomIdToNhomMap.get(id) ?? null;
      const prods = nhomProductsMap.get(id);
      if (prods && prods.length > 0)
        orderedGroups.push({ nhom, products: sortByCode(prods) });
    });
  const ungrouped = nhomProductsMap.get(null) ?? [];
  if (ungrouped.length > 0)
    orderedGroups.push({ nhom: null, products: sortByCode(ungrouped) });

  const groupThungsArr = orderedGroups.map(({ products: groupProds }) =>
    groupProds.reduce((s, p) => {
      const productBrand = productBrandMap.get(p.productCode) ?? brand;
      const qc = quyCachMap.get(`${p.productCode}|${productBrand}`);
      if (!qc) return s;
      return s + (p.rawLines ?? []).reduce((s2, line) => s2 + line.qty / qc, 0);
    }, 0),
  );
  const groupTotalQtys = orderedGroups.map(({ products: groupProds }) =>
    groupProds.reduce(
      (s, p) => s + (p.rawLines ?? []).reduce((s2, line) => s2 + line.qty, 0),
      0,
    ),
  );
  const groupTotalAmounts = orderedGroups.map(({ products: groupProds }) =>
    groupProds.reduce(
      (s, p) => s + (p.rawLines ?? []).reduce((s2, line) => s2 + line.amount, 0),
      0,
    ),
  );
  let rowIdx = 0;

  return (
    <Box>
      <Table fz="xs" style={{ tableLayout: "fixed" }} withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: "9%" }}>Mã sản phẩm</Table.Th>
            <Table.Th style={{ width: "20%" }}>Tên sản phẩm</Table.Th>
            <Table.Th style={{ width: "10%" }}>Mã hóa đơn</Table.Th>
            <Table.Th style={{ width: "5%", textAlign: "center" }}>
              Đơn vị tính
            </Table.Th>
            <Table.Th style={{ width: "8%", textAlign: "right" }}>
              Số lượng
            </Table.Th>
            <Table.Th style={{ width: "6%", textAlign: "right" }}>
              Quy cách
            </Table.Th>
            <Table.Th style={{ width: "8%", textAlign: "right" }}>
              Số lượng thùng
            </Table.Th>
            <Table.Th style={{ width: "10%", textAlign: "center" }}>
              Thời gian
            </Table.Th>
            <Table.Th style={{ width: "10%", textAlign: "right" }}>
              Đơn giá
            </Table.Th>
            <Table.Th style={{ width: "14%", textAlign: "right" }}>
              Thành tiền
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orderedGroups.map(({ nhom, products: groupProds }, groupIdx) => {
            const roundedGroupThung = groupThungsArr[groupIdx];
            const groupTotalQty = groupTotalQtys[groupIdx];
            const groupTotalAmount = groupTotalAmounts[groupIdx];
            const isUngrouped = nhom === null;
            const isCrossBrand = !isUngrouped && nhom.thuong_hieu !== brand;

            // Gom các ProductRow cùng mã sản phẩm lại
            const byCode = new Map<string, typeof groupProds>();
            groupProds.forEach((p) => {
              if (!byCode.has(p.productCode)) byCode.set(p.productCode, []);
              byCode.get(p.productCode)!.push(p);
            });

            return (
              <Fragment key={nhom?.id ?? "ungrouped"}>
                {/* Hàng tiêu đề nhóm */}
                <Table.Tr key={`group-${nhom?.id ?? "ungrouped"}`}>
                  {/* cols 1-4: tên nhóm */}
                  <Table.Td
                    colSpan={4}
                    style={{
                      padding: "5px 10px",
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                    }}
                  >
                    <Group gap="xs">
                      {isCrossBrand && <BrandTag brand={nhom.thuong_hieu} />}
                      <Text size="xs" fw={700} c={isUngrouped ? "red.7" : "teal.8"}>
                        {isUngrouped ? "Chưa phân nhóm" : nhom.ten_nhom}
                      </Text>
                    </Group>
                  </Table.Td>
                  {/* col 5: Số lượng */}
                  <Table.Td
                    style={{
                      padding: "5px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      color: isUngrouped
                        ? "var(--mantine-color-red-7)"
                        : "var(--mantine-color-teal-8)",
                    }}
                  >
                    {fmtQty(groupTotalQty)}
                  </Table.Td>
                  {/* col 6: Quy cách (trống) */}
                  <Table.Td
                    style={{
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                    }}
                  />
                  {/* col 7: Số lượng thùng */}
                  <Table.Td
                    style={{
                      padding: "5px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      color: isUngrouped
                        ? "var(--mantine-color-red-6)"
                        : "var(--mantine-color-teal-7)",
                    }}
                  >
                    {roundedGroupThung > 0 ? fmtDecimal(roundedGroupThung) : ""}
                  </Table.Td>
                  {/* cols 8-9: trống */}
                  <Table.Td
                    colSpan={2}
                    style={{
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                    }}
                  />
                  {/* col 10: Thành tiền */}
                  <Table.Td
                    style={{
                      padding: "5px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: isUngrouped
                        ? "var(--mantine-color-red-0)"
                        : "var(--mantine-color-teal-0)",
                      borderTop: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      borderBottom: `1px solid ${isUngrouped ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
                      color: "var(--mantine-color-green-7)",
                    }}
                  >
                    {fmtAmount(groupTotalAmount)}
                  </Table.Td>
                </Table.Tr>

                {/* Mỗi mã sản phẩm là một hàng, gộp tất cả rawLines */}
                {[...byCode.entries()].map(([code, prods]) => {
                  const productBrand = productBrandMap.get(code) ?? brand;
                  const quyCach =
                    quyCachMap.get(`${code}|${productBrand}`) ?? null;
                  const missingQC = quyCach === null;

                  const totalQty = prods.reduce(
                    (s, p) =>
                      s + (p.rawLines ?? []).reduce((s2, l) => s2 + l.qty, 0),
                    0,
                  );
                  const totalAmt = prods.reduce(
                    (s, p) =>
                      s +
                      (p.rawLines ?? []).reduce((s2, l) => s2 + l.amount, 0),
                    0,
                  );
                  const thung = quyCach ? totalQty / quyCach : null;
                  const productName = prods[0].productName;
                  const unit = prods[0].unit;

                  const allLines = prods.flatMap((p) => p.rawLines ?? []);
                  const invoices = [...new Set(allLines.map((l) => l.invoice).filter(Boolean))];
                  const dates = [...new Set(allLines.map((l) => l.date).filter(Boolean))].sort();
                  const unitPrices = [...new Set(allLines.map((l) => l.unitPrice).filter((v) => v > 0))];

                  const rowBg = missingQC
                    ? "var(--mantine-color-orange-0)"
                    : rowIdx % 2 === 0
                      ? "white"
                      : "var(--mantine-color-gray-0)";
                  rowIdx++;

                  return (
                    <Table.Tr key={code} style={{ background: rowBg }}>
                      <Table.Td
                        style={{
                          paddingLeft: 24,
                          fontSize: 11,
                          fontWeight: 700,
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
                          {productBrand !== brand && (
                            <BrandTag brand={productBrand} sansSerif />
                          )}
                          {code}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" truncate title={productName}>
                          {productName || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 10,
                          color: "var(--mantine-color-dark-4)",
                          lineHeight: 1.6,
                          whiteSpace: "pre",
                        }}
                      >
                        {invoices.length > 0 ? invoices.join("\n") : "—"}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "center",
                          color: "var(--mantine-color-dimmed)",
                        }}
                      >
                        {unit}
                      </Table.Td>
                      <Table.Td
                        style={{ textAlign: "right", fontWeight: 600 }}
                      >
                        {fmtQty(totalQty)}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "right",
                          color: missingQC
                            ? "var(--mantine-color-orange-6)"
                            : "var(--mantine-color-dimmed)",
                        }}
                      >
                        {quyCach !== null ? fmt.format(quyCach) : "—"}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color: missingQC
                            ? "var(--mantine-color-orange-6)"
                            : "var(--mantine-color-blue-8)",
                        }}
                      >
                        {thung !== null ? (
                          fmtDecimal(thung)
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
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "center",
                          fontSize: 10,
                          color: "var(--mantine-color-dimmed)",
                          lineHeight: 1.6,
                          whiteSpace: "pre",
                        }}
                      >
                        {dates.length > 0 ? dates.join("\n") : "—"}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "right",
                          fontSize: 10,
                          color: "var(--mantine-color-dimmed)",
                          lineHeight: 1.6,
                          whiteSpace: "pre",
                        }}
                      >
                        {unitPrices.length > 0
                          ? unitPrices.map((v) => fmtAmountOrDash(v)).join("\n")
                          : "—"}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: "right",
                          color: "var(--mantine-color-green-7)",
                          fontWeight: 600,
                        }}
                      >
                        {fmtAmount(totalAmt)}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Fragment>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
