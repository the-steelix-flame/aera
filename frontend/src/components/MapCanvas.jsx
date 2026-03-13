import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ startPoint, endPoint }) {
  const map = useMap();
  useEffect(() => {
    if (startPoint && endPoint) {
      const bounds = L.latLngBounds([startPoint, endPoint]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [startPoint, endPoint, map]);
  return null;
}

// 🛠️ Added startName and endName props
export default function MapCanvas({ routes, selectedIndex, onRouteSelect, startPoint, endPoint, startName, endName }) {
  const selectedRoute = routes[selectedIndex];
  let activeColor = '#3B82F6'; 
  if (selectedRoute?.data?.aqi < 75) activeColor = '#10B981'; 
  if (selectedRoute?.data?.aqi > 75) activeColor = '#EF4444'; 

  return (
    <div className="w-full h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 z-0 relative">
      <MapContainer center={[22.5726, 88.3639]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <MapUpdater startPoint={startPoint} endPoint={endPoint} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {routes.map((route, index) => {
          if (index === selectedIndex) return null; 
          return (
            <Polyline 
              key={`bg-${index}`}
              positions={route.path} 
              color="#6B7280" 
              weight={5} 
              opacity={0.4} 
              eventHandlers={{ click: () => onRouteSelect(index) }}
              className="cursor-pointer"
            />
          );
        })}

        {selectedRoute && (
          <Polyline 
            key={`active-${selectedIndex}`}
            positions={selectedRoute.path} 
            color={activeColor} 
            weight={8} 
            opacity={1} 
          />
        )}

        {/* 🛠️ Injecting the real location names into the Popups */}
        {startPoint && (
          <Marker position={startPoint}>
            <Popup><span className="font-bold text-gray-800">Start: {startName || "Origin"}</span></Popup>
          </Marker>
        )}
        {endPoint && (
          <Marker position={endPoint}>
            <Popup><span className="font-bold text-gray-800">Destination: {endName || "Destination"}</span></Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}