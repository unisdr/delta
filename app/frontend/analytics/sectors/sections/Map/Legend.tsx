interface LegendProps {
  ranges: Array<{
    color: string;
    range: string;
  }>;
  selectedMetric: "totalDamage" | "totalLoss";
  currency: string;
}

export default function Legend({ ranges, selectedMetric, currency }: LegendProps) {
  return (
    <div className="legend">
      <h4>{selectedMetric === 'totalDamage' ? `Total Damages in ${currency}`  : `Total Losses in ${currency}`}</h4>
      <div className="legend-items">
        {ranges.map((range, index) => (
          <div key={index} className="legend-item">
            <div
              className={`legend-color ${range.color === 'rgba(255, 255, 255, 0.9)' ? 'empty' : ''}`}
              style={{
                backgroundColor: range.color,
                border: range.color === 'rgba(255, 255, 255, 0.9)' ? '1px solid #ccc' : 'none'
              }}
            />
            <span className="legend-label">{range.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
