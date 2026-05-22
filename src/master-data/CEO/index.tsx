import CrudShell from "@/components/crud/CrudShell";
import DeleteConfirmModal from "@/components/crud/DeleteConfirmModal";
import FormModal from "@/components/crud/FormModal";
import { NHAN_VIEN_OPTIONS, nhanVienColor } from "@/domain/constants";
import { useCrudResource } from "@/hooks/useCrudResource";
import { useDebounce } from "@/hooks/useDebounce";
import { RESOURCES } from "@/lib/queryKeys";
import { normalizeSearch } from "@/utils/search";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Select,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { CEO, CEOFormValues, NhanVienChamSoc } from "./types";

const FILTER_W = 220;

const EMPTY_FORM: CEOFormValues = {
  ma_ceo: "",
  ten_ceo: "",
  ceo_cap_tren_id: null,
  nhan_vien_cham_soc: "",
};

function validate(
  form: CEOFormValues,
): Partial<Record<keyof CEOFormValues, string>> {
  const errors: Partial<Record<keyof CEOFormValues, string>> = {};
  if (!form.ma_ceo.trim()) errors.ma_ceo = "Mã CEO là bắt buộc";
  if (!form.ten_ceo.trim()) errors.ten_ceo = "Tên CEO là bắt buộc";
  if (!form.nhan_vien_cham_soc)
    errors.nhan_vien_cham_soc = "Vui lòng chọn nhân viên chăm sóc";
  return errors;
}

interface TreeNode {
  item: CEO;
  children: TreeNode[];
}

function buildTree(items: CEO[]): TreeNode[] {
  const byParent = new Map<number | null, CEO[]>();
  for (const item of items) {
    const key = item.ceo_cap_tren_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  function buildNodes(parentId: number | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((item) => ({
      item,
      children: buildNodes(item.id),
    }));
  }
  return buildNodes(null);
}

function filterTree(
  nodes: TreeNode[],
  predicate: (item: CEO) => boolean,
): TreeNode[] {
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const filteredChildren = filterTree(node.children, predicate);
    if (predicate(node.item) || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren });
    }
    return acc;
  }, []);
}

interface TreeItemProps {
  node: TreeNode;
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (item: CEO) => void;
  onDelete: (item: CEO) => void;
  matchPredicate?: (item: CEO) => boolean;
}

function TreeItem({
  node,
  collapsed,
  onToggle,
  onEdit,
  onDelete,
  matchPredicate,
}: TreeItemProps) {
  const [hovered, setHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.item.id);
  const descendantCount = node.children.length;
  const isMatch = !!matchPredicate?.(node.item);

  return (
    <Box>
      <Group
        px={8}
        py={7}
        wrap="nowrap"
        gap={6}
        onClick={hasChildren ? () => onToggle(node.item.id) : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 6,
          background: isMatch
            ? hovered
              ? "var(--mantine-color-yellow-1)"
              : "var(--mantine-color-yellow-0)"
            : hovered
              ? "var(--mantine-color-gray-0)"
              : "transparent",
          transition: "background 0.1s",
          cursor: hasChildren ? "pointer" : "default",
        }}
      >
        {hasChildren ? (
          <Box
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              width: 22,
            }}
          >
            {isCollapsed ? (
              <IconChevronRight size={12} />
            ) : (
              <IconChevronDown size={12} />
            )}
          </Box>
        ) : (
          <Box w={22} style={{ flexShrink: 0 }} />
        )}
        <Text
          size="sm"
          ff="monospace"
          fw={hasChildren ? 700 : 500}
          style={{ flexShrink: 0 }}
        >
          {node.item.ma_ceo}
        </Text>
        <Text
          size="sm"
          c={hasChildren ? "dark" : "dimmed"}
          style={{
            flexShrink: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.item.ten_ceo}
        </Text>
        {descendantCount > 0 && (
          <Badge
            variant="light"
            color="blue"
            size="sm"
            radius="sm"
            style={{ flexShrink: 0 }}
          >
            {descendantCount}
          </Badge>
        )}
        <Badge
          color={nhanVienColor(node.item.nhan_vien_cham_soc)}
          variant="light"
          size="xs"
          style={{ flexShrink: 0 }}
        >
          {node.item.nhan_vien_cham_soc}
        </Badge>

        <Group
          gap={2}
          wrap="nowrap"
          style={{ flexShrink: 0, marginLeft: "auto" }}
        >
          <Tooltip label="Sửa" withArrow>
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node.item);
              }}
              aria-label={`Sửa CEO ${node.item.ma_ceo}`}
            >
              <IconPencil size={13} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Xóa" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.item);
              }}
              aria-label={`Xoá CEO ${node.item.ma_ceo}`}
            >
              <IconTrash size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {hasChildren && !isCollapsed && (
        <Box
          ml={20}
          pl={10}
          style={{
            borderLeft: "1.5px solid var(--mantine-color-gray-3)",
          }}
        >
          {node.children.map((child) => (
            <TreeItem
              key={child.item.id}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              matchPredicate={matchPredicate}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function CEOPage() {
  const c = useCrudResource<CEO, CEOFormValues>({
    resource: RESOURCES.ceo,
    entityLabel: "CEO",
    emptyForm: EMPTY_FORM,
    toForm: (item) => ({
      ma_ceo: item.ma_ceo,
      ten_ceo: item.ten_ceo,
      ceo_cap_tren_id: item.ceo_cap_tren_id
        ? String(item.ceo_cap_tren_id)
        : null,
      nhan_vien_cham_soc: item.nhan_vien_cham_soc,
    }),
    toPayload: (form) => ({
      ...form,
      ceo_cap_tren_id: form.ceo_cap_tren_id
        ? Number(form.ceo_cap_tren_id)
        : null,
    }),
    validate,
    nameOfForm: (f) => f.ten_ceo,
    nameOfItem: (i) => i.ten_ceo,
    searchFields: (i) => [i.ma_ceo, i.ten_ceo, i.nhan_vien_cham_soc],
  });

  const setForm = c.setForm;
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [searchCEO, setSearchCEO] = useState("");
  const debouncedSearchCEO = useDebounce(searchCEO, 300);
  const [filterNhanVien, setFilterNhanVien] = useState<string | null>(null);

  const treeNodes = useMemo(() => buildTree(c.items), [c.items]);

  const isFiltering = !!searchCEO.trim() || !!filterNhanVien;

  const predicate = useMemo(
    () => (item: CEO) => {
      if (debouncedSearchCEO.trim()) {
        const q = normalizeSearch(debouncedSearchCEO.trim());
        if (
          !normalizeSearch(item.ma_ceo).includes(q) &&
          !normalizeSearch(item.ten_ceo).includes(q)
        )
          return false;
      }
      if (filterNhanVien && item.nhan_vien_cham_soc !== filterNhanVien)
        return false;
      return true;
    },
    [debouncedSearchCEO, filterNhanVien],
  );

  const visibleNodes = useMemo(
    () => (isFiltering ? filterTree(treeNodes, predicate) : treeNodes),
    [isFiltering, treeNodes, predicate],
  );

  const matchCount = useMemo(
    () => (isFiltering ? c.items.filter(predicate).length : c.items.length),
    [isFiltering, c.items, predicate],
  );

  // Ổn định reference để dùng làm dep cho cây bên dưới (khi lọc thì bung hết).
  const effectiveCollapsed = useMemo(
    () => (isFiltering ? new Set<number>() : collapsed),
    [isFiltering, collapsed],
  );

  function clearFilters() {
    setSearchCEO("");
    setFilterNhanVien(null);
  }

  function toggleCollapse(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const capTrenOptions = c.items
    .filter((item) => item.id !== c.editItem?.id)
    .map((item) => ({
      value: String(item.id),
      label: `${item.ma_ceo} – ${item.ten_ceo}`,
    }));

  const extraFilters = (
    <>
      <TextInput
        placeholder="Mã, tên CEO..."
        aria-label="Tìm theo mã, tên CEO"
        size="xs"
        value={searchCEO}
        onChange={(e) => setSearchCEO(e.currentTarget.value)}
        leftSection={<IconSearch size={12} />}
        rightSection={
          searchCEO ? (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setSearchCEO("")}
              aria-label="Xoá tìm kiếm"
            >
              <IconX size={12} />
            </ActionIcon>
          ) : null
        }
        style={{ width: FILTER_W }}
      />
      <Select
        placeholder="Nhân viên chăm sóc"
        aria-label="Lọc theo nhân viên chăm sóc"
        size="xs"
        data={NHAN_VIEN_OPTIONS}
        value={filterNhanVien}
        onChange={setFilterNhanVien}
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

  // Memo hoá cây CEO: state form ở useCrudResource nằm cấp trang, nên mỗi lần
  // gõ trong FormModal cả trang re-render. Giữ nguyên element này theo dữ liệu
  // hiển thị để React bỏ qua reconcile cả cây — tránh giật khi nhập liệu.
  // toggleCollapse/openEdit/setDeleteTarget ổn định về hành vi nên không đưa vào deps.
  const tree = useMemo(
    () => (
      <Paper withBorder p={6} radius="md">
        {visibleNodes.map((node) => (
          <TreeItem
            key={node.item.id}
            node={node}
            collapsed={effectiveCollapsed}
            onToggle={toggleCollapse}
            onEdit={c.openEdit}
            onDelete={c.setDeleteTarget}
            matchPredicate={isFiltering ? predicate : undefined}
          />
        ))}
      </Paper>
    ),
    [visibleNodes, effectiveCollapsed, isFiltering, predicate],
  );

  return (
    <CrudShell
      title="Danh sách CEO"
      addLabel="Thêm CEO"
      onAdd={c.openCreate}
      search=""
      onSearchChange={() => {}}
      searchPlaceholder=""
      hideSearch
      extraFilters={extraFilters}
      error={c.error}
      isLoading={c.isLoading}
      isEmpty={visibleNodes.length === 0}
      emptyText={isFiltering ? "Không tìm thấy CEO phù hợp" : "Chưa có CEO nào"}
      totalCount={c.items.length}
      filteredCount={matchCount}
      table={tree}
    >
      <FormModal
        opened={c.modalOpen}
        isEdit={!!c.editItem}
        entityLabel="CEO"
        onClose={c.closeModal}
        onSubmit={c.handleSave}
        isSaving={c.isSaving}
      >
        <TextInput
          label="Mã CEO"
          placeholder="VD: CEO-001"
          required
          value={c.form.ma_ceo}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setForm((f) => ({ ...f, ma_ceo: v }));
          }}
          error={c.errors.ma_ceo}
        />
        <TextInput
          label="Tên CEO"
          placeholder="Nhập tên CEO"
          required
          value={c.form.ten_ceo}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setForm((f) => ({ ...f, ten_ceo: v }));
          }}
          error={c.errors.ten_ceo}
        />
        <Select
          label="CEO cấp trên"
          placeholder="Không có (tùy chọn)"
          clearable
          data={capTrenOptions}
          value={c.form.ceo_cap_tren_id}
          onChange={(val) => setForm((f) => ({ ...f, ceo_cap_tren_id: val }))}
          searchable
        />
        <Select
          label="Nhân viên chăm sóc"
          placeholder="Chọn nhân viên"
          required
          data={NHAN_VIEN_OPTIONS}
          value={c.form.nhan_vien_cham_soc || null}
          onChange={(val) =>
            setForm((f) => ({
              ...f,
              nhan_vien_cham_soc: (val as NhanVienChamSoc) ?? "",
            }))
          }
          error={c.errors.nhan_vien_cham_soc}
        />
      </FormModal>

      <DeleteConfirmModal
        opened={!!c.deleteTarget}
        entityLabel="CEO"
        name={c.deleteTarget?.ten_ceo}
        code={c.deleteTarget?.ma_ceo}
        onClose={() => c.setDeleteTarget(null)}
        onConfirm={c.confirmDelete}
        isDeleting={c.isDeleting}
      />
    </CrudShell>
  );
}
