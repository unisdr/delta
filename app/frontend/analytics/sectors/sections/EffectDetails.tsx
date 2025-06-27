import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "remix-utils/client-only";
import { formatCurrencyWithCode, formatNumber } from "~/frontend/utils/formatters";
import "~/frontend/styles/analytics/sectors/effect-details.css";
import { useDebounce } from "~/frontend/hooks/useDebounce";
import { typeEnumAgriculture, typeEnumNotAgriculture } from "~/frontend/losses_enums";

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



interface SortableTableProps extends TableProps {
  formatValue: (value: string | number | null, key: string) => string;
}

const SortableTable: React.FC<SortableTableProps> = ({ title, columns, data, formatValue }) => {
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

  return (
    <div className="dts-data-box">
      <h3 className="dts-body-label">
        <span>{title}</span>
      </h3>
      <div className="mg-container">
        <div className="dts-table-wrapper">
          <table className="dts-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => requestSort(column.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    {column.label}
                    {sortConfig?.key === column.key && (
                      <span>{sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={`${column.key}-${index}`}>
                      {formatValue(item[column.key], column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};



export function EffectDetails({ filters, currency }: Props) {
  // Debounce filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 500);

  // Fetch sectors data
  const { data: sectorsData } = useQuery<{ sectors: Sector[] }>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors", {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json();
    },
    gcTime: 0, // Disable garbage collection (formerly cacheTime)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true // Refetch when window regains focus
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

        // Only use sectorId if no subsectorId is selected
        if (debouncedFilters.subSectorId) {
          searchParams.append('sectorId', debouncedFilters.subSectorId);
        } else if (debouncedFilters.sectorId) {
          searchParams.append('sectorId', debouncedFilters.sectorId);
        }

        // Add other filters
        Object.entries(debouncedFilters).forEach(([key, value]) => {
          if (value && key !== 'sectorId' && key !== 'subSectorId') {
            searchParams.append(key, value);
          }
        });

        const response = await fetch(`/api/analytics/effect-details?${searchParams}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("No effect details found for the selected criteria");
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
    gcTime: 0, // Disable garbage collection (formerly cacheTime)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!(debouncedFilters.sectorId || debouncedFilters.subSectorId || debouncedFilters.hazardTypeId || debouncedFilters.hazardClusterId || debouncedFilters.specificHazardId || debouncedFilters.geographicLevelId || debouncedFilters.fromDate || debouncedFilters.toDate || debouncedFilters.disasterEventId),
  });

  const getTypeLabel = (type: string | null) => {
    if (!type) return '-';

    // First check agriculture types
    const agricultureType = typeEnumAgriculture.find(t => t.type === type);
    if (agricultureType) return agricultureType.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    // Then check non-agriculture types
    const nonAgricultureType = typeEnumNotAgriculture.find(t => t.type === type);
    if (nonAgricultureType) return nonAgricultureType.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return type;
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
      return formatCurrencyWithCode(
        value,
        currency,
        {},
        value >= 1_000_000_000 ? 'billions' :
          value >= 1_000_000 ? 'millions' :
            value >= 1_000 ? 'thousands' :
              undefined
      );
    }

    // Format other numeric values with proper grouping
    if (typeof value === 'number') {
      return formatNumber(value);
    }

    return String(value);
  };

  const renderTable = ({
    title,
    columns,
    data,
    emptyMessage,
    loadingMessage,
    isLoading
  }: {
    title: string;
    columns: { key: string; label: string }[];
    data: any[] | undefined;
    emptyMessage: string;
    loadingMessage: string;
    isLoading: boolean;
  }) => {
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
        return formatCurrencyWithCode(
          value,
          currency,
          {},
          value >= 1_000_000_000 ? 'billions' :
            value >= 1_000_000 ? 'millions' :
              value >= 1_000 ? 'thousands' :
                undefined
        );
      }

      // Format other numeric values with proper grouping
      if (typeof value === 'number') {
        return formatNumber(value);
      }

      return String(value);
    };

    if (isLoading) {
      return (
        <div className="dts-data-box">
          <h3 className="dts-body-label">
            <span>{title}</span>
          </h3>
          <div className="mg-container">
            <div className="dts-table-wrapper">
              <table className="dts-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length} className="text-center p-4">
                      {loadingMessage}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="dts-data-box">
          <h3 className="dts-body-label">
            <span>{title}</span>
          </h3>
          <div className="mg-container">
            <div className="dts-table-wrapper">
              <table className="dts-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length} className="text-center p-4">
                      {emptyMessage}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return (
      <SortableTable
        title={title}
        columns={columns}
        data={data}
        formatValue={formatValue}
        currency={currency}
      />
    );
  };

  if (error) {
    return (
      <ClientOnly>
        {() => (
          <section className="dts-page-section">
            <div className="mg-container">
              <h2 className="dts-heading-2">{sectionTitle()}</h2>
              <div className="dts-data-box" role="alert">
                <h3 className="dts-body-label">Error</h3>
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500">
                    {error instanceof Error ? error.message : "Failed to load data"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      {() => (
        <section className="dts-page-section">
          <div className="mg-container">
            <h2 className="dts-heading-2">{sectionTitle()}</h2>
            <p className="dts-body-text mb-6">
              View detailed information about damages, losses, and disruptions in the selected sector.
            </p>

            {isLoading ? (
              <div>
                {/* Damages Table Loading */}
                {renderTable({
                  title: 'Damages',
                  columns: [
                    { key: 'assetName', label: 'Asset' },
                    { key: 'totalDamageAmount', label: 'Total Damage' },
                    { key: 'totalRepairReplacement', label: 'Repair/Replacement' },
                    { key: 'totalRecovery', label: 'Recovery' },
                  ],
                  data: [],
                  emptyMessage: '',
                  loadingMessage: 'Loading damage records...',
                  isLoading: isLoading
                })}

                {/* Losses Table Loading */}
                {renderTable({
                  title: 'Losses',
                  columns: [
                    { key: 'type', label: 'Type' },
                    { key: 'description', label: 'Description' },
                    { key: 'publicCostTotal', label: 'Public Cost' },
                    { key: 'privateCostTotal', label: 'Private Cost' },
                  ],
                  data: [],
                  emptyMessage: '',
                  loadingMessage: 'Loading loss records...',
                  isLoading: isLoading
                })}

                {/* Disruptions Table Loading */}
                {renderTable({
                  title: 'Disruptions',
                  columns: [
                    { key: 'comment', label: 'Description' },
                    { key: 'durationDays', label: 'Duration (Days)' },
                    { key: 'usersAffected', label: 'Users Affected' },
                    { key: 'peopleAffected', label: 'People Affected' },
                    { key: 'responseCost', label: 'Response Cost' },
                  ],
                  data: [],
                  emptyMessage: '',
                  loadingMessage: 'Loading disruption records...',
                  isLoading: isLoading
                })}
              </div>
            ) : effectDetailsResponse ? (
              <div>
                {/* Damages Table */}
                {renderTable({
                  title: 'Damages',
                  columns: [
                    { key: 'assetName', label: 'Asset' },
                    { key: 'totalDamageAmount', label: 'Total Damage' },
                    { key: 'totalRepairReplacement', label: 'Repair/Replacement' },
                    { key: 'totalRecovery', label: 'Recovery' },
                  ],
                  data: effectDetailsResponse.data.damages?.map(damage => ({
                    assetName: damage.assetName,
                    totalDamageAmount: formatValue(damage.totalDamageAmount, 'totalDamageAmount'),
                    totalRepairReplacement: formatValue(damage.totalRepairReplacement, 'totalRepairReplacement'),
                    totalRecovery: formatValue(damage.totalRecovery, 'totalRecovery'),
                  })),
                  emptyMessage: 'No damage records details available for the selected criteria.',
                  loadingMessage: '',
                  isLoading: isLoading
                })}

                {/* Losses Table */}
                {renderTable({
                  title: 'Losses',
                  columns: [
                    { key: 'type', label: 'Type' },
                    { key: 'description', label: 'Description' },
                    { key: 'publicCostTotal', label: 'Public Cost' },
                    { key: 'privateCostTotal', label: 'Private Cost' },
                  ],
                  data: effectDetailsResponse.data.losses?.map(loss => ({
                    type: getTypeLabel(loss.type),
                    description: loss.description,
                    publicCostTotal: loss.publicCostTotal ? formatValue(loss.publicCostTotal, 'publicCostTotal') : '-',
                    privateCostTotal: loss.privateCostTotal ? formatValue(loss.privateCostTotal, 'privateCostTotal') : '-',
                  })),
                  emptyMessage: 'No loss records details available for the selected criteria.',
                  loadingMessage: '',
                  isLoading: isLoading
                })}

                {/* Disruptions Table */}
                {renderTable({
                  title: 'Disruptions',
                  columns: [
                    { key: 'comment', label: 'Description' },
                    { key: 'durationDays', label: 'Duration (Days)' },
                    { key: 'usersAffected', label: 'Users Affected' },
                    { key: 'peopleAffected', label: 'People Affected' },
                    { key: 'responseCost', label: 'Response Cost' },
                  ],
                  data: effectDetailsResponse.data.disruptions?.map(disruption => ({
                    comment: disruption.comment,
                    durationDays: disruption.durationDays ?? '-',
                    usersAffected: disruption.usersAffected ?? '-',
                    peopleAffected: disruption.peopleAffected ?? '-',
                    responseCost: disruption.responseCost ? formatValue(disruption.responseCost, 'responseCost') : '-',
                  })),
                  emptyMessage: 'No disruption records details available for the selected criteria.',
                  loadingMessage: '',
                  isLoading: isLoading
                })}
              </div>
            ) : null}
          </div>
        </section>
      )}
    </ClientOnly>
  );
};

export default EffectDetails;
