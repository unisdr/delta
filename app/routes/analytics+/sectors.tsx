import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoaderData } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";
import ImpactByHazard from "~/frontend/analytics/sectors/sections/ImpactByHazard";
import ImpactMap from "~/frontend/analytics/sectors/sections/ImpactMap";
import EffectDetails from "~/frontend/analytics/sectors/sections/EffectDetails";
import MostDamagingEvents from "~/frontend/analytics/sectors/sections/MostDamagingEvents";

// import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
// import { Damage, Loss, Disruption } from '~/routes/api+/analytics+/export-sector-analysis';


// Types
// interface Sector {
//   id: number;
//   sectorname: string;
//   subsectors?: Sector[];
// }

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
  // Get currency from environment variable
  const currency = process.env.CURRENCY_CODES?.split(',')[0] || 'PHP';

  return {
    currency,
    loaderArgs
  };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};

// React component for Sectors Analysis page
function SectorsAnalysisContent() {
  const { currency } = useLoaderData<typeof loader>();

  // State declarations
  // const [isExportingExcel, setIsExportingExcel] = useState(false);
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

  // Function to export Excel data
  /*const handleExportToExcel = async () => {
    console.log("Start export to Excel");
    if (!filters) return;
    console.log('handleExportToExcel triggered');
    try {
      setIsExportingExcel(true);
      // const response = await fetch(new URL(`/api/analytics/export?${new URLSearchParams(filters as any)}`, window.location.origin));
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters ?? {}).filter(([_, v]) => v !== null && v !== "null")
      );

      const queryString = new URLSearchParams(cleanedFilters as any).toString();
      const response = await fetch(`/api/analytics/export-sector-analysis?${queryString}`);

      const data = await response.json().catch(() => ({
        error: 'Failed to parse server response'
      }));

      if (!response.ok || data.error) {
        throw new Error(data.error || `Export failed with status ${response.status}`);
      }

      // Create workbook
      const wb = xlsxUtils.book_new();

      // Add title and metadata sheet
      const metadataWs = xlsxUtils.aoa_to_sheet([
        ['Sectors Analysis Data'],
        [''],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Applied Filters:'],
        ['Sector:', data.filterNames.sectorName || 'All'],
        ['Sub Sector:', data.filterNames.subSectorName || 'All'],
        ['Hazard Type:', data.filterNames.hazardTypeName || 'All'],
        ['Hazard Cluster:', data.filterNames.hazardClusterName || 'All'],
        ['Specific Hazard:', data.filterNames.specificHazardName || 'All'],
        ['Geographic Level:', data.filterNames.geographicLevelName || 'All'],
        ['From:', data.filters.fromDate || 'All'],
        ['To:', data.filters.toDate || 'All'],
        ['Disaster Event:', data.filterNames.disasterEventName || 'All'],
      ]);
      xlsxUtils.book_append_sheet(wb, metadataWs, 'Overview');

      // Add sector impact data
      if (data.sectorImpact) {
        const { eventCount, totalDamage, totalLoss, eventsOverTime, damageOverTime, lossOverTime } = data.sectorImpact;

        const sectorImpactData = [];

        // Section: Summary
        sectorImpactData.push({
          Section: "Summary",
          "Number of Events": "",
          "Total Damages": "",
          "Total Losses": ""
        });
        sectorImpactData.push({
          Section: "",
          "Number of Events": eventCount,
          "Total Damages": totalDamage,
          "Total Losses": totalLoss
        });

        // Section: Yearly Breakdown
        sectorImpactData.push({
          Section: "Yearly Breakdown",
          "Number of Events": "",
          "Total Damages": "",
          "Total Losses": ""
        });

        Object.entries(eventsOverTime ?? {}).forEach(([year, events]) => {
          sectorImpactData.push({
            Section: year,
            "Number of Events": events,
            "Total Damages": damageOverTime?.[year] ?? "0",
            "Total Losses": lossOverTime?.[year] ?? "0"
          });
        });

        const sectorImpactWs = xlsxUtils.json_to_sheet(sectorImpactData);
        xlsxUtils.book_append_sheet(wb, sectorImpactWs, "Sector Impact");
      }




      // Add hazard impact data
      if (data.hazardImpact) {
        const { eventsCount = [], damages = [], losses = [] } = data.hazardImpact;

        const sheetData = [];

        // Transformer for eventsCount
        const transformEvent = (item: any) => ({
          "Hazard Type": item.hazardName,
          "Number of Events": item.value,
          Percentage: item.percentage
        });

        // Transformer for damages/losses
        const transformImpact = (item: any) => ({
          "Hazard Type": item.hazardName,
          Value: item.value,
          Percentage: item.percentage
        });

        if (eventsCount.length > 0) {
          sheetData.push({ Section: "Events Count" });
          sheetData.push(...eventsCount.map(transformEvent));
          sheetData.push({});
        }

        if (damages.length > 0) {
          sheetData.push({ Section: "Damages" });
          sheetData.push(...damages.map(transformImpact));
          sheetData.push({});
        }

        if (losses.length > 0) {
          sheetData.push({ Section: "Losses" });
          sheetData.push(...losses.map(transformImpact));
          sheetData.push({});
        }

        if (sheetData.length > 0) {
          const hazardImpactWs = xlsxUtils.json_to_sheet(sheetData);
          xlsxUtils.book_append_sheet(wb, hazardImpactWs, "Hazard Impact");
        }
      }


      // Add geographic impact data
      if (data.geographicImpact?.success && data.geographicImpact.divisions?.length > 0) {
        const geoRows = data.geographicImpact.divisions.map((div: any) => {
          const val = data.geographicImpact.values?.[div.id];
          return {
            "Name of region": div.name?.en || `Division ${div.id}`,
            "Total Damages": val?.dataAvailability === 'no_data' ? 'No data' : val?.totalDamage ?? 'No data',
            "Total Losses": val?.dataAvailability === 'no_data' ? 'No data' : val?.totalLoss ?? 'No data',
          };
        });

        if (geoRows.length > 0) {
          const geoWs = xlsxUtils.json_to_sheet(geoRows);
          xlsxUtils.book_append_sheet(wb, geoWs, 'Geographic Impact');
        }
      }

      // Add effect details
      const damages = data?.effectDetails?.damages ?? [];
      const losses = data?.effectDetails?.losses ?? [];
      const disruptions = data?.effectDetails?.disruptions ?? [];

      // Create a mapping of sector IDs to names
      const sectorIdToName = new Map<number, string>(
        Object.entries(data.sectorIdToNameMap || {}).map(([k, v]) => [parseInt(k), v as string])
      );

      // Determine the selected subsector or fallback to sector
      const selectedSectorId = parseInt(data.filters.sectorId || '0');
      const selectedSubSectorId = data.filters.subSectorId ? parseInt(data.filters.subSectorId) : null;

      const allSectorIds = new Set<number>();
      (damages as Damage[]).forEach((d: Damage) => allSectorIds.add(d.sectorId));
      (losses as Loss[]).forEach((l: Loss) => allSectorIds.add(l.sectorId));
      (disruptions as Disruption[]).forEach((d: Disruption) => allSectorIds.add(d.sectorId));

      // Filter records to match the selected subsector only
      let allowedSectorIds: number[] = [];

      if (selectedSubSectorId) {
        // Include the selected subsector + any children (e.g., 1101001, 1101002)
        allowedSectorIds = Array.from(allSectorIds).filter(
          id => id === selectedSubSectorId || Math.floor(id / 10) === selectedSubSectorId
        );
      } else {
        // Sector selected → include all its subsectors (e.g., 1101, 1102)
        allowedSectorIds = Array.from(allSectorIds).filter(
          id => Math.floor(id / 100) === selectedSectorId
        );
      }

      const filteredDamages = (damages as Damage[]).filter(d => allowedSectorIds.includes(d.sectorId));
      const filteredLosses = (losses as Loss[]).filter(l => allowedSectorIds.includes(l.sectorId));
      const filteredDisruptions = (disruptions as Disruption[]).filter(d => allowedSectorIds.includes(d.sectorId));

      // Process damages with specific columns
      const damageData = (filteredDamages as Damage[]).map((damage: Damage) => ({
        Asset: damage.assetName,
        'Total Damage': damage.totalDamageAmount,
        'Repair/Replacement': damage.totalRepairReplacement,
        'Recovery': damage.totalRecovery,
        // Sector: damage.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(damage.sectorId) || damage.sectorId.toString()
      }));

      // Process losses with specific columns
      const lossData = (filteredLosses as Loss[]).map((loss: Loss) => ({
        Type: loss.type,
        Description: loss.description,
        'Public Cost': loss.publicCostTotal,
        'Private Cost': loss.privateCostTotal,
        // Sector: loss.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(loss.sectorId) || loss.sectorId.toString()
      }));

      // Process disruptions with specific columns
      const disruptionData = (filteredDisruptions as Disruption[]).map((disruption: Disruption) => ({
        Description: disruption.comment,
        'Duration (Days)': disruption.durationDays,
        'Users Affected': disruption.usersAffected,
        'People Affected': disruption.peopleAffected,
        'Response Cost': disruption.responseCost,
        // Sector: disruption.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(disruption.sectorId) || disruption.sectorId.toString()
      }));

      // Create worksheet with formatted data
      const effectDetailsData = [];

      // Damages section
      effectDetailsData.push(["Damages"]);
      effectDetailsData.push(["Asset", "Total Damage", "Repair/Replacement", "Recovery", "Sector"]);
      if (damageData.length > 0) {
        damageData.forEach(row => {
          effectDetailsData.push([
            row.Asset,
            row["Total Damage"],
            row["Repair/Replacement"],
            row.Recovery,
            row.Sector
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Losses section
      effectDetailsData.push(["Losses"]);
      effectDetailsData.push(["Sector", "Type", "Description", "Public Cost", "Private Cost"]);
      if (lossData.length > 0) {
        lossData.forEach(row => {
          effectDetailsData.push([
            row.Sector,
            row.Type,
            row.Description,
            row["Public Cost"],
            row["Private Cost"]
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Disruptions section
      effectDetailsData.push(["Disruptions"]);
      effectDetailsData.push(["Sector", "Description", "Duration (Days)", "Users Affected", "People Affected", "Response Cost"]);
      if (disruptionData.length > 0) {
        disruptionData.forEach(row => {
          effectDetailsData.push([
            row.Sector,
            row.Description,
            row["Duration (Days)"],
            row["Users Affected"],
            row["People Affected"],
            row["Response Cost"]
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Create worksheet with header option
      const effectDetailsWs = xlsxUtils.json_to_sheet(effectDetailsData, { skipHeader: true });
      xlsxUtils.book_append_sheet(wb, effectDetailsWs, 'Effect Details');


      // Add most damaging events
      if (data.mostDamagingEvents?.events?.length > 0) {
        const transformedEvents = data.mostDamagingEvents.events.map((e: any) => ({
          "Disaster Event Name": e.eventName,
          "Total Damages": e.totalDamages,
          "Total Losses": e.totalLosses,
          Created: e.createdAt?.split("T")[0] ?? ""
        }));

        const eventsWs = xlsxUtils.json_to_sheet(transformedEvents);
        xlsxUtils.book_append_sheet(wb, eventsWs, "Most Damaging Events");
      }

      console.log('Workbook Sheets:', wb.SheetNames);

      // Generate Excel file
      const excelBuffer = xlsxWrite(wb, { bookType: 'xlsx', type: 'array' });

      // Create blob and download
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sectors-analysis-data.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert(error instanceof Error ? error.message : 'Failed to export data. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };*/


  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div className="sectors-page">
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

          {/* Dashboard sections */}
          {filters && (
            <>
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1rem",
                marginBottom: "1rem",
                gap: "1rem"
              }}>
                {/* <button
                  className="mg-button mg-button--small mg-button-primary"
                  onClick={() => console.log("Generate report button clicked")}
                  disabled={isGeneratingReport}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.5rem",
                    opacity: isGeneratingReport ? 0.7 : 1
                  }}
                >
                  <FaFileDownload />
                  {isGeneratingReport ? "Generating Report..." : "Generate Report"}
                </button> */}
                {/* <button
                  className="mg-button mg-button--small mg-button-primary"
                  onClick={handleExportToExcel}
                  disabled={isExportingExcel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isExportingExcel ? 0.7 : 1
                  }}
                >
                  <FaFileDownload />
                  {isExportingExcel ? "Exporting Data..." : "Download Data"}
                </button> */}
              </div>
              <div className="sectors-content" style={{ marginTop: "1rem", maxWidth: "100%", overflow: "hidden" }}>
                {/* Impact on Selected Sector */}
                {filters.sectorId && (
                  <div className="space-y-8">
                    <ImpactOnSector
                      sectorId={filters.sectorId}
                      filters={filters}
                      currency={currency}
                    />
                  </div>
                )}

                {/* Impact by Hazard Section */}
                <ImpactByHazard filters={filters} />

                {/* Impact by Geographic Level */}
                <ImpactMap filters={filters} currency={currency} />

                {/* Effect Details Section */}
                <EffectDetails filters={filters} currency={currency} />

                {/* Most Damaging Events Section */}
                <MostDamagingEvents filters={filters} currency={currency} />
              </div>
            </>
          )}

          {/* Work In Progress Message - Updated list
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
              <li>The most damaging events for sectors</li>
            </ul>
            <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
              are still under construction. Please stay tuned for future updates!
            </p>
          </div> */}

          <p></p>
          <div className="dts-caption mt-4">
            * Data shown is based on published records
          </div>
        </div>
      </div>
    </MainContainer>
  );
}

// Wrapper component that provides QueryClient
export default function SectorsAnalysis() {
  return (
    <QueryClientProvider client={queryClient}>
      <SectorsAnalysisContent />
    </QueryClientProvider>
  );
}
