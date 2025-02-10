import React from "react";

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">
      <p>{message}</p>
    </div>
  );
}
