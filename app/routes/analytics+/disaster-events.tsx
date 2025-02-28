import React, { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { Filters } from "~/frontend/analytics/disaster-events/sections/DisasterEventFilters";

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  return json({
    loaderArgs
  });
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Disaster Events Analysis - DTS" },
    { name: "description", content: "Disaster events analysis page under DTS." },
  ];
};

// React component for Disaster Events Analysis page
function DisasterEventsAnalysisContent() {
  // State declarations
  const [filters, setFilters] = useState<{
    disasterEventId: string | null;
  } | null>(null);

  // Event handlers for Filters component
  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleAdvancedSearch = () => {
    // TODO: Implement advanced search functionality
    console.log("Advanced search clicked");
  };

  const handleClearFilters = () => {
    setFilters(null);
  };

  return (
    <MainContainer title="Disaster Events Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div className="disaster-events-page">
          {/* Filters Section */}
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
                textAlign: "justify",
                padding: "2rem",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                color: "#333",
                fontSize: "1.6rem",
                lineHeight: "1.8rem",
              }}
            >
              <h3 style={{
                color: "#004f91",
                fontSize: "2rem",
                marginBottom: "1rem",
                textAlign: "center"
              }}>
                Welcome to the Disaster Events Dashboard! 🌟
              </h3>
              <p style={{ textAlign: "center" }}>
                Please select and apply filters above to view the analysis.
              </p>
            </div>
          )}

          {/* Dashboard sections */}
          {filters && (
            <div className="disaster-events-content" style={{ marginTop: "2rem", maxWidth: "100%", overflow: "hidden" }}>
              {/* TODO: Add dashboard sections here */}

            </div>
          )}
        </div>
      </div>
    </MainContainer>
  );
}

// Wrapper component that provides QueryClient
export default function DisasterEventsAnalysis() {
  return (
    <QueryClientProvider client={queryClient}>
      <DisasterEventsAnalysisContent />
    </QueryClientProvider>
  );
}
