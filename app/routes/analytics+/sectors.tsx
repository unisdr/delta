import React, { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  // Currently, this returns the loaderArgs as is.
  // This will be replaced with actual data fetching logic for the Sectors Analysis page.
  return { loaderArgs };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};

// React component for Sectors Analysis page
export default function SectorsAnalysis() {

  const [isMounted, setIsMounted] = useState(false);

  const [filters, setFilters] = useState<{
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;

  } | null>(null);

  const handleApplyFilters = (newFilters: {
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
  }) => {
    console.log("Filters applied:", newFilters); // Log filters to the terminal
    setFilters(newFilters); // Update the state with the applied filters
  };

  const handleClearFilters = () => {
    console.log("Filters cleared"); // Log the clearing action
    setFilters(null); // Reset the filters to null
  };

  const handleAdvancedSearch = () => {
    console.log("Open advanced search modal or navigate to advanced search page");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render a loader or nothing until the client mounts
    return (
      <div
        style={{
          marginTop: "2rem",
          textAlign: "center",
          color: "#555",
          fontSize: "1.6rem",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div className="sectors-page">
          {/* Filters Component */}
          <Filters
            onApplyFilters={handleApplyFilters}
            onAdvancedSearch={handleAdvancedSearch}
            onClearFilters={handleClearFilters}
          />

          {/* Conditional rendering: Display this message until filters are applied */}
          {!filters && (
            <div
              style={{
                marginTop: "2rem",
                textAlign: "center",
                padding: "2rem",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                color: "#333",
                fontSize: "1.6rem",
                lineHeight: "1.8rem",
              }}
            >
              <h3 style={{ color: "#004f91", fontSize: "2rem", marginBottom: "1rem" }}>
                Welcome to the Sectors Dashboard! 🌟
              </h3>
              <p>Please select and apply filters above to view the analysis.</p>
            </div>
          )}

          {/* Placeholder for dashboard sections: Hide unless filters are applied */}
          {filters && (
            <div style={{ marginTop: "2rem", maxWidth: "100%", overflow: "hidden" }}>
              {/* <p style={{ fontSize: "1.4rem", color: "#555" }}>Dashboard content will be displayed here based on the selected filters.</p> */}

              {/* Dashboard Sections */}
              {filters.sectorId && (
                <ImpactOnSector
                  sectorId={filters.sectorId}
                  filters={filters}
                />
              )}

              {/* Work In Progress Message */}
              <div
                className="construction-message"
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
                <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
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
                  <li>Impact in sectors by hazard type</li>
                  <li>Impact on sectors by Location</li>
                  <li>Effect details in sectors</li>
                  <li>The most damaging events for sectors </li>
                </ul>
                <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
                  are still under construction. Please stay tuned for future updates!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainContainer>
  );
}
