import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function PollutionChart({ activeRouteData }) {
  if (!activeRouteData || !activeRouteData.sources) return null;

  // UX/MATH FIX: Ensure percentages always visually equal exactly 100%
  let sources = [...activeRouteData.sources];
  const total = sources.reduce((acc, curr) => acc + curr.value, 0);
  if (total !== 100 && total > 0) {
    const diff = 100 - total;
    let maxIdx = 0;
    sources.forEach((s, i) => { if(s.value > sources[maxIdx].value) maxIdx = i; });
    sources[maxIdx].value += diff;
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-gray-100 flex flex-col">
      <div className="mb-2">
        <h3 className="font-extrabold text-gray-900 text-lg tracking-tight">Pollution Sources</h3>
        <p className="text-xs text-gray-500 font-medium">Estimated from real-time ESA satellite data</p>
      </div>
      
      {/* 🛠️ FIX: Increased height (h-56) to ensure no clipping at the top or bottom */}
      <div className="relative w-full h-56 my-2">
        <ResponsiveContainer width="100%" height="100%">
          {/* 🛠️ FIX: Added explicit margins to keep the SVG away from the walls */}
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={sources}
              cx="50%"
              cy="50%"
              innerRadius={60}   // 🛠️ FIX: Scaled down slightly
              outerRadius={75}   // 🛠️ FIX: Scaled down slightly to guarantee a perfect circle
              paddingAngle={3}
              cornerRadius={6}
              dataKey="value"
              stroke="none"
            >
              {sources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `${value}%`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
              itemStyle={{ color: '#1F2937' }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-black text-gray-800 drop-shadow-sm">{activeRouteData.aqi}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total AQI</span>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-4">
        {sources.map((item, index) => (
          <div key={index} className="flex items-center justify-between group">
            <div className="flex items-center text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
              <span 
                className="w-3 h-3 rounded-full mr-3 shadow-inner" 
                style={{ backgroundColor: item.color }}
              ></span>
              {item.name}
            </div>
            <span className="font-bold text-gray-900 text-sm bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}