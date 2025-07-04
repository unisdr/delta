import React from 'react';

interface RadioButtonEvent {
  value: string;
}

interface RadioButtonProps {
  inputId: string;
  name: string;
  value: string;
  onChange: (event: RadioButtonEvent) => void;
  checked: boolean;
  disabled?: boolean;
  label?: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  inputId,
  name,
  value,
  onChange,
  checked,
  disabled = false,
  label,
}) => {
  const handleChange = () => {
    if (!disabled) {
      onChange({ value });
    }
  };

  return (
    <div className="dts-form-component__field--horizontal">
      <input
        type="radio"
        id={inputId}
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="radio-button-input"
      />
      <span>{label}</span>
    </div>
  );
};