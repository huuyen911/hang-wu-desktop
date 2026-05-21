import { brandShort } from "@/domain/constants";

/**
 * Nhãn ngắn (E / W) đánh dấu sản phẩm/đơn hàng thuộc thương hiệu khác với
 * thương hiệu đang xem. Trước đây khối <span> này bị lặp lại y hệt ~5 chỗ.
 */
export default function BrandTag({
  brand,
  sansSerif,
  active,
}: {
  brand: string;
  /** Mã sản phẩm dùng font sans-serif để đồng bộ với ô bên cạnh. */
  sansSerif?: boolean;
  /** Khi đặt trên nền xanh (item CEO đang chọn) → đổi nền/viền sang trắng mờ. */
  active?: boolean;
}) {
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 9,
        fontWeight: 700,
        color: "var(--mantine-color-orange-7)",
        background: active
          ? "rgba(255,255,255,0.2)"
          : "var(--mantine-color-orange-1)",
        border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "var(--mantine-color-orange-3)"}`,
        borderRadius: 3,
        padding: "0 4px",
        letterSpacing: "0.04em",
        ...(sansSerif ? { fontFamily: "sans-serif" } : null),
      }}
    >
      {brandShort(brand)}
    </span>
  );
}
