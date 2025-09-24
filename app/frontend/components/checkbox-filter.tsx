interface CheckboxFilterProps {
  id: string;
  label: string;
  checked?: boolean;
}

/**
 * Checkbox filter component for boolean filters
 */
export function CheckboxFilter({
  id,
  label,
  checked = false
}: CheckboxFilterProps) {
  return (
    <div className="dts-form-component dts-checkbox">
      <input
        type="checkbox"
        id={id}
        name={id}
        defaultChecked={checked}
        aria-label={label}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
