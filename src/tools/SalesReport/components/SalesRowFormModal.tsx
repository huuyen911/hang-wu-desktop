import { THUONG_HIEU_VALUES } from "@/domain/constants";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useReportMasterData } from "../hooks/useReportMasterData";
import { makeRowId } from "../parser";
import type { SalesRow } from "../types";

type Draft = {
  ceo: string;
  ceoName: string;
  brand: string;
  productCode: string;
  productName: string;
  unit: string;
  invoice: string;
  dateObj: Date | null;
  qty: number | string;
  unitPrice: number | string;
  amount: number | string;
};

function dateToString(d: Date | null): string {
  if (!d) return "";
  return dayjs(d).format("DD/MM/YYYY HH:mm:ss");
}

function stringToDate(s: string): Date | null {
  if (!s) return null;
  const d = dayjs(s, "DD/MM/YYYY HH:mm:ss");
  return d.isValid() ? d.toDate() : null;
}

function monthFromDate(d: Date | null): string {
  if (!d) return "";
  return dayjs(d).format("MM/YYYY");
}

function toDraft(row?: SalesRow | null): Draft {
  return {
    ceo: row?.ceo ?? "",
    ceoName: row?.ceoName ?? "",
    brand: row?.brand ?? "",
    productCode: row?.productCode ?? "",
    productName: row?.productName ?? "",
    unit: row?.unit ?? "",
    invoice: row?.invoice ?? "",
    dateObj: stringToDate(row?.date ?? ""),
    qty: row?.qty ?? "",
    unitPrice: row?.unitPrice ?? "",
    amount: row?.amount ?? "",
  };
}

interface Props {
  opened: boolean;
  row?: SalesRow | null;
  onClose: () => void;
  onSubmit: (row: SalesRow) => void;
}

export default function SalesRowFormModal({
  opened,
  row,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!row;
  const { masterCEOs, sanPhamList } = useReportMasterData();
  const [d, setD] = useState<Draft>(() => toDraft(row));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (opened) {
      setD(toDraft(row));
      setTouched(false);
    }
  }, [opened, row]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setD((prev) => ({ ...prev, [key]: value }));
  }

  function handleCeoSelect(maCeo: string | null) {
    if (!maCeo) {
      setD((prev) => ({ ...prev, ceo: "", ceoName: "" }));
      return;
    }
    const found = masterCEOs.find((c) => c.ma_ceo === maCeo);
    setD((prev) => ({ ...prev, ceo: maCeo, ceoName: found?.ten_ceo ?? "" }));
  }

  function handleBrandChange(v: string) {
    setD((prev) => ({
      ...prev,
      brand: v,
      productCode: "",
      productName: "",
      unit: "",
    }));
  }

  function handleProductSelect(maSp: string | null) {
    if (!maSp) {
      setD((prev) => ({ ...prev, productCode: "", productName: "", unit: "" }));
      return;
    }
    const found = sanPhamList.find((sp) => sp.ma_san_pham === maSp);
    setD((prev) => ({
      ...prev,
      productCode: maSp,
      productName: found?.ten_san_pham ?? "",
    }));
  }

  const ceoOptions = useMemo(
    () =>
      masterCEOs.map((c) => ({
        value: c.ma_ceo,
        label: `${c.ma_ceo} – ${c.ten_ceo}`,
      })),
    [masterCEOs],
  );

  const productOptions = useMemo(
    () =>
      sanPhamList
        .filter((sp) => !d.brand || sp.thuong_hieu === d.brand)
        .map((sp) => ({
          value: sp.ma_san_pham,
          label: `${sp.ma_san_pham} – ${sp.ten_san_pham}`,
        })),
    [sanPhamList, d.brand],
  );

  const qtyNum = typeof d.qty === "number" ? d.qty : parseFloat(String(d.qty));
  const priceNum =
    typeof d.unitPrice === "number"
      ? d.unitPrice
      : parseFloat(String(d.unitPrice));
  const amountNum =
    typeof d.amount === "number" ? d.amount : parseFloat(String(d.amount));

  const errCeo = !d.ceo.trim();
  const errBrand = !d.brand.trim();
  const errProduct = !d.productCode.trim();
  const errQty = !Number.isFinite(qtyNum);
  const hasError = errCeo || errBrand || errProduct || errQty;

  function handleSubmit() {
    setTouched(true);
    if (hasError) return;
    const qty = qtyNum;
    const unitPrice = Number.isFinite(priceNum) ? priceNum : 0;
    const amount = Number.isFinite(amountNum) ? amountNum : qty * unitPrice;
    onSubmit({
      id: row?.id ?? makeRowId(),
      ceo: d.ceo.trim(),
      ceoName: d.ceoName.trim(),
      brand: d.brand.trim(),
      productCode: d.productCode.trim(),
      productName: d.productName.trim(),
      unit: d.unit.trim(),
      invoice: d.invoice.trim(),
      month: monthFromDate(d.dateObj),
      date: dateToString(d.dateObj),
      qty,
      unitPrice,
      amount,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600}>{isEdit ? "Chỉnh sửa dòng" : "Thêm dòng mới"}</Text>
      }
      size="lg"
    >
      <Stack gap="sm">
        <SimpleGrid cols={2} spacing="sm">
          <Select
            label="CEO"
            required
            placeholder="Chọn CEO..."
            data={ceoOptions}
            value={d.ceo || null}
            onChange={handleCeoSelect}
            searchable
            clearable
            error={touched && errCeo ? "Bắt buộc" : null}
          />
          <Select
            label="Thương hiệu"
            required
            placeholder="Chọn thương hiệu..."
            data={[...THUONG_HIEU_VALUES]}
            value={d.brand || null}
            onChange={(v) => handleBrandChange(v ?? "")}
            clearable
            error={touched && errBrand ? "Bắt buộc" : null}
          />
          <Select
            label="Sản phẩm"
            required
            placeholder="Chọn sản phẩm..."
            data={productOptions}
            value={d.productCode || null}
            onChange={handleProductSelect}
            searchable
            clearable
            error={touched && errProduct ? "Bắt buộc" : null}
            style={{ gridColumn: "span 2" }}
          />
          <TextInput
            label="Đơn vị tính"
            value={d.unit}
            onChange={(e) => set("unit", e.currentTarget.value)}
          />
          <TextInput
            label="Mã hóa đơn"
            value={d.invoice}
            onChange={(e) => set("invoice", e.currentTarget.value)}
          />
          <DateTimePicker
            label="Thời gian"
            placeholder="Chọn ngày giờ"
            value={d.dateObj}
            onChange={(v) => {
              if (!v) {
                set("dateObj", null);
                return;
              }
              const parsed = dayjs(v);
              set("dateObj", parsed.isValid() ? parsed.toDate() : null);
            }}
            valueFormat="DD/MM/YYYY HH:mm"
            clearable
            style={{ gridColumn: "span 2" }}
          />
          <NumberInput
            label="Số lượng"
            required
            value={d.qty}
            onChange={(v) => set("qty", v)}
            error={touched && errQty ? "Phải là số" : null}
            thousandSeparator="."
            decimalSeparator=","
          />
          <NumberInput
            label="Đơn giá"
            value={d.unitPrice}
            onChange={(v) => set("unitPrice", v)}
            thousandSeparator="."
            decimalSeparator=","
          />
          <NumberInput
            label="Thành tiền"
            description="Để trống = tự tính Số lượng × Đơn giá"
            value={d.amount}
            onChange={(v) => set("amount", v)}
            thousandSeparator="."
            decimalSeparator=","
            style={{ gridColumn: "span 2" }}
          />
        </SimpleGrid>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit}>
            {isEdit ? "Lưu thay đổi" : "Thêm mới"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
