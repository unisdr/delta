import { useEffect, useState } from "react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

const COLORS = [
  "#FF5733", "#C70039", "#900C3F", "#FF8C00", "#FFD700",
  "#FF4500", "#DAA520", "#00A86B", "#008080", "#40E0D0",
  "#4B0082", "#800080", "#9400D3", "#FF1493", "#FF69B4",
  "#DC143C", "#8B0000", "#4682B4", "#1E90FF", "#0000CD"
];

function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
  
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

export default function CustomPieChart({ data }: { data: any[]; }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents SSR hydration error

  const arrayColors = shuffleArray(COLORS);

  return (
    <>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={120} fill="#8884d8" dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={arrayColors[index % arrayColors.length]} />
              ))}
            </Pie>
            <Tooltip wrapperStyle={{ fontSize:'17px' }} />
            <Legend align="left" wrapperStyle={{ fontSize:'14px' }} />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}



