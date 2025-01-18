import React from "react";

// app/utils/dynamic-import.ts
export function dynamic(importFn: () => Promise<any>): React.FC {
    return React.lazy(importFn);
  }
  