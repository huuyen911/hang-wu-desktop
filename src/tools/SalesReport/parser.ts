import { invoke } from "@tauri-apps/api/core";
import type { SalesRow } from "./types";

/**
 * Sinh id local duy nhất cho mỗi dòng (dùng khi tạo dòng mới thủ công).
 * crypto.randomUUID khả dụng trong WebView2 → không cần fallback thủ công.
 */
export function makeRowId(): string {
  return `r_${crypto.randomUUID()}`;
}

/**
 * Đọc file Excel theo đường dẫn (đã được người dùng chọn qua hộp thoại hệ
 * thống) → danh sách dòng phẳng. Toàn bộ parsing nằm phía Rust (calamine);
 * dùng path thay vì truyền bytes qua IPC để tránh JSON-serialize file 50 MB.
 */
export async function parseExcelByPath(path: string): Promise<SalesRow[]> {
  return invoke<SalesRow[]>("parse_excel_file", { path });
}
