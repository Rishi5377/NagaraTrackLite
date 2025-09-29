import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Route, 
  Clock, 
  Users, 
  MapPin, 
  BarChart3, 
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  Filter,
  Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RouteAnalytics = () => {
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [sortBy, setSortBy] = useState('efficiency');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (routes.length > 0 && vehicles.length > 0) {
      calculateAnalytics();
    }
  }, [routes, vehicles, timeRange]);

  const fetchData = async () => {
    try {
      const [routesRes, vehiclesRes] = await Promise.all([
        axios.get(`${API}/routes`),
        axios.get(`${API}/vehicles`)
      ]);
      
      setRoutes(routesRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const routeAnalytics = {};
    
    routes.forEach(route => {
      const routeVehicles = vehicles.filter(v => v.route_id === route.id);
      const activeVehicles = routeVehicles.filter(v => v.status === 'active');
      
      // Calculate metrics
      const avgSpeed = activeVehicles.length > 0 
        ? activeVehicles.reduce((sum, v) => sum + v.speed, 0) / activeVehicles.length 
        : 0;
      
      const avgOccupancy = activeVehicles.length > 0
        ? activeVehicles.reduce((sum, v) => sum + v.occupancy, 0) / activeVehicles.length
        : 0;
      
      const onTimeVehicles = activeVehicles.filter(v => Math.abs(v.delay) <= 2).length;
      const onTimePercentage = activeVehicles.length > 0 
        ? (onTimeVehicles / activeVehicles.length) * 100 
        : 100;
      
      const totalDelayMinutes = activeVehicles.reduce((sum, v) => sum + Math.max(0, v.delay), 0);
      
      // Efficiency score (combination of speed, on-time performance, and occupancy)
      const speedScore = Math.min(avgSpeed / 40, 1) * 30; // Max speed considered 40 km/h
      const onTimeScore = (onTimePercentage / 100) * 40;
      const occupancyScore = Math.min(avgOccupancy / 35, 1) * 30; // Max occupancy considered 35
      const efficiency = speedScore + onTimeScore + occupancyScore;
      
      routeAnalytics[route.id] = {
        route,
        activeVehicles: activeVehicles.length,
        totalVehicles: routeVehicles.length,
        avgSpeed: Math.round(avgSpeed),
        avgOccupancy: Math.round(avgOccupancy),
        onTimePercentage: Math.round(onTimePercentage),
        totalDelayMinutes,
        efficiency: Math.round(efficiency),
        status: efficiency > 80 ? 'excellent' : efficiency > 60 ? 'good' : efficiency > 40 ? 'fair' : 'poor',
        estimatedRevenue: Math.round(avgOccupancy * activeVehicles.length * 25), // $25 per passenger estimate
        fuelEfficiency: Math.round((route.distance / Math.max(avgSpeed, 1)) * 100) / 100
      };
    });
    
    setAnalytics(routeAnalytics);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'good': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'fair': return <Activity className="w-5 h-5 text-yellow-500" />;
      case 'poor': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const sortedRoutes = Object.values(analytics).sort((a, b) => {
    switch (sortBy) {
      case 'efficiency': return b.efficiency - a.efficiency;
      case 'revenue': return b.estimatedRevenue - a.estimatedRevenue;
      case 'onTime': return b.onTimePercentage - a.onTimePercentage;
      case 'occupancy': return b.avgOccupancy - a.avgOccupancy;
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading route analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="mr-3 h-8 w-8 text-blue-600" />
              Route Analytics
            </h1>
            <p className="text-gray-600">Performance insights and optimization recommendations</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="efficiency">Efficiency Score</option>
                <option value="revenue">Estimated Revenue</option>
                <option value="onTime">On-Time Performance</option>
                <option value="occupancy">Average Occupancy</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Routes</p>
                <p className="text-2xl font-bold">{routes.length}</p>
              </div>
              <Route className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Avg Efficiency</p>
                <p className="text-2xl font-bold">
                  {sortedRoutes.length > 0 
                    ? Math.round(sortedRoutes.reduce((sum, r) => sum + r.efficiency, 0) / sortedRoutes.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${sortedRoutes.reduce((sum, r) => sum + r.estimatedRevenue, 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Avg On-Time</p>
                <p className="text-2xl font-bold">
                  {sortedRoutes.length > 0
                    ? Math.round(sortedRoutes.reduce((sum, r) => sum + r.onTimePercentage, 0) / sortedRoutes.length)
                    : 0}%
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Route Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedRoutes.map((routeData) => (
            <div 
              key={routeData.route.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRoute(routeData)}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {routeData.route.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {routeData.route.description}
                  </p>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(routeData.status)}`}>
                  {getStatusIcon(routeData.status)}
                  <span className="ml-1 capitalize">{routeData.status}</span>
                </div>
              </div>
              
              {/* Efficiency Score */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
                  <span className="text-lg font-bold text-gray-900">{routeData.efficiency}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      routeData.efficiency > 80 ? 'bg-green-500' :
                      routeData.efficiency > 60 ? 'bg-blue-500' :
                      routeData.efficiency > 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(routeData.efficiency, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Active Vehicles</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {routeData.activeVehicles}/{routeData.totalVehicles}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Avg Speed</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {routeData.avgSpeed} km/h
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Occupancy</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {routeData.avgOccupancy}%
                  </p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">On Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {routeData.onTimePercentage}%
                  </p>
                </div>
              </div>
              
              {/* Additional Info */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Revenue:</span>
                  <span className="font-medium text-green-600">
                    ${routeData.estimatedRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Total Delays:</span>
                  <span className={`font-medium ${routeData.totalDelayMinutes > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {routeData.totalDelayMinutes} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Detailed Route Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedRoute.route.name}
                  </h2>
                  <p className="text-gray-600">
                    Detailed performance analysis and recommendations
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedRoute(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Route Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">{selectedRoute.route.distance} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Time:</span>
                      <span className="font-medium">{selectedRoute.route.estimated_time} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Efficiency:</span>
                      <span className="font-medium">{selectedRoute.fuelEfficiency} L/km</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-medium">{selectedRoute.efficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Speed:</span>
                      <span className="font-medium">{selectedRoute.avgSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">On-Time Rate:</span>
                      <span className="font-medium">{selectedRoute.onTimePercentage}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Revenue</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Daily:</span>
                      <span className="font-medium">${selectedRoute.estimatedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Occupancy:</span>
                      <span className="font-medium">{selectedRoute.avgOccupancy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue/km:</span>
                      <span className="font-medium">${Math.round(selectedRoute.estimatedRevenue / selectedRoute.route.distance)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recommendations */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-yellow-600" />
                  Optimization Recommendations
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedRoute.efficiency < 60 && (
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                      <span>Route efficiency is below optimal. Consider adjusting schedules or routes.</span>
                    </div>
                  )}
                  {selectedRoute.onTimePercentage < 80 && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                      <span>On-time performance needs improvement. Review traffic patterns and timing.</span>
                    </div>
                  )}
                  {selectedRoute.avgOccupancy < 20 && (
                    <div className="flex items-start">
                      <Users className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                      <span>Low occupancy rate. Consider marketing or route adjustments.</span>
                    </div>
                  )}
                  {selectedRoute.totalDelayMinutes > 15 && (
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                      <span>High total delays. Investigate bottlenecks and optimize timing.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteAnalytics;