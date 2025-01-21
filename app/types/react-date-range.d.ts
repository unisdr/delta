declare module "react-date-range" {
  import * as React from "react";

  export interface DateRange {
    startDate: Date;
    endDate: Date;
    key: string;
  }

  export interface DateRangePickerProps {
    ranges: DateRange[];
    onChange: (ranges: { [key: string]: DateRange }) => void;
    months?: number;
    direction?: "horizontal" | "vertical";
    showSelectionPreview?: boolean;
    moveRangeOnFirstSelection?: boolean;
    editableDateInputs?: boolean;
    rangeColors?: string[];
    staticRanges?: any[];
    inputRanges?: any[];
    minDate?: Date;
    maxDate?: Date;
    disabledDates?: Date[];
    locale?: any;
  }

  export class DateRangePicker extends React.Component<DateRangePickerProps, any> {}
}
