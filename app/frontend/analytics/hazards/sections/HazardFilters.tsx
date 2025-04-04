import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface HazardType {
  id: string;
  name: string;
}

interface HazardCluster {
  id: string;
  name: string;
  typeId: string;
}

interface SpecificHazard {
  id: string;
  nameEn: string;
  clusterId: string;
}

interface GeographicLevel {
  id: number;
  name: Record<string, string>;
  level: number | null;
}

interface FiltersProps {
  hazardTypes: HazardType[];
  hazardClusters: HazardCluster[];
  specificHazards: SpecificHazard[];
  geographicLevels: GeographicLevel[];
  onApplyFilters: (filters: {
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
  }) => void;
  onClearFilters: () => void;
  selectedHazardClusterId: string | null;
  selectedSpecificHazardId: string | null;
  selectedGeographicLevelId: string | null;
}

const HazardFilters: React.FC<FiltersProps> = ({
  hazardTypes,
  hazardClusters,
  specificHazards,
  geographicLevels,
  onApplyFilters,
  onClearFilters,
  selectedHazardClusterId,
  selectedSpecificHazardId,
  selectedGeographicLevelId,
}) => {
  const [hazardTypeId, setHazardTypeId] = useState<string | null>(null);
  const [hazardClusterId, setHazardClusterId] = useState<string | null>(selectedHazardClusterId);
  const [specificHazardId, setSpecificHazardId] = useState<string | null>(selectedSpecificHazardId);
  const [geographicLevelId, setGeographicLevelId] = useState<string | null>(selectedGeographicLevelId);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  useEffect(() => {
    setHazardClusterId(null);
    setSpecificHazardId(null);
  }, [hazardTypeId]);

  useEffect(() => {
    setSpecificHazardId(null);
  }, [hazardClusterId]);

  const handleApply = () => {
    if (!hazardTypeId) {
      Swal.fire({
        icon: "warning",
        text: "Please select a hazard type first.",
        confirmButtonText: "OK",
      });
      return;
    }
    if (!hazardClusterId) {
      Swal.fire({
        icon: "warning",
        text: "Please select a hazard cluster first.",
        confirmButtonText: "OK",
      });
      return;
    }
    if (!specificHazardId) {
      Swal.fire({
        icon: "warning",
        text: "Please select a specific hazard first.",
        confirmButtonText: "OK",
      });
      return;
    }

    // Validate that "To" date is not before "From" date if both are set
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (to < from) {
        Swal.fire({
          icon: "warning",
          text: "The 'To' date cannot be earlier than the 'From' date.",
          confirmButtonText: "OK",
        });
        return;
      }
    }

    onApplyFilters({ hazardTypeId, hazardClusterId, specificHazardId, geographicLevelId, fromDate, toDate });
  };

  const handleClear = () => {
    setHazardTypeId(null);
    setHazardClusterId(null);
    setSpecificHazardId(null);
    setGeographicLevelId(null);
    setFromDate(null);
    setToDate(null);
    onClearFilters();
  };

  const filteredClusters = hazardTypeId
    ? hazardClusters.filter((cluster) => cluster.typeId === hazardTypeId)
    : [];

  const filteredSpecificHazards = hazardClusterId
    ? specificHazards.filter((hazard) => hazard.clusterId === hazardClusterId)
    : [];

  return (
    <div className="mg-grid mg-grid__col-6">
      {/* First Row: Hazard Type, Hazard Cluster, Specific Hazard */}
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="hazard-type">Hazard Type *</label>
        <select
          id="hazard-type"
          value={hazardTypeId || ""}
          onChange={(e) => setHazardTypeId(e.target.value || null)}
        >
          <option value="">Select a hazard type</option>
          {hazardTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="hazard-cluster">Hazard Cluster *</label>
        <select
          id="hazard-cluster"
          value={hazardClusterId || ""}
          onChange={(e) => setHazardClusterId(e.target.value || null)}
          disabled={!hazardTypeId}
        >
          <option value="">Select a hazard cluster</option>
          {filteredClusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="specific-hazard">Specific Hazard *</label>
        <select
          id="specific-hazard"
          value={specificHazardId || ""}
          onChange={(e) => setSpecificHazardId(e.target.value || null)}
          disabled={!hazardClusterId}
        >
          <option value="">Select a specific hazard</option>
          {filteredSpecificHazards.map((hazard) => (
            <option key={hazard.id} value={hazard.id}>
              {hazard.nameEn}
            </option>
          ))}
        </select>
      </div>
      {/* Second Row: Geographic Level, From, To */}
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="geographic-level">Geographic Level</label>
        <select
          id="geographic-level"
          value={geographicLevelId || ""}
          onChange={(e) => setGeographicLevelId(e.target.value || null)}
        >
          <option value="">Select a geographic level</option>
          {geographicLevels.map((level) => (
            <option key={level.id} value={level.id.toString()}>
              {level.name["en"]}
            </option>
          ))}
        </select>
      </div>
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="from-date">From</label>
        <input
          type="date"
          id="from-date"
          value={fromDate || ""}
          onChange={(e) => setFromDate(e.target.value || null)}
        />
      </div>
      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="to-date">To</label>
        <input
          type="date"
          id="to-date"
          value={toDate || ""}
          onChange={(e) => setToDate(e.target.value || null)}
        />
      </div>
      {/* Buttons */}
      <div
        className="mg-grid mg-grid__col-3 dts-form__actions"
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
        }}
      >
        <button
          className="mg-button mg-button--small mg-button-outline"
          type="button"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className="mg-button mg-button--small mg-button-primary"
          type="button"
          onClick={handleApply}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default HazardFilters;