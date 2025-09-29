import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  BarChart3,
  Gauge,
  Zap,
  HardDrive,
  Cpu,
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemStatusPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [historicalData, setHistoricalData] = useState({
    apiRequests: [],
    dbQueries: [],
    vehicleCount: [],
    systemLoad: []
  });

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const response = await axios.get(`${API}/health`);
      setHealthData(response.data);
      setLastUpdate(new Date());
      
      // Update historical data for charts
      const now = Date.now();
      setHistoricalData(prev => ({
        apiRequests: [...prev.apiRequests.slice(-19), {
          time: now,
          value: response.data.advanced_metrics.requests_per_minute || 0
        }],
        dbQueries: [...prev.dbQueries.slice(-19), {
          time: now,
          value: response.data.advanced_metrics.database_queries_per_minute || 0
        }],
        vehicleCount: [...prev.vehicleCount.slice(-19), {
          time: now,
          value: response.data.active_vehicles || 0
        }],
        systemLoad: [...prev.systemLoad.slice(-19), {
          time: now,
          value: response.data.advanced_metrics.system_load || 0
        }]
      }));
      
    } catch (error) {
      console.error('Error fetching health data:', error);
      setHealthData({
        status: 'unhealthy',
        database_connected: false,
        api_response_time: 0,
        active_vehicles: 0,
        total_routes: 0,
        total_stops: 0,
        system_uptime: '0:00:00',
        last_update: new Date(),
        advanced_metrics: { error: 'Failed to fetch data' }
      });
    } finally {
      setLoading(false);
      if (showRefresh) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  const handleRefresh = () => {
    fetchHealthData(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Activity className="w-8 h-8 text-gray-500" />;
    }
  };

  const MiniChart = ({ data, color = '#3b82f6', title }) => {
    if (!data || data.length < 2) {
      return (
        <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
          Collecting data...
        </div>
      );
    }

    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;

    return (
      <div className="h-16 flex items-end justify-between px-1">
        {data.map((point, index) => {
          const height = ((point.value - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 mx-px rounded-t"
              style={{
                backgroundColor: color,
                height: `${Math.max(height, 5)}%`,
                opacity: 0.7 + (index / data.length) * 0.3
              }}
            />
          );
        })}
      </div>
    );
  };

  const MetricCard = ({ title, value, unit, icon, color, subtitle, chart }) => (
    <div className="metric-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {value}
            <span className="text-sm text-gray-500 ml-1">{unit}</span>
          </p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      {chart && chart}
    </div>
  );

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  const metrics = healthData?.advanced_metrics || {};

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={getStatusColor(healthData?.status)}>
              {getStatusIcon(healthData?.status)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
              <p className="text-gray-600">
                Overall system status: 
                <span className={`font-semibold ml-1 ${getStatusColor(healthData?.status)}`}>
                  {healthData?.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm text-gray-500">
              <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
              <p>Uptime: {healthData?.system_uptime}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-modern flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Basic Health Indicators */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <Server className="w-8 h-8 text-blue-500" />
                <div className={`status-indicator ${healthData?.status === 'healthy' ? 'healthy' : 'error'}`}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">API Server</h3>
              <p className="text-sm text-gray-600">Response time: {healthData?.api_response_time?.toFixed(2)}ms</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <Database className="w-8 h-8 text-green-500" />
                <div className={`status-indicator ${healthData?.database_connected ? 'healthy' : 'error'}`}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Database</h3>
              <p className="text-sm text-gray-600">
                {healthData?.database_connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <Wifi className="w-8 h-8 text-purple-500" />
                <div className="status-indicator healthy"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Network</h3>
              <p className="text-sm text-gray-600">
                Latency: {metrics.network_latency?.toFixed(1)}ms
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-orange-500" />
                <div className="status-indicator healthy"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Tracking</h3>
              <p className="text-sm text-gray-600">{healthData?.active_vehicles} active vehicles</p>
            </div>
          </div>
        </section>

        {/* Advanced Metrics */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="API Requests"
              value={metrics.requests_per_minute || 0}
              unit="/min"
              icon={<BarChart3 className="w-6 h-6 text-white" />}
              color="bg-blue-500"
              chart={<MiniChart data={historicalData.apiRequests} color="#3b82f6" />}
            />

            <MetricCard
              title="Database Queries"
              value={metrics.database_queries_per_minute || 0}
              unit="/min"
              icon={<Database className="w-6 h-6 text-white" />}
              color="bg-green-500"
              chart={<MiniChart data={historicalData.dbQueries} color="#10b981" />}
            />

            <MetricCard
              title="System Load"
              value={((metrics.system_load || 0) * 100).toFixed(1)}
              unit="%"
              icon={<Cpu className="w-6 h-6 text-white" />}
              color="bg-purple-500"
              subtitle={metrics.system_load > 0.8 ? 'High' : metrics.system_load > 0.5 ? 'Medium' : 'Low'}
              chart={<MiniChart data={historicalData.systemLoad} color="#8b5cf6" />}
            />

            <MetricCard
              title="Memory Usage"
              value={((metrics.memory_usage || 0) * 100).toFixed(1)}
              unit="%"
              icon={<HardDrive className="w-6 h-6 text-white" />}
              color="bg-orange-500"
              subtitle={metrics.memory_usage > 0.8 ? 'High' : metrics.memory_usage > 0.5 ? 'Medium' : 'Low'}
            />
          </div>
        </section>

        {/* System Information */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                Performance Overview
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Cache Hit Rate</span>
                    <span className="font-medium">{((metrics.cache_hit_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(metrics.cache_hit_rate || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Average Vehicle Speed</span>
                    <span className="font-medium">{(metrics.average_vehicle_speed || 0).toFixed(1)} km/h</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Network Latency</span>
                    <span className="font-medium">{(metrics.network_latency || 0).toFixed(1)}ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Gauge className="w-5 h-5 mr-2 text-green-500" />
                Fleet Status
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Vehicles</span>
                  <span className="text-2xl font-bold text-green-600">{healthData?.active_vehicles}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Routes</span>
                  <span className="text-2xl font-bold text-blue-600">{healthData?.total_routes}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bus Stops</span>
                  <span className="text-2xl font-bold text-purple-600">{healthData?.total_stops}</span>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <Zap className="w-4 h-4 inline mr-1" />
                    All tracking systems operational
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        {metrics.error && (
          <section>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center mb-3">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-lg font-semibold text-red-900">System Error</h3>
              </div>
              <p className="text-red-800">{metrics.error}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SystemStatusPage;