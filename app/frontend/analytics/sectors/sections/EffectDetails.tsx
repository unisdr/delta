import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "remix-utils/client-only";
import { formatCurrencyWithCode, formatNumber } from "~/frontend/utils/formatters";
import "~/frontend/styles/analytics/sectors/effect-details.css";
import { useDebounce } from "~/frontend/hooks/useDebounce";

interface Props {
  filters: {
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
  };
  currency: string;
}

interface Sector {
  id: number;
  sectorname: string;
  subsectors?: Sector[];
}

interface EffectDetailsResponse {
  success: boolean;
  data: {
    damages: DamageRecord[];
    losses: LossRecord[];
    disruptions: DisruptionRecord[];
  };
}

interface DamageRecord {
  id: string;
  type: string;
  assetName: string;
  unit: string;
  totalDamageAmount: number;
  totalRepairReplacement: string;
  totalRecovery: string;
  sectorId: number;
  attachments: Array<{ url: string; type: string }>;
  spatialFootprint: any;
}

interface LossRecord {
  id: string;
  type: string;
  description: string;
  publicUnit: string | null;
  publicUnits: number | null;
  publicCostTotal: string | null;
  privateUnit: string | null;
  privateUnits: number | null;
  privateCostTotal: string | null;
  sectorId: number;
  attachments: Array<{ url: string; type: string }>;
  spatialFootprint: any;
}

interface DisruptionRecord {
  id: string;
  type: string;
  durationDays: number | null;
  durationHours: number | null;
  usersAffected: number | null;
  peopleAffected: number | null;
  responseCost: number | null;
  comment: string;
  sectorId: number;
  attachments: Array<{ url: string; type: string }>;
  spatialFootprint: any;
}

interface TableColumn {
  key: string;
  label: string;
}

interface TableData {
  [key: string]: string | number | null;
}

interface TableProps {
  title: string;
  columns: TableColumn[];
  data: TableData[];
  currency: string;
}

export function EffectDetails({ filters, currency }: Props) {
  // Debounce filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 500);

  // Fetch sectors data
  const { data: sectorsData } = useQuery<{ sectors: Sector[] }>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json();
    }
  });

  // Function to find a sector and its parent by ID
  const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | null; parent: Sector | null } => {
    for (const sector of sectors) {
      if (sector.subsectors) {
        for (const subsector of sector.subsectors) {
          if (subsector.id.toString() === targetId) {
            return { sector: subsector, parent: sector };
          }
        }
      }
      if (sector.id.toString() === targetId) {
        return { sector, parent: null };
      }
    }
    return { sector: null, parent: null };
  };

  // Function to generate section title
  const sectionTitle = () => {
    if (!sectorsData?.sectors) return "Effect Details";

    if (filters.subSectorId) {
      const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsData.sectors, filters.subSectorId);
      if (subsector && mainSector) {
        return `Effect Details in ${subsector.sectorname} (${mainSector.sectorname} Sector)`;
      }
    }

    if (filters.sectorId) {
      const { sector } = findSectorWithParent(sectorsData.sectors, filters.sectorId);
      if (sector) {
        return `Effect Details in ${sector.sectorname} Sector`;
      }
    }

    return "Effect Details";
  };

  // Fetch effect details data
  const { data: effectDetailsResponse, isLoading, error } = useQuery<EffectDetailsResponse>({
    queryKey: ["effectDetails", debouncedFilters],
    queryFn: async () => {
      try {
        const searchParams = new URLSearchParams();
        Object.entries(debouncedFilters).forEach(([key, value]) => {
          if (value) searchParams.append(key, value);
        });

        const response = await fetch(`/api/analytics/effect-details?${searchParams}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("No data found for the selected criteria");
          }
          throw new Error(`Failed to fetch effect details: ${response.statusText}`);
        }
        return response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        throw new Error(`Error fetching effect details: ${errorMessage}`);
      }
    },
    retry: 1,
    enabled: !!(filters.sectorId || filters.subSectorId),
  });

  return (
    <ClientOnly>
      {() => (
        <section className="dts-page-section">
          <div className="mg-container">
            <h2 className="dts-heading-2">{sectionTitle()}</h2>
            <p className="dts-body-text mb-6">
              View detailed information about damages, losses, and disruptions in the selected sector.
            </p>

            {isLoading && (
              <div className="dts-data-box">
                <h3 className="dts-body-label">Loading Data</h3>
                <div className="skeleton-loader" role="progressbar" aria-label="Loading data" />
              </div>
            )}

            {error && (
              <div className="dts-data-box" role="alert">
                <h3 className="dts-body-label">Error</h3>
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500">{error instanceof Error ? error.message : "Failed to load data"}</p>
                </div>
              </div>
            )}

            {effectDetailsResponse && (
              <div>
                <div className="dts-data-box">
                  <h3 className="dts-body-label">
                    <span>Damages</span>
                  </h3>
                  {effectDetailsResponse.data.damages && effectDetailsResponse.data.damages.length > 0 ? (
                    <SortableTable
                      title="Damages"
                      columns={[
                        { key: 'assetName', label: 'Asset' },
                        { key: 'totalDamageAmount', label: 'Total Damage' },
                        { key: 'totalRepairReplacement', label: 'Repair/Replacement' },
                        { key: 'totalRecovery', label: 'Recovery' },
                      ]}
                      data={effectDetailsResponse.data.damages.map(damage => ({
                        assetName: damage.assetName,
                        totalDamageAmount: damage.totalDamageAmount,
                        totalRepairReplacement: damage.totalRepairReplacement,
                        totalRecovery: damage.totalRecovery,
                      }))}
                      currency={currency}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" role="status">
                      <p className="text-gray-500">No damage data available for the selected criteria.</p>
                    </div>
                  )}
                </div>

                <div className="dts-data-box">
                  <h3 className="dts-body-label">
                    <span>Losses</span>
                  </h3>
                  {effectDetailsResponse.data.losses && effectDetailsResponse.data.losses.length > 0 ? (
                    <SortableTable
                      title="Losses"
                      columns={[
                        { key: 'type', label: 'Type' },
                        { key: 'description', label: 'Description' },
                        { key: 'publicCostTotal', label: 'Public Cost' },
                        { key: 'privateCostTotal', label: 'Private Cost' },
                      ]}
                      data={effectDetailsResponse.data.losses.map(loss => ({
                        type: loss.type,
                        description: loss.description,
                        publicCostTotal: loss.publicCostTotal || '-',
                        privateCostTotal: loss.privateCostTotal || '-',
                      }))}
                      currency={currency}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" role="status">
                      <p className="text-gray-500">No loss data available for the selected criteria.</p>
                    </div>
                  )}
                </div>

                <div className="dts-data-box">
                  <h3 className="dts-body-label">
                    <span>Disruptions</span>
                  </h3>
                  {effectDetailsResponse.data.disruptions && effectDetailsResponse.data.disruptions.length > 0 ? (
                    <SortableTable
                      title="Disruptions"
                      columns={[
                        { key: 'comment', label: 'Description' },
                        { key: 'durationDays', label: 'Duration (Days)' },
                        { key: 'usersAffected', label: 'Users Affected' },
                        { key: 'peopleAffected', label: 'People Affected' },
                        { key: 'responseCost', label: 'Response Cost' },
                      ]}
                      data={effectDetailsResponse.data.disruptions.map(disruption => ({
                        comment: disruption.comment,
                        durationDays: disruption.durationDays || '-',
                        usersAffected: disruption.usersAffected || '-',
                        peopleAffected: disruption.peopleAffected || '-',
                        responseCost: disruption.responseCost || '-',
                      }))}
                      currency={currency}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" role="status">
                      <p className="text-gray-500">No disruption data available for the selected criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </ClientOnly>
  );
};

const SortableTable: React.FC<TableProps> = ({ title, columns, data, currency }) => {
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;
      if (a[sortConfig.key] === b[sortConfig.key]) return 0;

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending'
          ? aValue - bValue
          : bValue - aValue;
      }

      return sortConfig.direction === 'ascending'
        ? String(aValue) > String(bValue) ? 1 : -1
        : String(bValue) > String(aValue) ? 1 : -1;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatValue = (value: string | number | null, key: string): string => {
    if (value === null || value === undefined) return '-';

    // Convert string numbers to actual numbers for currency fields
    if (typeof value === 'string' && !isNaN(Number(value)) &&
      ['totalDamage', 'repairReplacement', 'recovery', 'publicCost', 'privateCost',
        'totalDamageAmount', 'totalRepairReplacement', 'totalRecovery', 'publicCostTotal', 'privateCostTotal', 'responseCost'].includes(key)) {
      value = Number(value);
    }

    // Format all currency fields consistently
    if (
      ['totalDamage', 'repairReplacement', 'recovery', 'publicCost', 'privateCost',
        'totalDamageAmount', 'totalRepairReplacement', 'totalRecovery', 'publicCostTotal', 'privateCostTotal', 'responseCost'].includes(key) &&
      typeof value === 'number'
    ) {
      // Use millions for values >= 1 billion
      if (value >= 1_000_000_000) {
        return formatCurrencyWithCode(value, currency, {}, 'millions');
      }
      // Use thousands for values >= 1 million
      if (value >= 1_000_000) {
        return formatCurrencyWithCode(value, currency, {}, 'thousands');
      }
      // Use raw values for smaller amounts
      return formatCurrencyWithCode(value, currency);
    }

    // Format other numeric values with proper grouping
    if (typeof value === 'number') {
      return formatNumber(value);
    }

    return String(value);
  };

  return (
    <div className="table-wrapper">
      <table className="dts-table" role="grid" aria-label={title}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => requestSort(column.key)}
                aria-sort={sortConfig?.key === column.key ? sortConfig.direction : undefined}
                role="columnheader"
                aria-label={`${column.label}, click to sort`}
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    requestSort(column.key);
                  }
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr key={index} role="row">
              {columns.map((column) => (
                <td key={column.key} role="gridcell">
                  {formatValue(item[column.key], column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EffectDetails;
