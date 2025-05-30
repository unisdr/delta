import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define the type for the data prop
interface ChartData {
  name: string;
  [key: string]: string | number; // Allows dynamic keys with string or number values
}

// Define props interface
interface HorizontalBarChartProps {
  data: ChartData[];
  imgSrc?: string;
  imgAlt?: string;
  colorScheme?: 'violet' | 'cerulean'; // New prop for color scheme
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  imgSrc,
  imgAlt,
  colorScheme = 'violet', // Default to violet
}) => {
  // Define color schemes
  const colorSchemes = {
    violet: ['#AD66A1', '#BD84B3', '#D6B3D0', '#E5CEE1', '#F5ECF3'],
    cerulean: ['#004f91', '#106CB8', '#6093BD', '#9ABBD6', '#DDE8F0'],
  };

  // Select colors based on colorScheme
  const colors = colorSchemes[colorScheme];

  // Extract data keys for bars, excluding 'name'
  const dataKeys = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'name') : [];

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      {imgSrc && (
        <div style={{ marginRight: '-50px', display: 'flex', alignItems: 'center', height: '100%' }}>
          <img
            src={imgSrc}
            alt={imgAlt || 'Icon'}
            style={{ width: '60px', height: '60px' }}
          />
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={500}
          layout="vertical"
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <XAxis 
            type="number"
            tick={{ fill: '#6B7280' }}
            tickFormatter={(value) => Number.isInteger(value) ? value.toString() : ''}
            domain={[0, 'dataMax']}
            tickCount={5}
            allowDecimals={false}
          />
          <YAxis type="category" dataKey="name" />
          <Legend align="left" />
          {dataKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HorizontalBarChart;