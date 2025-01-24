import React from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { useState, } from "react";
import Filters from "~/frontend/analytics/sectors/sections/Filters";
import DisasterSummary from "~/frontend/analytics/sectors/sections/DisasterSummary";
import DamageInventory from "~/frontend/analytics/sectors/sections/DamageInventory";
import ImpactBySector from "~/frontend/analytics/sectors/sections/ImpactBySector";
import ImpactOnSectorsByLocation from "~/frontend/analytics/sectors/sections/ImpactOnSectorsByLocation";
import DamagingEvents from "~/frontend/analytics/sectors/sections/DamagingEvents";

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

  const [filters, setFilters] = useState<{
    sectorId: string | null;
    subSectorId: string | null;
    disasterEventId: string | null;
    dateRange: string | null;
  } | null>(null);

  const handleApplyFilters = (filters: {
    sectorId: string | null;
    subSectorId: string | null;
    disasterEventId: string | null;
    dateRange: string | null;
  }) => {
    console.log("Filters applied:", filters); // Log filters to the terminal
    setFilters(filters); // Update the state with the applied filters
  };

  const handleClearFilters = () => {
    console.log("Filters cleared"); // Log the clearing action
    setFilters(null); // Reset the filters to null
  };

  const handleAdvancedSearch = () => {
    console.log("Open advanced search modal or navigate to advanced search page");
  };

  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div className="sectors-page">
      {/* Filters Component */}
      <Filters
          onApplyFilters={handleApplyFilters}
          onAdvancedSearch={handleAdvancedSearch}
          onClearFilters={handleClearFilters}
        />

        {/* Debugging Section */}
        {filters ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <strong style={{ color: "#004f91" }}>Filters Applied:</strong>
            <pre style={{ margin: "0.5rem 0", color: "#333" }}>
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
        ) : (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "14px",
              color: "#999",
            }}
          >
            <em>No filters applied yet.</em>
          </div>
        )}

      {/* Disaster Summary Section */}
      <DisasterSummary filters={filters}/>

      {/* Damage Inventory Section */}
      <DamageInventory />

      {/* Impact by Sector Section */}
      <ImpactBySector />

      {/* Impact on Sectors by Location Section */}
      {/*<ImpactOnSectorsByLocation />*/}

      {/* Damaging Events Section */}
      <DamagingEvents />
      

      {/* Placeholder for Under Construction */}
      {/* Work In Progress Message */}
      <div className="construction-message" style={{ marginTop: "2rem", padding: "1.6rem", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #ddd" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "1rem", fontWeight: "600", color: "#333" }}>
          🚧 Work In Progress
        </h3>
        <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
          The remaining sections of this dashboard, including:
        </p>
        <ul style={{ marginTop: "1rem", marginBottom: "1rem", paddingLeft: "1.5rem", fontSize: "1.4rem", lineHeight: "1.6", color: "#555" }}>
          <li>Impact on Sectors by Location</li>
        </ul>
        <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
          are still under construction. Please stay tuned for future updates!
        </p>
      </div>
      </div>
    </MainContainer>
  );
}
