import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { RefreshCw, MapPin, Bus, Route, TrendingUp, AlertCircle, Navigation, Clock, Users, Zap, Filter, Search, Bell } from 'lucide-react';

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

const createVehicleIcon = (bearing, speed, occupancy, delay) => {
  let color = occupancy > 30 ? '#ef4444' : occupancy > 15 ? '#f59e0b' : '#10b981';
  if (delay > 5) color = '#dc2626'; // Very late
  else if (delay > 2) color = '#f59e0b'; // Slightly late
  
  return new L.DivIcon({
    className: 'vehicle-marker moving',
    html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: rotate(${bearing}deg); position: relative;">
      🚌
      ${delay > 2 ? '<div style="position: absolute; top: -5px; right: -5px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite;"></div>' : ''}
    </div>`,
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
  const [selectedStop, setSelectedStop] = useState(null);
  const [nearbyRadius, setNearbyRadius] = useState(1000);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStops, setFilteredStops] = useState([]);
  const [mapStats, setMapStats] = useState({
    activeVehicles: 0,
    totalRoutes: 0,
    averageSpeed: 0,
    onTimePerformance: 0
  });
  
  const mapRef = useRef();
  const vehicleUpdateInterval = useRef();
  const notificationCheckInterval = useRef();

  useEffect(() => {
    fetchMapData();
    startVehicleUpdates();
    startNotificationCheck();
    
    return () => {
      if (vehicleUpdateInterval.current) {
        clearInterval(vehicleUpdateInterval.current);
      }
      if (notificationCheckInterval.current) {
        clearInterval(notificationCheckInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [lastUpdate]);

  useEffect(() => {
    // Filter stops based on search query
    if (searchQuery) {
      const filtered = stops.filter(stop => 
        stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.stop_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStops(filtered);
    } else {
      setFilteredStops([]);
    }
  }, [searchQuery, stops]);

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
      
      // Calculate advanced stats
      const activeVehicleCount = vehiclesRes.data.filter(v => v.status === 'active').length;
      const avgSpeed = vehiclesRes.data.reduce((sum, v) => sum + v.speed, 0) / vehiclesRes.data.length;
      const onTime = vehiclesRes.data.filter(v => Math.abs(v.delay) <= 2).length / vehiclesRes.data.length * 100;
      
      setMapStats({
        activeVehicles: activeVehicleCount,
        totalRoutes: routesRes.data.length,
        averageSpeed: Math.round(avgSpeed),
        onTimePerformance: Math.round(onTime)
      });
      
    } catch (error) {
      console.error('Error fetching map data:', error);
      addNotification('Error fetching map data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startVehicleUpdates = () => {
    vehicleUpdateInterval.current = setInterval(async () => {
      try {
        const vehiclesRes = await axios.get(`${API}/vehicles`);
        const newVehicles = vehiclesRes.data;
        
        // Check for delayed vehicles
        newVehicles.forEach(vehicle => {
          const oldVehicle = vehicles.find(v => v.id === vehicle.id);
          if (oldVehicle && vehicle.delay > 5 && oldVehicle.delay <= 5) {
            addNotification(`Vehicle ${vehicle.vehicle_number} is now ${vehicle.delay} minutes late`, 'warning');
          }
        });
        
        setVehicles(newVehicles);
        
        // Update stats
        const activeVehicleCount = newVehicles.filter(v => v.status === 'active').length;
        const avgSpeed = newVehicles.reduce((sum, v) => sum + v.speed, 0) / newVehicles.length;
        const onTime = newVehicles.filter(v => Math.abs(v.delay) <= 2).length / newVehicles.length * 100;
        
        setMapStats(prev => ({
          ...prev,
          activeVehicles: activeVehicleCount,
          averageSpeed: Math.round(avgSpeed),
          onTimePerformance: Math.round(onTime)
        }));
        
      } catch (error) {
        console.error('Error updating vehicles:', error);
      }
    }, 3000);
  };

  const startNotificationCheck = () => {
    notificationCheckInterval.current = setInterval(() => {
      // Auto-remove old notifications
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 10000));
    }, 5000);
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
  };

  const handleRouteOptimization = async (routeId) => {
    if (!routeOptimization) return;
    
    try {
      const response = await axios.get(`${API}/routes/${routeId}/optimize`);
      setOptimizedRoutes(prev => ({
        ...prev,
        [routeId]: response.data
      }));
      addNotification(`Route optimized - ${response.data.time_saved} min saved!`, 'success');
    } catch (error) {
      console.error('Error optimizing route:', error);
      addNotification('Error optimizing route', 'error');
    }
  };

  const handleVehicleTrack = async (vehicleId) => {
    try {
      const response = await axios.get(`${API}/vehicles/${vehicleId}/track`);
      setTrackingData(response.data);
      setSelectedVehicle(vehicleId);
      addNotification('Vehicle tracking activated', 'success');
    } catch (error) {
      console.error('Error tracking vehicle:', error);
      addNotification('Error tracking vehicle', 'error');
    }
  };

  const handleStopClick = async (stop) => {
    setSelectedStop(stop);
    try {
      // Find vehicles heading to this stop
      const vehiclesAtStop = vehicles.filter(v => v.next_stop === stop.stop_id);
      addNotification(`${vehiclesAtStop.length} vehicles approaching ${stop.name}`, 'info');
    } catch (error) {
      console.error('Error getting stop info:', error);
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

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredStops([]);
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
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div key={notification.id} className={`toast-${notification.type} px-4 py-3 rounded-lg text-white text-sm shadow-lg max-w-xs opacity-90 transform transition-all duration-300`}>
            <div className="flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              {notification.message}
            </div>
          </div>
        ))}
      </div>

      {/* Header with stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
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
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search stops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            
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
        }
        
        {/* Enhanced stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Active Vehicles</p>
                <p className="text-2xl font-bold">{mapStats.activeVehicles}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {vehicles.filter(v => v.delay > 2).length} delayed
                </p>
              </div>
              <Bus className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Routes</p>
                <p className="text-2xl font-bold">{mapStats.totalRoutes}</p>
                <p className="text-xs text-green-200 mt-1">
                  {Object.keys(optimizedRoutes).length} optimized
                </p>
              </div>
              <Route className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Avg Speed</p>
                <p className="text-2xl font-bold">{mapStats.averageSpeed} km/h</p>
                <p className="text-xs text-purple-200 mt-1">
                  Range: {Math.min(...vehicles.map(v => Math.round(v.speed)))}-{Math.max(...vehicles.map(v => Math.round(v.speed)))} km/h
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">On Time</p>
                <p className="text-2xl font-bold">{mapStats.onTimePerformance}%</p>
                <p className="text-xs text-orange-200 mt-1">
                  {vehicles.filter(v => Math.abs(v.delay) <= 2).length}/{vehicles.length} vehicles
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Search Results */}
        {filteredStops.length > 0 && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 text-sm font-medium text-gray-700">
              Found {filteredStops.length} stops
            </div>
            {filteredStops.map(stop => (
              <div key={stop.id} className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                   onClick={() => handleStopClick(stop)}>
                <div className="font-medium text-sm">{stop.name}</div>
                <div className="text-xs text-gray-500">{stop.code} • {stop.stop_id}</div>
              </div>
            ))}
          </div>
        )}
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
            
            {/* Nearby radius circle */}
            {selectedStop && (
              <Circle
                center={[selectedStop.location.coordinates[1], selectedStop.location.coordinates[0]]}
                radius={nearbyRadius}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            )}
            
            {/* Bus stops */}
            {stops.map((stop) => {
              const isHighlighted = filteredStops.some(fs => fs.id === stop.id);
              return (
                <Marker 
                  key={stop.id} 
                  position={[stop.location.coordinates[1], stop.location.coordinates[0]]}
                  icon={busStopIcon}
                  eventHandlers={{
                    click: () => handleStopClick(stop)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-2">{stop.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">Stop ID: {stop.stop_id}</p>
                      <p className="text-sm text-gray-600 mb-2">Code: {stop.code}</p>
                      
                      {/* Vehicles at this stop */}
                      {(() => {
                        const vehiclesAtStop = vehicles.filter(v => v.next_stop === stop.stop_id);
                        return vehiclesAtStop.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Incoming Vehicles:</p>
                            {vehiclesAtStop.map(vehicle => (
                              <div key={vehicle.id} className="text-xs text-blue-800 bg-blue-50 px-2 py-1 rounded mb-1">
                                {vehicle.vehicle_number} - ETA: {Math.max(1, Math.round(Math.random() * 10))} min
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      
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
                      
                      <button 
                        onClick={() => setSelectedStop(stop)}
                        className="mt-2 w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Show Nearby ({nearbyRadius}m)
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Routes */}
            {routes.map((route) => {
              const coordinates = getRouteCoordinates(route);
              const positions = coordinates.map(coord => [coord[1], coord[0]]);
              
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
                      <div className="mt-2 text-sm space-y-1">
                        <p><strong>Distance:</strong> {route.distance} km</p>
                        <p><strong>Est. Time:</strong> {route.estimated_time} min</p>
                        <p><strong>Active Vehicles:</strong> {vehicles.filter(v => v.route_id === route.id && v.status === 'active').length}</p>
                        
                        {routeOptimization && optimizedRoutes[route.id] && (
                          <div className="mt-2 p-2 bg-green-50 rounded">
                            <p className="text-green-800 text-xs font-medium flex items-center">
                              <Zap className="w-3 h-3 mr-1" />
                              Optimized Route!
                            </p>
                            <p className="text-green-700 text-xs">
                              Time saved: {optimizedRoutes[route.id].time_saved} min
                            </p>
                            <p className="text-green-700 text-xs">
                              Traffic score: {(optimizedRoutes[route.id].traffic_score * 100).toFixed(1)}%
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
                  icon={createVehicleIcon(vehicle.bearing, vehicle.speed, vehicle.occupancy, vehicle.delay)}
                  eventHandlers={{
                    click: () => handleVehicleTrack(vehicle.id)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-2 flex items-center">
                        {vehicle.vehicle_number}
                        {vehicle.delay > 2 && <AlertCircle className="w-4 h-4 ml-2 text-red-500" />}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Route:</strong> {route?.name || 'Unknown'}</p>
                        <p><strong>Speed:</strong> {Math.round(vehicle.speed)} km/h</p>
                        <p className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <strong>Occupancy:</strong> {vehicle.occupancy} passengers
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            vehicle.occupancy > 30 ? 'bg-red-100 text-red-800' :
                            vehicle.occupancy > 15 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {vehicle.occupancy > 30 ? 'Full' : vehicle.occupancy > 15 ? 'Busy' : 'Available'}
                          </span>
                        </p>
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
                          className="btn-modern mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
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
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '10, 5'
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>
      
      {/* Enhanced vehicle tracking panel */}
      {trackingData && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-xl p-4 w-80 z-1000 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" />
              Vehicle Tracking
            </h3>
            <button 
              onClick={() => {setTrackingData(null); setSelectedVehicle(null);}}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle ID:</span>
              <span className="font-mono text-blue-600">{trackingData.vehicle_id.slice(-8)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Speed:</span>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="font-semibold">{Math.round(trackingData.speed)} km/h</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ETA Next Stop:</span>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1 text-orange-500" />
                <span className="font-semibold">{trackingData.eta_next_stop} min</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Route Progress:</span>
                <span className="font-semibold">{Math.round(trackingData.route_progress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${trackingData.route_progress * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-600 mb-1 flex items-center">
                <Zap className="w-3 h-3 mr-1" />
                Prediction: Next 5 positions shown in red
              </p>
              <div className="text-xs text-gray-500">
                Bearing: {Math.round(trackingData.bearing)}°
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick action floating button */}
      <div className="fixed bottom-6 left-6 z-1000">
        <div className="bg-white rounded-full shadow-lg p-3 border border-gray-200">
          <button 
            onClick={() => setNearbyRadius(prev => prev === 1000 ? 2000 : 1000)}
            className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
            title={`Toggle nearby radius (${nearbyRadius}m)`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMapPage;