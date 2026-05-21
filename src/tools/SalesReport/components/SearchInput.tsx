import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

interface Props {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
  ariaLabel?: string;
}

export default function SearchInput({
  placeholder,
  value,
  onChange,
  minWidth = 180,
  ariaLabel,
}: Props) {
  return (
    <TextInput
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="xs"
      leftSection={<IconSearch size={13} />}
      rightSection={
        value ? (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => onChange("")}
            aria-label="Xoá tìm kiếm"
          >
            <IconX size={11} />
          </ActionIcon>
        ) : null
      }
      style={{ minWidth }}
    />
  );
}
