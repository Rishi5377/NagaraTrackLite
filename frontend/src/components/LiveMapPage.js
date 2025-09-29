import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { RefreshCw, MapPin, Bus, Route, TrendingUp, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mumbai coordinates as center
const MUMBAI_CENTER = [19.0760, 72.8777];

// Custom icon configurations
const busStopIcon = new L.DivIcon({
  className: 'bus-stop-marker',
  html: '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🚏</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createVehicleIcon = (bearing, speed, occupancy) => {
  const color = occupancy > 30 ? '#ef4444' : occupancy > 15 ? '#f59e0b' : '#10b981';
  return new L.DivIcon({
    className: 'vehicle-marker moving',
    html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: rotate(${bearing}deg);">🚌</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const LiveMapPage = ({ activeVehicles, routeOptimization, lastUpdate }) => {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [mapStats, setMapStats] = useState({
    activeVehicles: 0,
    totalRoutes: 0,
    averageSpeed: 0,
    onTimePerformance: 0
  });
  
  const mapRef = useRef();
  const vehicleUpdateInterval = useRef();

  useEffect(() => {
    fetchMapData();
    startVehicleUpdates();
    
    return () => {
      if (vehicleUpdateInterval.current) {
        clearInterval(vehicleUpdateInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [lastUpdate]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const [stopsRes, routesRes, vehiclesRes] = await Promise.all([
        axios.get(`${API}/stops`),
        axios.get(`${API}/routes`),
        axios.get(`${API}/vehicles`)
      ]);
      
      setStops(stopsRes.data);
      setRoutes(routesRes.data);
      setVehicles(vehiclesRes.data);
      
      // Calculate map stats
      const activeVehicleCount = vehiclesRes.data.filter(v => v.status === 'active').length;
      const avgSpeed = vehiclesRes.data.reduce((sum, v) => sum + v.speed, 0) / vehiclesRes.data.length;
      
      setMapStats({
        activeVehicles: activeVehicleCount,
        totalRoutes: routesRes.data.length,
        averageSpeed: Math.round(avgSpeed),
        onTimePerformance: Math.round(Math.random() * 20 + 75) // Simulated
      });
      
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVehicleUpdates = () => {
    vehicleUpdateInterval.current = setInterval(async () => {
      try {
        const vehiclesRes = await axios.get(`${API}/vehicles`);
        setVehicles(vehiclesRes.data);
        
        // Update stats
        const activeVehicleCount = vehiclesRes.data.filter(v => v.status === 'active').length;
        const avgSpeed = vehiclesRes.data.reduce((sum, v) => sum + v.speed, 0) / vehiclesRes.data.length;
        
        setMapStats(prev => ({
          ...prev,
          activeVehicles: activeVehicleCount,
          averageSpeed: Math.round(avgSpeed)
        }));
        
      } catch (error) {
        console.error('Error updating vehicles:', error);
      }
    }, 3000); // Update every 3 seconds for smooth animation
  };

  const handleRouteOptimization = async (routeId) => {
    if (!routeOptimization) return;
    
    try {
      const response = await axios.get(`${API}/routes/${routeId}/optimize`);
      setOptimizedRoutes(prev => ({
        ...prev,
        [routeId]: response.data
      }));
    } catch (error) {
      console.error('Error optimizing route:', error);
    }
  };

  const handleVehicleTrack = async (vehicleId) => {
    try {
      const response = await axios.get(`${API}/vehicles/${vehicleId}/track`);
      setTrackingData(response.data);
      setSelectedVehicle(vehicleId);
    } catch (error) {
      console.error('Error tracking vehicle:', error);
    }
  };

  const getRouteColor = (route) => {
    if (routeOptimization && optimizedRoutes[route.id]) {
      return '#10b981'; // Green for optimized routes
    }
    return route.color || '#3b82f6';
  };

  const getRouteCoordinates = (route) => {
    if (routeOptimization && optimizedRoutes[route.id]) {
      return optimizedRoutes[route.id].optimized_coordinates;
    }
    return route.coordinates;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading NagaraTrack system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bus className="mr-3 h-8 w-8 text-blue-600" />
              Live Bus Tracking
            </h1>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
                <div className="status-indicator healthy mr-1"></div>
                System Active
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {routeOptimization && (
              <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                Route Optimization ON
              </div>
            )}
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Active Vehicles</p>
                <p className="text-2xl font-bold">{mapStats.activeVehicles}</p>
              </div>
              <Bus className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Routes</p>
                <p className="text-2xl font-bold">{mapStats.totalRoutes}</p>
              </div>
              <Route className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Avg Speed</p>
                <p className="text-2xl font-bold">{mapStats.averageSpeed} km/h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">On Time</p>
                <p className="text-2xl font-bold">{mapStats.onTimePerformance}%</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Map container */}
      <div className="flex-1 p-6">
        <div className="map-container h-full">
          <MapContainer 
            center={MUMBAI_CENTER} 
            zoom={11} 
            className="h-full w-full" 
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Bus stops */}
            {stops.map((stop) => (
              <Marker 
                key={stop.id} 
                position={[stop.location.coordinates[1], stop.location.coordinates[0]]}
                icon={busStopIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-lg mb-2">{stop.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">Stop ID: {stop.stop_id}</p>
                    <p className="text-sm text-gray-600 mb-2">Code: {stop.code}</p>
                    
                    {stop.amenities && stop.amenities.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Amenities:</p>
                        <div className="flex flex-wrap gap-1">
                          {stop.amenities.map((amenity, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {amenity.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Routes */}
            {routes.map((route) => {
              const coordinates = getRouteCoordinates(route);
              const positions = coordinates.map(coord => [coord[1], coord[0]]);
              
              // Auto-optimize route if enabled
              if (routeOptimization && !optimizedRoutes[route.id]) {
                handleRouteOptimization(route.id);
              }
              
              return (
                <Polyline 
                  key={route.id}
                  positions={positions}
                  pathOptions={{ 
                    color: getRouteColor(route), 
                    weight: 4, 
                    opacity: 0.8,
                    className: 'route-line'
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-2">{route.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">{route.description}</p>
                      <div className="mt-2 text-sm">
                        <p>Distance: {route.distance} km</p>
                        <p>Est. Time: {route.estimated_time} min</p>
                        {routeOptimization && optimizedRoutes[route.id] && (
                          <div className="mt-2 p-2 bg-green-50 rounded">
                            <p className="text-green-800 text-xs font-medium">Optimized!</p>
                            <p className="text-green-700 text-xs">
                              Time saved: {optimizedRoutes[route.id].time_saved} min
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}
            
            {/* Vehicles */}
            {activeVehicles && vehicles.filter(v => v.status === 'active').map((vehicle) => {
              const route = routes.find(r => r.id === vehicle.route_id);
              
              return (
                <Marker 
                  key={vehicle.id}
                  position={[vehicle.location.coordinates[1], vehicle.location.coordinates[0]]}
                  icon={createVehicleIcon(vehicle.bearing, vehicle.speed, vehicle.occupancy)}
                  eventHandlers={{
                    click: () => handleVehicleTrack(vehicle.id)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-2">{vehicle.vehicle_number}</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Route:</strong> {route?.name || 'Unknown'}</p>
                        <p><strong>Speed:</strong> {Math.round(vehicle.speed)} km/h</p>
                        <p><strong>Occupancy:</strong> {vehicle.occupancy} passengers</p>
                        <p><strong>Status:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                            vehicle.delay > 5 ? 'bg-red-100 text-red-800' :
                            vehicle.delay < -2 ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {vehicle.delay > 0 ? `${vehicle.delay}min late` :
                             vehicle.delay < 0 ? `${Math.abs(vehicle.delay)}min early` :
                             'On time'}
                          </span>
                        </p>
                        {vehicle.next_stop && (
                          <p><strong>Next Stop:</strong> {vehicle.next_stop}</p>
                        )}
                        
                        <button 
                          onClick={() => handleVehicleTrack(vehicle.id)}
                          className="btn-modern mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                          Track Vehicle
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Tracking prediction line */}
            {trackingData && trackingData.predicted_positions.length > 0 && (
              <Polyline 
                positions={trackingData.predicted_positions.map(pos => [pos[1], pos[0]])}
                pathOptions={{
                  color: '#ef4444',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 10'
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>
      
      {/* Vehicle tracking panel */}
      {trackingData && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 w-80 z-1000">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Vehicle Tracking</h3>
            <button 
              onClick={() => {setTrackingData(null); setSelectedVehicle(null);}}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <p><strong>Vehicle ID:</strong> {trackingData.vehicle_id}</p>
            <p><strong>Current Speed:</strong> {Math.round(trackingData.speed)} km/h</p>
            <p><strong>ETA Next Stop:</strong> {trackingData.eta_next_stop} min</p>
            <p><strong>Route Progress:</strong> {Math.round(trackingData.route_progress * 100)}%</p>
            
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600 mb-1">Prediction: Next 5 positions shown in red</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${trackingData.route_progress * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMapPage;