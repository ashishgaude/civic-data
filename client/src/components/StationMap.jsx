import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix for default marker icon missing assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const StationMap = ({ stations, onSelectStation }) => {
  // Default Center (Goa)
  const center = [15.4909, 73.8278] 

  // If real lat/long isn't available, we can't map them accurately.
  // For the prototype, we filter for stations that HAVE coords, 
  // OR we generate deterministic mock coords near the center for visual demo.
  
  const mappedStations = stations.map((s, i) => {
    // Use existing lat/long if available, else mock based on index to scatter them
    // Mock spread: +/- 0.1 degrees
    const hasRealCoords = s.latitude && s.longitude
    const lat = hasRealCoords ? s.latitude : center[0] + (Math.sin(i) * 0.05)
    const lng = hasRealCoords ? s.longitude : center[1] + (Math.cos(i) * 0.05)
    
    return { ...s, lat, lng, isMock: !hasRealCoords }
  })

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative">
      <MapContainer center={center} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedStations.map(station => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]}
            eventHandlers={{
              click: () => onSelectStation(station),
            }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="text-center">
                <span className="font-bold text-slate-800 block text-sm">
                  {station.polling_station_name.length > 30 
                    ? station.polling_station_name.substring(0, 30) + '...' 
                    : station.polling_station_name}
                </span>
                <div className="text-xs text-slate-500">{station.main_town_or_village}</div>
                <div className="text-xs font-semibold text-indigo-600 mt-0.5">
                  {station.number_of_electors} Voters
                </div>
              </div>
            </Tooltip>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-slate-800 mb-1">{station.polling_station_name}</h3>
                <p className="text-xs text-slate-500">{station.main_town_or_village}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  {station.number_of_electors} Voters
                </p>
                {station.isMock && <p className="text-[10px] text-rose-400 italic mt-1">(Location approx)</p>}
                <button 
                  onClick={() => onSelectStation(station)}
                  className="mt-2 w-full bg-indigo-600 text-white text-xs py-1 rounded hover:bg-indigo-700 transition-colors"
                >
                  View Voter List
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default StationMap
