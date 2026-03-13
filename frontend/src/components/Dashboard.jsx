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

  const calculateRealRoute = async () => {
    if (!startLoc || !endLoc) return;
    setIsRouting(true);
    try {
      const startRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${startLoc}`);
      const endRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${endLoc}`);

      if (startRes.data.length > 0 && endRes.data.length > 0) {
        const start = [parseFloat(startRes.data[0].lat), parseFloat(startRes.data[0].lon)];
        const end = [parseFloat(endRes.data[0].lat), parseFloat(endRes.data[0].lon)];
        setStartCoords(start);
        setEndCoords(end);

        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=3`;
        const routeRes = await axios.get(osrmUrl);
        const osrmRoutes = routeRes.data.routes;

        if (osrmRoutes && osrmRoutes.length > 0) {
          const analyzedRoutes = [];
          for (let i = 0; i < osrmRoutes.length; i++) {
            const r = osrmRoutes[i];
            const path = r.geometry.coordinates.map(c => [c[1], c[0]]);
            const mid = path[Math.floor(path.length / 2)];
            const time = Math.round(r.duration / 60);
            const dist = (r.distance / 1000).toFixed(1);

            const rData = await axios.get(`http://127.0.0.1:8000/analyze-route?lat=${mid[0]}&lng=${mid[1]}&duration_mins=${time}&distance_km=${dist}&route_type=${i}`);
            analyzedRoutes.push({ id: i, path: path, data: rData.data, isFastest: i === 0 });
          }
          setRoutes(analyzedRoutes);
          setSelectedIndex(0);
        }
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

      <div className="w-full max-w-[1400px] relative z-0 flex gap-4">

        {/* LEFT PANEL */}
        <div className="w-[350px] flex flex-col gap-4 z-[1000]">
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-200">
            <input type="text" value={startLoc} onChange={(e) => setStartLoc(e.target.value)} className="w-full mb-2 p-2 text-sm border rounded" placeholder="Start Location" />
            <input type="text" value={endLoc} onChange={(e) => setEndLoc(e.target.value)} className="w-full mb-3 p-2 text-sm border rounded" placeholder="Destination" />
            <button onClick={calculateRealRoute} disabled={isRouting} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">
              {isRouting ? "Scanning Satellites..." : "Find Alternatives"}
            </button>
          </div>

          {routes.map((route, index) => (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`p-4 rounded-2xl shadow-md border cursor-pointer transition-all ${selectedIndex === index ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 transform scale-105' : 'bg-white border-gray-200 hover:bg-gray-50 opacity-80'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{route.isFastest ? "Fastest Route" : `Alternative ${index + 1}`}</h3>
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
            startName={startLoc} // 🛠️ Passing the exact text you typed
            endName={endLoc}     // 🛠️ Passing the exact text you typed
          />
        </div>

        {/* RIGHT PANEL: Drama & Data */}
        {activeRoute && activeRoute.data && (
          <div className="w-[340px] z-[1000] flex flex-col gap-4">

            {/* 🛠️ ADDED: Google Maps Button with Waypoint Forcing */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${startCoords[0]},${startCoords[1]}&destination=${endCoords[0]},${endCoords[1]}&waypoints=${activeRoute.path[Math.floor(activeRoute.path.length / 2)][0]},${activeRoute.path[Math.floor(activeRoute.path.length / 2)][1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-900 text-white font-bold py-3 px-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 hover:bg-black transition-transform transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              Open in Google Maps
            </a>

            <PollutionChart activeRouteData={activeRoute.data} />

            {activeRoute.data.medical_alert && (
              <div className="bg-red-50 p-5 rounded-2xl shadow-xl border border-red-200 animate-fade-in">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2"><span>🚨</span> TOXIC CORRIDOR</h3>
                <p className="text-sm text-red-900 leading-relaxed font-medium">{activeRoute.data.medical_alert}</p>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <span className="text-xs text-red-600 uppercase font-bold">Life Expectancy Impact</span>
                  <div className="text-3xl font-black text-red-700">-{activeRoute.data.health.life_lost_mins} Mins</div>
                </div>
              </div>
            )}

            {activeRoute.data.reward_msg && (
              <div className="bg-green-50 p-5 rounded-2xl shadow-xl border border-green-200 animate-fade-in">
                <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2"><span>🛡️</span> OPTIMAL HEALTH</h3>
                <p className="text-sm text-green-900 leading-relaxed font-medium">{activeRoute.data.reward_msg}</p>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <span className="text-xs text-green-600 uppercase font-bold">Health Restored</span>
                  <div className="text-3xl font-black text-green-700">+0.0 Mins Lost</div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}