import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export interface EnumOption<Value extends string> {
  value: Value;
  label: string;
}

interface EnumSelectProps<Value extends string> {
  id: string;
  value: Value | undefined;
  options: readonly EnumOption<Value>[];
  onValueChange: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
}

/** A Select over a closed set of values: only a listed option can ever reach `onValueChange`. */
export function EnumSelect<Value extends string>({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  "aria-describedby": describedBy,
}: EnumSelectProps<Value>) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) onValueChange(option.value);
      }}
    >
      <SelectTrigger id={id} aria-describedby={describedBy}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
