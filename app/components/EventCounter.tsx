import React from "react";

interface EventCounterProps {
  totalEvents: number;
}

export function EventCounter({ totalEvents }: EventCounterProps) {
  return (
    <div className="">
      <p>
        <strong>{totalEvents}</strong> Hazardous events found
      </p>
    </div>
  );
}
