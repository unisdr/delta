import { Field } from "~/frontend/form";

interface Option {
  value: string;
  label: string;
}

interface StatusDropdownProps {
  options: Option[];
  selectedValue?: string;
  label: string;
  id: string;
  placeholder?: string;
}

/**
 * Reusable dropdown component for status selections
 */
export function StatusDropdown({
  options,
  selectedValue = "",
  label,
  id,
  placeholder = "Select..."
}: StatusDropdownProps) {
  return (
    <div className="dts-form-component">
      <Field label={label}>
        <select
          id={id}
          name={id}
          defaultValue={selectedValue}
          aria-label={label}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
