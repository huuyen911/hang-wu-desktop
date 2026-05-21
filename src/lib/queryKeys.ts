/**
 * Query key + endpoint tập trung một chỗ. Tránh việc gõ chuỗi `['san-pham']`
 * và `/api/san-pham` lặp lại ở nhiều file, dễ sai lệch và khó refactor.
 */

export const RESOURCES = {
  sanPham: { key: ["san-pham"] as const, endpoint: "/api/san-pham" },
  ceo: { key: ["ceo"] as const, endpoint: "/api/ceo" },
  nhomSanPham: {
    key: ["nhom-san-pham"] as const,
    endpoint: "/api/nhom-san-pham",
  },
  salesSession: {
    key: ["sales-session"] as const,
    endpoint: "/api/sales-session",
  },
} as const;

export type ResourceName = keyof typeof RESOURCES;
