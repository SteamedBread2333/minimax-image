import { useFormFieldId } from "./FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  placeholder?: string;
  triggerId?: string;
  "aria-labelledby"?: string;
};

export function FormSelect<T extends string>({
  value,
  onValueChange,
  options,
  disabled,
  placeholder = "请选择",
  triggerId,
  "aria-labelledby": ariaLabelledBy,
}: Props<T>) {
  const fieldId = useFormFieldId();
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as T)} disabled={disabled}>
      <SelectTrigger id={triggerId ?? fieldId} aria-labelledby={ariaLabelledBy}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} title={opt.description}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
