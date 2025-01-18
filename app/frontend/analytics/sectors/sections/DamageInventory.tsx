import React, { useEffect, useState } from "react";

// Strongly typed interface for the data structure
interface DamageInventoryItem {
  id: string;
  subtotalDamage: number;
  subtotalLosses: number;
}

const DamageInventory: React.FC = () => {
  const [data, setData] = useState<DamageInventoryItem[]>([]); // Holds the fetched data
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  // Fetch data from the API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/analytics/damage-inventory");
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const result: DamageInventoryItem[] = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dts-page-section">
      <h2 className="dts-heading-2">Damage Inventory</h2>
      {loading ? (
        <p>Loading data...</p>
      ) : error ? (
        <p className="dts-alert dts-alert--error">{error}</p>
      ) : data.length === 0 ? (
        <p>No data available</p>
      ) : (
        <table className="dts-table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Label</th>
              <th style={{ textAlign: "center" }}>Subtotal Damage (USD)</th>
              <th style={{ textAlign: "center" }}>Subtotal Losses (USD)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id}>
                {/* Dynamic Label */}
                <td>{`Row ${index + 1}`}</td>
                <td style={{ textAlign: "center" }}>
                  ${item.subtotalDamage.toLocaleString()}
                </td>
                <td style={{ textAlign: "center" }}>
                  ${item.subtotalLosses.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DamageInventory;
