import { Field } from "~/frontend/form";

interface DateRangePickerProps {
  fromDate?: string;
  toDate?: string;
  fromLabel?: string;
  toLabel?: string;
  fromId?: string;
  toId?: string;
}

/**
 * A reusable date range picker component with from/to date inputs
 * Ensures proper date formatting and validation
 */
export function DateRangePicker({
  fromDate = "",
  toDate = "",
  fromLabel = "From",
  toLabel = "To",
  fromId = "fromDate",
  toId = "toDate"
}: DateRangePickerProps) {
  return (
    <div className="mg-grid mg-grid__col-2">
      <div className="dts-form-component">
        <Field label={fromLabel}>
          <input
            type="date"
            name={fromId}
            id={fromId}
            defaultValue={fromDate}
            max={toDate || undefined}
            aria-label={fromLabel}
          />
        </Field>
      </div>
      <div className="dts-form-component">
        <Field label={toLabel}>
          <input
            type="date"
            name={toId}
            id={toId}
            defaultValue={toDate}
            min={fromDate || undefined}
            aria-label={toLabel}
          />
        </Field>
      </div>
    </div>
  );
}
