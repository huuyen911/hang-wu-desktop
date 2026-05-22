import type { CEO } from "@/master-data/CEO/types";
import type { NhomSanPham } from "@/master-data/NhomSanPham/types";
import type { MatrixExportData } from "./utils/matrixExport";
import type { CEOSummary } from "./types";

/** Thưởng (CEO + cấp trên) tra theo mã sản phẩm khi SP không thuộc nhóm nào. */
export interface BonusProductInfo {
  thuongCeo: number | null;
  thuongCapTren: number | null;
}

/** Một dòng chi tiết: thưởng phát sinh từ số thùng của một nhóm / SP lẻ. */
export interface BonusColumnDetail {
  key: number | string;
  /** Tên nhóm, hoặc mã SP lẻ. */
  label: string;
  /** Tên SP (chỉ cho SP lẻ). */
  subLabel?: string;
  isGroup: boolean;
  /** Thương hiệu thực của nhóm / SP (khác brand hiện tại → cross-brand). */
  brand: string;
  thung: number;
  /** Thưởng / thùng cho chính CEO. */
  thuongCeo: number;
  /** Thưởng / thùng cho CEO cấp trên. */
  thuongCapTren: number;
  /** thung × thuongCeo — thưởng bản thân CEO nhận. */
  ownAmount: number;
  /** thung × thuongCapTren — thưởng chuyển lên CEO cấp trên. */
  superiorAmount: number;
}

/**
 * Một dòng thưởng cấp trên nhận được từ một CEO cấp dưới — tách theo từng nhóm /
 * SP lẻ giống bảng "Thưởng bản thân" để hiển thị breakdown chi tiết.
 */
export interface ReceivedContribution {
  fromCeo: string;
  fromName: string;
  key: number | string;
  /** Tên nhóm, hoặc mã SP lẻ. */
  label: string;
  /** Tên SP (chỉ cho SP lẻ). */
  subLabel?: string;
  isGroup: boolean;
  /** Thương hiệu thực của nhóm / SP (khác brand hiện tại → cross-brand). */
  brand: string;
  thung: number;
  /** Thưởng cấp trên / thùng. */
  thuongCapTren: number;
  /** thung × thuongCapTren — khoản chuyển lên cấp trên. */
  superiorAmount: number;
}

export interface CeoBonusRow {
  ceo: string;
  ceoName: string;
  /** CEO này có trong master data hay không (mã lạ → không tra được cấp trên). */
  inMaster: boolean;
  /** Tổng số thùng của chính CEO. */
  ownThung: number;
  /** Tổng số thùng từ các CEO cấp dưới trực tiếp. */
  receivedThung: number;
  /** Tổng thưởng bản thân (từ số thùng của chính CEO). */
  ownTotal: number;
  /** Tổng thưởng nhận từ các CEO cấp dưới trực tiếp. */
  receivedTotal: number;
  /** ownTotal + receivedTotal. */
  grandTotal: number;
  /** Các thương hiệu khác brand hiện tại mà CEO này có nhập hàng. */
  crossBrands: Set<string>;
  details: BonusColumnDetail[];
  received: ReceivedContribution[];
}

/**
 * Gom số thùng theo cột (nhóm SP hoặc SP lẻ) cho một CEO — CÙNG quy ước với
 * MatrixTable: tích lũy raw `qty/quyCach` theo key rồi `floor` từng key. Trả về
 * map key → số thùng (đã làm tròn). Cộng các phần lẻ rồi mới floor một lần sẽ
 * lệch với số trên ma trận, nên phải floor theo từng cột.
 */
function aggregateColThung(
  ceo: CEOSummary,
  brand: string,
  quyCachMap: Map<string, number>,
  productBrandMap: Map<string, string>,
  productToGroupIdMap: Map<string, number>,
): Map<number | string, number> {
  const raw = new Map<number | string, number>();
  ceo.months.forEach((m) =>
    m.products.forEach((p) => {
      const pBrand = productBrandMap.get(p.productCode) ?? brand;
      const qc = quyCachMap.get(`${p.productCode}|${pBrand}`);
      if (!qc) return;
      const groupId = productToGroupIdMap.get(p.productCode);
      const key: number | string =
        groupId !== undefined ? groupId : p.productCode;
      raw.set(key, (raw.get(key) ?? 0) + p.quantity / qc);
    }),
  );
  const out = new Map<number | string, number>();
  raw.forEach((v, key) => out.set(key, Math.floor(v)));
  return out;
}

/**
 * Tính thưởng CEO cho danh sách CEO của một thương hiệu, dựa trên số thùng từng
 * nhóm / SP lẻ (giống MatrixTable). Mỗi thùng sinh `thuong_ceo` cho chính CEO và
 * `thuong_cap_tren` cho CEO ngay trên 1 cấp (theo `ceo_cap_tren_id`). Nhóm SP
 * được ưu tiên; SP không thuộc nhóm nào dùng thưởng khai báo trên SP.
 */
export function computeCeoBonuses(
  ceos: CEOSummary[],
  brand: string,
  quyCachMap: Map<string, number>,
  productBrandMap: Map<string, string>,
  productToGroupIdMap: Map<string, number>,
  allNhomGroups: NhomSanPham[],
  productBonusByCode: Map<string, BonusProductInfo>,
  masterCEOList: CEO[],
): CeoBonusRow[] {
  const nhomById = new Map(allNhomGroups.map((n) => [n.id, n]));
  const ceoByCode = new Map(masterCEOList.map((c) => [c.ma_ceo, c]));
  const ceoById = new Map(masterCEOList.map((c) => [c.id, c]));

  // Pass 1: thưởng bản thân + breakdown; gom thưởng cấp trên về mã CEO cha.
  type Partial = {
    ceo: CEOSummary;
    details: BonusColumnDetail[];
    ownTotal: number;
    superiorTotal: number;
  };
  const receivedByParentCode = new Map<string, ReceivedContribution[]>();

  const partials: Partial[] = ceos.map((ceo) => {
    const colThung = aggregateColThung(
      ceo,
      brand,
      quyCachMap,
      productBrandMap,
      productToGroupIdMap,
    );
    // Tên SP cho nhãn cột SP lẻ — lấy lần xuất hiện đầu tiên.
    const nameByCode = new Map<string, string>();
    ceo.months.forEach((m) =>
      m.products.forEach((p) => {
        if (!nameByCode.has(p.productCode))
          nameByCode.set(p.productCode, p.productName || "");
      }),
    );

    const details: BonusColumnDetail[] = [];
    let ownTotal = 0;
    let superiorTotal = 0;
    colThung.forEach((thung, key) => {
      if (thung <= 0) return;
      let thuongCeo = 0;
      let thuongCapTren = 0;
      let label = "";
      let subLabel: string | undefined;
      let isGroup = false;
      let itemBrand = brand;
      if (typeof key === "number") {
        const nhom = nhomById.get(key);
        thuongCeo = nhom?.thuong_ceo ?? 0;
        thuongCapTren = nhom?.thuong_cap_tren ?? 0;
        label = nhom?.ten_nhom ?? `Nhóm #${key}`;
        isGroup = true;
        itemBrand = nhom?.thuong_hieu ?? brand;
      } else {
        const info = productBonusByCode.get(key);
        thuongCeo = info?.thuongCeo ?? 0;
        thuongCapTren = info?.thuongCapTren ?? 0;
        label = key;
        subLabel = nameByCode.get(key) || undefined;
        itemBrand = productBrandMap.get(key) ?? brand;
      }
      const ownAmount = thung * thuongCeo;
      const superiorAmount = thung * thuongCapTren;
      ownTotal += ownAmount;
      superiorTotal += superiorAmount;
      details.push({
        key,
        label,
        subLabel,
        isGroup,
        brand: itemBrand,
        thung,
        thuongCeo,
        thuongCapTren,
        ownAmount,
        superiorAmount,
      });
    });
    details.sort(
      (a, b) =>
        Number(b.isGroup) - Number(a.isGroup) || a.label.localeCompare(b.label),
    );
    return { ceo, details, ownTotal, superiorTotal };
  });

  partials.forEach(({ ceo, details }) => {
    if (details.length === 0) return;
    const parentId = ceoByCode.get(ceo.ceo)?.ceo_cap_tren_id ?? null;
    if (parentId == null) return;
    const parent = ceoById.get(parentId);
    if (!parent) return;
    const list = receivedByParentCode.get(parent.ma_ceo) ?? [];
    // Tách theo từng nhóm / SP lẻ của cấp dưới — kể cả khi thưởng = 0 để đếm thùng đúng.
    details.forEach((d) => {
      list.push({
        fromCeo: ceo.ceo,
        fromName: ceo.ceoName,
        key: d.key,
        label: d.label,
        subLabel: d.subLabel,
        isGroup: d.isGroup,
        brand: d.brand,
        thung: d.thung,
        thuongCapTren: d.thuongCapTren,
        superiorAmount: d.superiorAmount,
      });
    });
    receivedByParentCode.set(parent.ma_ceo, list);
  });

  return partials.map(({ ceo, details, ownTotal }) => {
    const master = ceoByCode.get(ceo.ceo);
    // Gom theo CEO cấp dưới, trong mỗi CEO: nhóm trước, rồi theo nhãn.
    const received = (receivedByParentCode.get(ceo.ceo) ?? []).sort(
      (a, b) =>
        a.fromCeo.localeCompare(b.fromCeo) ||
        Number(b.isGroup) - Number(a.isGroup) ||
        a.label.localeCompare(b.label),
    );
    const receivedTotal = received.reduce((s, r) => s + r.superiorAmount, 0);
    const ownThung = details.reduce((s, d) => s + d.thung, 0);
    const receivedThung = received.reduce((s, r) => s + r.thung, 0);
    const crossBrands = new Set(
      details.filter((d) => d.brand !== brand).map((d) => d.brand),
    );
    return {
      ceo: ceo.ceo,
      ceoName: ceo.ceoName,
      inMaster: !!master,
      ownThung,
      receivedThung,
      ownTotal,
      receivedTotal,
      grandTotal: ownTotal + receivedTotal,
      crossBrands,
      details,
      received,
    };
  });
}

/**
 * Dựng dữ liệu xuất Excel cho bảng thưởng — dùng lại lệnh `export_matrix_excel_file`.
 * 2 cột text (Mã CEO, Tên CEO) + 3 cột số (Thưởng bản thân, Thưởng từ cấp dưới,
 * Tổng). Cột "Tổng" để lệnh Rust tự sinh `=SUM(bản thân:cấp dưới)`.
 */
export function buildBonusExportData(rows: CeoBonusRow[]): MatrixExportData {
  const NUM_TEXT_COLS = 2;
  const headers = [
    "Mã CEO",
    "Tên CEO",
    "Thưởng bản thân",
    "Thưởng từ cấp dưới",
    "Tổng thưởng",
  ];
  const textTotals = ["Tổng", ""];
  const dataRows: (string | number)[][] = rows.map((r) => [
    r.ceo,
    r.ceoName || "—",
    r.ownTotal,
    r.receivedTotal,
    r.grandTotal,
  ]);
  return { headers, textTotals, numTextCols: NUM_TEXT_COLS, dataRows };
}
