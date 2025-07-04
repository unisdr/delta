import React from 'react';

interface FieldsetProps {
  legend: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const Fieldset: React.FC<FieldsetProps> = ({
  legend,
  children,
  disabled = false,
}) => {
  return (
    <fieldset
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '16px',
        margin: '0',
      }}
      disabled={disabled}
    >
      <legend>
        {legend}
      </legend>
      {children && (
        <div style={{ marginTop: '0px' }}>
          {children}
        </div>
      )}
    </fieldset>
  );
};