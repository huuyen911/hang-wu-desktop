import CrudShell from "@/components/crud/CrudShell";
import DeleteConfirmModal from "@/components/crud/DeleteConfirmModal";
import FormModal from "@/components/crud/FormModal";
import { THUONG_HIEU_OPTIONS, brandColor } from "@/domain/constants";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { RESOURCES } from "@/lib/queryKeys";
import { mantineTableProps } from "@/styles/table";
import { normalizeSearch } from "@/utils/search";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  MultiSelect,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { SanPham } from "../SanPham/types";
import type { NhomSanPham, NhomSanPhamFormValues, ThuongHieu } from "./types";

const FILTER_W = 250;

const EMPTY_FORM: NhomSanPhamFormValues = {
  ten_nhom: "",
  thuong_hieu: "",
  san_pham_ids: [],
};

function validate(
  form: NhomSanPhamFormValues,
): Partial<Record<keyof NhomSanPhamFormValues, string>> {
  const errors: Partial<Record<keyof NhomSanPhamFormValues, string>> = {};
  if (!form.ten_nhom.trim()) errors.ten_nhom = "Tên nhóm sản phẩm là bắt buộc";
  if (!form.thuong_hieu) errors.thuong_hieu = "Vui lòng chọn thương hiệu";
  if (form.san_pham_ids.length === 0)
    errors.san_pham_ids = "Vui lòng chọn ít nhất một sản phẩm";
  return errors;
}

export default function NhomSanPhamPage() {
  const c = useCrudResource<NhomSanPham, NhomSanPhamFormValues>({
    resource: RESOURCES.nhomSanPham,
    entityLabel: "nhóm sản phẩm",
    emptyForm: EMPTY_FORM,
    toForm: (item) => ({
      ten_nhom: item.ten_nhom,
      thuong_hieu: item.thuong_hieu,
      san_pham_ids: item.san_pham_ids.map(String),
    }),
    toPayload: (form) => ({
      ten_nhom: form.ten_nhom,
      thuong_hieu: form.thuong_hieu as ThuongHieu,
      san_pham_ids: form.san_pham_ids.map(Number),
    }),
    validate,
    nameOfForm: (f) => f.ten_nhom,
    nameOfItem: (i) => i.ten_nhom,
    searchFields: (i) => [i.ten_nhom],
  });

  const setForm = c.setForm;

  const [searchTenNhom, setSearchTenNhom] = useState("");
  const debouncedSearchTenNhom = useDebounce(searchTenNhom, 300);
  const [searchSanPham, setSearchSanPham] = useState("");
  const debouncedSearchSanPham = useDebounce(searchSanPham, 300);
  const [filterThuongHieu, setFilterThuongHieu] = useState<string | null>(null);

  const { data: sanPhamList = [] } = useQuery({
    queryKey: RESOURCES.sanPham.key,
    queryFn: () => api.get<SanPham[]>(RESOURCES.sanPham.endpoint),
  });

  // Chỉ liệt kê SP là *sản phẩm chính* của thương hiệu đã chọn. Cờ SP chính
  // độc lập với thuong_hieu gốc của SP (xem useReportMasterData), nên không lọc
  // theo sp.thuong_hieu. Vẫn giữ lại các SP đã được chọn sẵn (lúc sửa nhóm cũ)
  // dù hiện không còn là SP chính, để không mất nhãn/lựa chọn.
  const sanPhamOptions = useMemo(() => {
    if (!c.form.thuong_hieu) return [];
    const selected = new Set(c.form.san_pham_ids);
    const isMain = (sp: SanPham) =>
      c.form.thuong_hieu === "Weilaiya"
        ? sp.la_san_pham_chinh_weilaiya
        : sp.la_san_pham_chinh_elvawell;
    return sanPhamList
      .filter((sp) => isMain(sp) || selected.has(String(sp.id)))
      .map((sp) => ({
        value: String(sp.id),
        label: `${sp.ma_san_pham} – ${sp.ten_san_pham}`,
      }));
  }, [sanPhamList, c.form.thuong_hieu, c.form.san_pham_ids]);

  const sanPhamMap = useMemo(
    () => new Map(sanPhamList.map((sp) => [sp.id, sp])),
    [sanPhamList],
  );

  const finalFiltered = useMemo(() => {
    let result = c.items;
    if (debouncedSearchTenNhom.trim()) {
      const q = normalizeSearch(debouncedSearchTenNhom.trim());
      result = result.filter((item) =>
        normalizeSearch(item.ten_nhom).includes(q),
      );
    }
    if (filterThuongHieu) {
      result = result.filter((item) => item.thuong_hieu === filterThuongHieu);
    }
    if (debouncedSearchSanPham.trim()) {
      const q = normalizeSearch(debouncedSearchSanPham.trim());
      result = result.filter((item) =>
        item.san_pham_ids.some((spId) => {
          const sp = sanPhamMap.get(spId);
          if (!sp) return false;
          return (
            normalizeSearch(sp.ma_san_pham).includes(q) ||
            normalizeSearch(sp.ten_san_pham).includes(q)
          );
        }),
      );
    }
    return result;
  }, [
    c.items,
    debouncedSearchTenNhom,
    filterThuongHieu,
    debouncedSearchSanPham,
    sanPhamMap,
  ]);

  const isFiltering =
    !!searchTenNhom.trim() || !!filterThuongHieu || !!searchSanPham.trim();

  function clearFilters() {
    setSearchTenNhom("");
    setSearchSanPham("");
    setFilterThuongHieu(null);
  }

  const table = (
    <Table {...mantineTableProps}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th scope="col">Tên nhóm sản phẩm</Table.Th>
          <Table.Th scope="col" style={{ width: 120 }}>
            Thương hiệu
          </Table.Th>
          <Table.Th scope="col">Sản phẩm</Table.Th>
          <Table.Th scope="col" style={{ textAlign: "center", width: 100 }}>
            Thao tác
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {finalFiltered.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="xs" fw={500}>
                {item.ten_nhom}
              </Text>
            </Table.Td>
            <Table.Td>
              <Badge
                color={brandColor(item.thuong_hieu)}
                variant="light"
                size="sm"
              >
                {item.thuong_hieu}
              </Badge>
            </Table.Td>
            <Table.Td>
              {item.san_pham_ids.length === 0 ? (
                <Text size="xs" c="dimmed">
                  Chưa có sản phẩm
                </Text>
              ) : (
                item.san_pham_ids.map((spId) => {
                  const sp = sanPhamMap.get(spId);
                  return (
                    <Text key={spId} size="xs">
                      {sp
                        ? `• ${sp.ma_san_pham} - ${sp.ten_san_pham}`
                        : `• #${spId}`}
                    </Text>
                  );
                })
              )}
            </Table.Td>
            <Table.Td style={{ textAlign: "center" }}>
              <Group gap={6} justify="center" wrap="nowrap">
                <Tooltip label="Sửa" withArrow>
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={() => c.openEdit(item)}
                    aria-label={`Sửa nhóm ${item.ten_nhom}`}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Xóa" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => c.setDeleteTarget(item)}
                    aria-label={`Xoá nhóm ${item.ten_nhom}`}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  const extraFilters = (
    <>
      <TextInput
        placeholder="Tên nhóm sản phẩm..."
        aria-label="Tìm theo tên nhóm sản phẩm"
        size="xs"
        value={searchTenNhom}
        onChange={(e) => setSearchTenNhom(e.currentTarget.value)}
        leftSection={<IconSearch size={12} />}
        rightSection={
          searchTenNhom ? (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setSearchTenNhom("")}
              aria-label="Xoá tìm kiếm tên nhóm"
            >
              <IconX size={12} />
            </ActionIcon>
          ) : null
        }
        style={{ width: FILTER_W }}
      />
      <TextInput
        placeholder="Mã, tên sản phẩm..."
        aria-label="Tìm theo mã, tên sản phẩm"
        size="xs"
        value={searchSanPham}
        onChange={(e) => setSearchSanPham(e.currentTarget.value)}
        leftSection={<IconSearch size={12} />}
        rightSection={
          searchSanPham ? (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setSearchSanPham("")}
              aria-label="Xoá tìm kiếm sản phẩm"
            >
              <IconX size={12} />
            </ActionIcon>
          ) : null
        }
        style={{ width: FILTER_W }}
      />
      <Select
        placeholder="Thương hiệu"
        aria-label="Lọc theo thương hiệu"
        size="xs"
        data={THUONG_HIEU_OPTIONS}
        value={filterThuongHieu}
        onChange={setFilterThuongHieu}
        clearable
        style={{ width: FILTER_W }}
      />
      {isFiltering && (
        <Button size="xs" variant="subtle" color="red" onClick={clearFilters}>
          Xoá bộ lọc
        </Button>
      )}
    </>
  );

  return (
    <CrudShell
      title="Danh sách nhóm sản phẩm"
      addLabel="Thêm nhóm"
      onAdd={c.openCreate}
      search=""
      onSearchChange={() => {}}
      searchPlaceholder=""
      hideSearch
      extraFilters={extraFilters}
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={finalFiltered.length === 0}
      emptyText={
        isFiltering
          ? "Không tìm thấy nhóm sản phẩm phù hợp"
          : "Chưa có nhóm sản phẩm nào"
      }
      totalCount={c.items.length}
      filteredCount={finalFiltered.length}
      table={table}
    >
      <FormModal
        opened={c.modalOpen}
        isEdit={!!c.editItem}
        entityLabel="nhóm sản phẩm"
        onClose={c.closeModal}
        onSubmit={c.handleSave}
        isSaving={c.isSaving}
      >
        <TextInput
          label="Tên nhóm sản phẩm"
          placeholder="VD: Nhóm dưỡng da, Nhóm làm sạch..."
          required
          value={c.form.ten_nhom}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setForm((f) => ({ ...f, ten_nhom: v }));
          }}
          error={c.errors.ten_nhom}
        />
        <Select
          label="Thương hiệu"
          placeholder="Chọn thương hiệu"
          required
          data={THUONG_HIEU_OPTIONS}
          value={c.form.thuong_hieu || null}
          onChange={(val) =>
            setForm((f) => ({
              ...f,
              thuong_hieu: (val as ThuongHieu) ?? "",
              san_pham_ids: [],
            }))
          }
          error={c.errors.thuong_hieu}
        />
        <MultiSelect
          label="Sản phẩm"
          placeholder={
            c.form.thuong_hieu
              ? "Chọn sản phẩm trong nhóm..."
              : "Vui lòng chọn thương hiệu trước"
          }
          required
          disabled={!c.form.thuong_hieu}
          data={sanPhamOptions}
          value={c.form.san_pham_ids}
          onChange={(val) => setForm((f) => ({ ...f, san_pham_ids: val }))}
          searchable
          clearable
          hidePickedOptions
          error={c.errors.san_pham_ids}
          description={
            c.form.san_pham_ids.length > 0
              ? `Đã chọn ${c.form.san_pham_ids.length} sản phẩm`
              : undefined
          }
        />
      </FormModal>

      <DeleteConfirmModal
        opened={!!c.deleteTarget}
        entityLabel="nhóm sản phẩm"
        name={c.deleteTarget?.ten_nhom}
        onClose={() => c.setDeleteTarget(null)}
        onConfirm={c.confirmDelete}
        isDeleting={c.isDeleting}
      />
    </CrudShell>
  );
}
