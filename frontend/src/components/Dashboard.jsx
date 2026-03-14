import { useState } from 'react';
import axios from 'axios';
import MapCanvas from './MapCanvas';
import PollutionChart from './PollutionChart';

export default function Dashboard() {
  const [startLoc, setStartLoc] = useState("Ruby, Kolkata");
  const [endLoc, setEndLoc] = useState("Salt Lake, Kolkata");
  const [isRouting, setIsRouting] = useState(false);

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [aiAlert, setAiAlert] = useState(null); 

  const calculateRealRoute = async () => {
    if (!startLoc || !endLoc) return;
    setIsRouting(true);
    setAiAlert(null); 
    
    try {
      const startRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${startLoc}`);
      const endRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${endLoc}`);
      
      if (startRes.data.length > 0 && endRes.data.length > 0) {
        const start = [parseFloat(startRes.data[0].lat), parseFloat(startRes.data[0].lon)];
        const end = [parseFloat(endRes.data[0].lat), parseFloat(endRes.data[0].lon)];
        setStartCoords(start);
        setEndCoords(end);

        // 1. Fetch the main "Fastest Route"
        const baseUrl = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const baseRes = await axios.get(baseUrl);
        const baseRoute = baseRes.data.routes[0];

        // 2. 🚀 THE WAYPOINT HACK: Force OSRM to generate real alternatives
        const basePath = baseRoute.geometry.coordinates;
        const baseMid = basePath[Math.floor(basePath.length / 2)]; 

        // Offset the midpoints to force completely different roads
        const mid1 = [baseMid[0] + 0.025, baseMid[1] + 0.025]; // Northeast detour
        const mid2 = [baseMid[0] - 0.025, baseMid[1] - 0.025]; // Southwest detour

        const alt1Url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${mid1[0]},${mid1[1]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const alt2Url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${mid2[0]},${mid2[1]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

        // Fetch the forced detours in parallel so it's lightning fast
        const [alt1Res, alt2Res] = await Promise.all([
            axios.get(alt1Url).catch(() => null),
            axios.get(alt2Url).catch(() => null)
        ]);

        const rawRoutes = [
            { r: baseRoute, type: "Fastest Route (Main Highway)", isFastest: true },
        ];
        if (alt1Res?.data?.routes?.[0]) rawRoutes.push({ r: alt1Res.data.routes[0], type: "Eco-Bypass Alternative 1", isFastest: false });
        if (alt2Res?.data?.routes?.[0]) rawRoutes.push({ r: alt2Res.data.routes[0], type: "Eco-Bypass Alternative 2", isFastest: false });

        const analyzedRoutes = [];
        for (let i = 0; i < rawRoutes.length; i++) {
            const { r, type, isFastest } = rawRoutes[i];
            const path = r.geometry.coordinates.map(c => [c[1], c[0]]);
            const mid = path[Math.floor(path.length / 2)];
            const time = Math.round(r.duration / 60);
            const dist = (r.distance / 1000).toFixed(1);

            const rData = await axios.get(`http://127.0.0.1:8000/analyze-route?lat=${mid[0]}&lng=${mid[1]}&duration_mins=${time}&distance_km=${dist}&route_type=${i}&start_name=${startLoc}&end_name=${endLoc}`);
            
            // CRASH PREVENTION
            if (rData.data.status === "error") {
              console.error("Backend Error on route", i, ":", rData.data.message);
              continue; 
            }

            analyzedRoutes.push({ id: i, path: path, data: rData.data, originalName: type, isFastest: isFastest });
        }

        // 3. 🚀 SORTING LOGIC: Put the lowest AQI at the absolute top!
        analyzedRoutes.sort((a, b) => a.data.aqi - b.data.aqi);

        // Find the AI Concierge message (which we generated on the original fastest route)
        const fastestRouteAnalyzed = analyzedRoutes.find(r => r.isFastest);
        if (fastestRouteAnalyzed?.data?.ai_concierge_alert) {
            setAiAlert(fastestRouteAnalyzed.data.ai_concierge_alert);
        }

        setRoutes(analyzedRoutes);
        setSelectedIndex(0); // Because we sorted it, Index 0 is now ALWAYS the healthiest route!
      }
    } catch (error) {
      console.error("Routing Error:", error);
    } finally {
      setIsRouting(false);
    }
  };

  const activeRoute = routes[selectedIndex];

  return (
    <div className="min-h-screen pt-20 bg-gray-50 flex flex-col items-center px-4 pb-10">
      <div className="w-full max-w-[1400px] mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AERA Traffic Distribution</h1>
          <p className="text-gray-500 mt-1">Providing multiple real-time, biologically safe paths to prevent bottlenecks.</p>
        </div>
      </div>

      {aiAlert && (
        <div className="w-full max-w-[1400px] mb-6 bg-indigo-900 border border-indigo-500 text-indigo-50 p-4 rounded-xl shadow-lg flex items-center gap-4 animate-fade-in">
          <div className="text-3xl">🤖</div>
          <div>
            <h3 className="font-bold text-indigo-300 text-sm uppercase tracking-wider mb-1">Agentic AI Concierge</h3>
            <p className="text-sm font-medium">{aiAlert}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] relative z-0 flex gap-4">
        
        {/* LEFT PANEL */}
        <div className="w-[350px] flex flex-col gap-4 z-[1000]">
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-200">
            <input type="text" value={startLoc} onChange={(e) => setStartLoc(e.target.value)} className="w-full mb-2 p-2 text-sm border rounded" placeholder="Start Location" />
            <input type="text" value={endLoc} onChange={(e) => setEndLoc(e.target.value)} className="w-full mb-3 p-2 text-sm border rounded" placeholder="Destination" />
            <button onClick={calculateRealRoute} disabled={isRouting} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">
              {isRouting ? "Scanning Satellites & AI Map..." : "Find Alternatives"}
            </button>
          </div>

          {routes.map((route, index) => (
            <div 
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`p-4 rounded-2xl shadow-md border cursor-pointer transition-all ${selectedIndex === index ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 transform scale-105' : 'bg-white border-gray-200 hover:bg-gray-50 opacity-80'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{route.originalName}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${route.data.aqi < 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  AQI: {route.data.aqi}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{route.data.health.distance} km • {route.data.health.duration} mins</p>
              
              <div className="mt-3 p-2 bg-white/60 rounded text-xs text-gray-700 leading-snug border border-gray-100">
                {route.data.reason}
              </div>
            </div>
          ))}
        </div>

        {/* CENTER MAP */}
        <div className="flex-1 relative">
          <MapCanvas 
            routes={routes} 
            selectedIndex={selectedIndex} 
            onRouteSelect={setSelectedIndex} 
            startPoint={startCoords} 
            endPoint={endCoords} 
            startName={startLoc} 
            endName={endLoc}     
          />
        </div>

        {/* RIGHT PANEL: Drama & Data */}
        {activeRoute && activeRoute.data && (
          <div className="w-[340px] z-[1000] flex flex-col gap-4 overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
            
            <a 
              href={`https://www.google.com/maps/dir/?api=1&origin=${startCoords[0]},${startCoords[1]}&destination=${endCoords[0]},${endCoords[1]}&waypoints=${activeRoute.path[Math.floor(activeRoute.path.length / 2)][0]},${activeRoute.path[Math.floor(activeRoute.path.length / 2)][1]}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-gray-900 text-white font-bold py-3 px-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 hover:bg-black transition-transform transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Open in Google Maps
            </a>

            <PollutionChart activeRouteData={activeRoute.data} />

            {/* MICRO-ENVIRONMENT TAGS */}
            {activeRoute.data.micro_factors && activeRoute.data.micro_factors.length > 0 && (
              <div className="flex flex-col gap-2 animate-fade-in">
                {activeRoute.data.micro_factors.map((factor, idx) => {
                  let bgColor = "bg-gray-100 border-gray-200 text-gray-800";
                  if (factor.includes("🌊")) bgColor = "bg-blue-50 border-blue-200 text-blue-800";
                  if (factor.includes("☣️") || factor.includes("🗑️")) bgColor = "bg-yellow-50 border-yellow-300 text-yellow-900";
                  if (factor.includes("🚨") || factor.includes("🚗")) bgColor = "bg-orange-50 border-orange-200 text-orange-900";

                  return (
                    <div key={idx} className={`p-3 rounded-xl border shadow-sm text-sm font-semibold leading-snug ${bgColor}`}>
                      {factor}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GEMINI ECO-TRANSIT SUGGESTION */}
            {activeRoute.data.transit_suggestion && (
              <div className="bg-[#064e3b] border border-[#10b981] text-emerald-50 p-4 rounded-2xl shadow-xl flex flex-col gap-2 animate-fade-in mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚇</span>
                  <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">AI Transit Alternative</h3>
                </div>
                <p className="text-sm font-medium leading-relaxed italic text-emerald-100">
                  "{activeRoute.data.transit_suggestion}"
                </p>
              </div>
            )}

            {/* Medical Alerts */}
            {activeRoute.data.medical_alert && (
              <div className="bg-red-50 p-5 rounded-2xl shadow-xl border border-red-200 animate-fade-in mt-2">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><span>🚨</span> TOXIC CORRIDOR</h3>
                <p className="text-sm text-red-900 leading-relaxed font-medium">{activeRoute.data.medical_alert}</p>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <span className="text-xs text-red-600 uppercase font-bold">Life Expectancy Impact</span>
                  <div className="text-3xl font-black text-red-700">-{activeRoute.data.health.life_lost_mins} Mins</div>
                </div>
              </div>
            )}

            {activeRoute.data.reward_msg && (
              <div className="bg-green-50 p-5 rounded-2xl shadow-xl border border-green-200 animate-fade-in mt-2">
                <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2"><span>🛡️</span> OPTIMAL HEALTH</h3>
                <p className="text-sm text-green-900 leading-relaxed font-medium">{activeRoute.data.reward_msg}</p>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <span className="text-xs text-green-600 uppercase font-bold">Health Restored</span>
                  <div className="text-3xl font-black text-green-700">+{activeRoute.data.health.saved_life_mins > 0 ? activeRoute.data.health.saved_life_mins : 0.1} Mins</div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}