import React, { useState } from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import FilterPanel from "~/frontend/analytics/sectors/sections/FilterPanel";
import Filters from "~/components/Filters";
import { sectors } from "~/util/dummyData";


// Define a type for the filter state for better type safety
interface FiltersState {
  sector: number | null;
  subSector: string | null;
  hazard: string;
  disaster: string;
  dateFrom: string;
  dateTo: string;
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  // Currently, this returns the loaderArgs as is.
  // This will be replaced with actual data fetching logic for the disaster events analysis page.
  return { loaderArgs };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Disaster Events Analysis - DTS" },
    { name: "description", content: "Disaster events analysis page under DTS." },
  ];
};

// React component for Disaster Events Analysis page
export default function DisasterEventsAnalysis() {
  const [filters, setFilters] = useState<FiltersState | null>(null);

// Handle applying filters
const handleApplyFilters = (appliedFilters: FiltersState) => {
  setFilters(appliedFilters); // Update the filters state with applied filters
};

const selectedSectorName = filters
    ? sectors.find((sector) => sector.id === filters.sector)?.name || "N/A"
    : "N/A";

  return (
    <MainContainer title="Disaster Events Analysis" headerExtra={<NavSettings />}>
      <div className="sectors-page">
        {/* Filters Component */}
        <Filters onApplyFilters={handleApplyFilters} onClearFilters={function (): void {
          throw new Error("Function not implemented.");
        } } />

        {/* Conditional Rendering for Data Visualizations */}
        {!filters ? (
          <div
            style={{
              marginTop: "2rem",
              padding: "1.6rem",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3
              style={{
                fontSize: "1.8rem",
                marginBottom: "1rem",
                fontWeight: "600",
                color: "#333",
              }}
            >
              🚧 Work In Progress
            </h3>
            <p
              style={{
                fontSize: "1.4rem",
                lineHeight: "1.5",
                color: "#555",
              }}
            >
              The remaining sections of this dashboard, including:
            </p>
            <ul
              style={{
                marginTop: "1rem",
                marginBottom: "1rem",
                paddingLeft: "1.5rem",
                fontSize: "1.4rem",
                lineHeight: "1.6",
                color: "#555",
              }}
            >
              <li>Data Visualizations</li>
              <li>Charts and Tables</li>
              <li>Interactive Insights</li>
            </ul>
            <p
              style={{
                fontSize: "1.4rem",
                lineHeight: "1.5",
                color: "#555",
              }}
            >
              are still under construction. Please stay tuned for future
              updates!
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "2rem" }}>
            <h2>Data Visualizations</h2>
            {/* Display the applied filters for debugging or user feedback */}
            <pre
              style={{
                backgroundColor: "#f9f9f9",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              Filters Applied: {JSON.stringify(filters, null, 2)}
            </pre>

            {/* Placeholder for charts, tables, or other visualizations */}
            <p>
              Showing data for sector <strong>{filters.sector}</strong> in
              sub-sector <strong>{filters.subSector}</strong>.
            </p>
          </div>
        )}
      </div>
    </MainContainer>
  );
}
