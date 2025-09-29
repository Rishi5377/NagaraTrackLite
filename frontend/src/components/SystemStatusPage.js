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
  RefreshCw,
  Download,
  Share2,
  FileText
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemStatusPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    systemLoad: 0.8,
    memoryUsage: 0.8,
    responseTime: 1000
  });
  const [historicalData, setHistoricalData] = useState({
    apiRequests: [],
    dbQueries: [],
    vehicleCount: [],
    systemLoad: [],
    responseTime: []
  });
  const [systemAlerts, setSystemAlerts] = useState([]);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchHealthData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchHealthData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const response = await axios.get(`${API}/health`);
      const newHealthData = response.data;
      setHealthData(newHealthData);
      setLastUpdate(new Date());
      
      // Check for system alerts
      checkSystemAlerts(newHealthData);
      
      // Update historical data for charts
      const now = Date.now();
      setHistoricalData(prev => ({
        apiRequests: [...prev.apiRequests.slice(-19), {
          time: now,
          value: newHealthData.advanced_metrics.requests_per_minute || 0
        }],
        dbQueries: [...prev.dbQueries.slice(-19), {
          time: now,
          value: newHealthData.advanced_metrics.database_queries_per_minute || 0
        }],
        vehicleCount: [...prev.vehicleCount.slice(-19), {
          time: now,
          value: newHealthData.active_vehicles || 0
        }],
        systemLoad: [...prev.systemLoad.slice(-19), {
          time: now,
          value: newHealthData.advanced_metrics.system_load || 0
        }],
        responseTime: [...prev.responseTime.slice(-19), {
          time: now,
          value: newHealthData.api_response_time || 0
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
      addAlert('Failed to fetch system health data', 'error');
    } finally {
      setLoading(false);
      if (showRefresh) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  const checkSystemAlerts = (healthData) => {
    const alerts = [];
    const metrics = healthData.advanced_metrics || {};
    
    if (metrics.system_load > alertThresholds.systemLoad) {
      alerts.push({ type: 'warning', message: `High system load: ${(metrics.system_load * 100).toFixed(1)}%` });
    }
    if (metrics.memory_usage > alertThresholds.memoryUsage) {
      alerts.push({ type: 'warning', message: `High memory usage: ${(metrics.memory_usage * 100).toFixed(1)}%` });
    }
    if (healthData.api_response_time > alertThresholds.responseTime) {
      alerts.push({ type: 'error', message: `Slow API response: ${healthData.api_response_time.toFixed(2)}ms` });
    }
    if (!healthData.database_connected) {
      alerts.push({ type: 'error', message: 'Database connection lost' });
    }
    
    setSystemAlerts(alerts);
  };

  const addAlert = (message, type) => {
    setSystemAlerts(prev => [{ type, message, timestamp: Date.now() }, ...prev.slice(0, 4)]);
  };

  const handleRefresh = () => {
    fetchHealthData(true);
  };

  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      healthData,
      historicalData,
      systemAlerts
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nagaratrack-system-status-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    const metrics = healthData?.advanced_metrics || {};
    const report = `
NagaraTrack Lite - System Status Report
Generated: ${new Date().toISOString()}

=== SYSTEM OVERVIEW ===
Status: ${healthData?.status?.toUpperCase()}
Uptime: ${healthData?.system_uptime}
Last Update: ${lastUpdate.toISOString()}

=== CORE SERVICES ===
API Server: ${healthData?.api_response_time?.toFixed(2)}ms
Database: ${healthData?.database_connected ? 'Connected' : 'Disconnected'}
Network Latency: ${metrics.network_latency?.toFixed(1)}ms
Active Vehicles: ${healthData?.active_vehicles}

=== PERFORMANCE METRICS ===
API Requests/min: ${metrics.requests_per_minute || 0}
DB Queries/min: ${metrics.database_queries_per_minute || 0}
System Load: ${((metrics.system_load || 0) * 100).toFixed(1)}%
Memory Usage: ${((metrics.memory_usage || 0) * 100).toFixed(1)}%
Cache Hit Rate: ${((metrics.cache_hit_rate || 0) * 100).toFixed(1)}%

=== FLEET STATUS ===
Total Routes: ${healthData?.total_routes}
Total Stops: ${healthData?.total_stops}
Average Vehicle Speed: ${metrics.average_vehicle_speed?.toFixed(1)} km/h

=== ALERTS ===
${systemAlerts.length === 0 ? 'No active alerts' : systemAlerts.map(alert => `${alert.type.toUpperCase()}: ${alert.message}`).join('\n')}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nagaratrack-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
              className="flex-1 mx-px rounded-t transition-all duration-300"
              style={{
                backgroundColor: color,
                height: `${Math.max(height, 5)}%`,
                opacity: 0.7 + (index / data.length) * 0.3
              }}
              title={`${point.value.toFixed(1)} at ${new Date(point.time).toLocaleTimeString()}`}
            />
          );
        })}
      </div>
    );
  };

  const MetricCard = ({ title, value, unit, icon, color, subtitle, chart, trend }) => (
    <div className="metric-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="flex items-center">
            <p className="text-2xl font-bold text-gray-900">
              {value}
              <span className="text-sm text-gray-500 ml-1">{unit}</span>
            </p>
            {trend && (
              <div className={`ml-2 p-1 rounded ${trend > 0 ? 'bg-green-100 text-green-600' : trend < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'transform rotate-180' : ''}`} />
              </div>
            )}
          </div>
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
  const overallStatus = systemAlerts.length > 0 ? (systemAlerts.some(a => a.type === 'error') ? 'unhealthy' : 'warning') : healthData?.status;

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={getStatusColor(overallStatus)}>
              {getStatusIcon(overallStatus)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
              <p className="text-gray-600">
                Overall system status: 
                <span className={`font-semibold ml-1 ${getStatusColor(overallStatus)}`}>
                  {overallStatus?.toUpperCase()}
                </span>
                {systemAlerts.length > 0 && (
                  <span className="ml-2 text-sm text-orange-600">
                    ({systemAlerts.length} active alerts)
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Auto-refresh</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="text-right text-sm text-gray-500">
              <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
              <p>Uptime: {healthData?.system_uptime}</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={exportData}
                className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                title="Export data as JSON"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              
              <button
                onClick={generateReport}
                className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                title="Generate text report"
              >
                <FileText className="w-4 h-4 mr-2" />
                Report
              </button>
              
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
        
        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {systemAlerts.map((alert, index) => (
              <div key={index} className={`flex items-center p-3 rounded-lg ${
                alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <AlertCircle className={`w-5 h-5 mr-3 ${
                  alert.type === 'error' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <span className={`text-sm ${
                  alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Core Services */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-white rounded-xl shadow-sm border p-6 ${
              healthData?.status === 'healthy' ? 'border-green-200' : 'border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <Server className="w-8 h-8 text-blue-500" />
                <div className={`status-indicator ${healthData?.status === 'healthy' ? 'healthy' : 'error'}`}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">API Server</h3>
              <p className="text-sm text-gray-600">Response time: {healthData?.api_response_time?.toFixed(2)}ms</p>
              {healthData?.api_response_time > 500 && (
                <p className="text-xs text-yellow-600 mt-1">Response time elevated</p>
              )}
            </div>

            <div className={`bg-white rounded-xl shadow-sm border p-6 ${
              healthData?.database_connected ? 'border-green-200' : 'border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <Database className="w-8 h-8 text-green-500" />
                <div className={`status-indicator ${healthData?.database_connected ? 'healthy' : 'error'}`}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Database</h3>
              <p className="text-sm text-gray-600">
                {healthData?.database_connected ? 'Connected' : 'Disconnected'}
              </p>
              {healthData?.database_connected && (
                <p className="text-xs text-green-600 mt-1">2dsphere indexing active</p>
              )}
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
              <p className="text-xs text-gray-500 mt-1">
                {metrics.network_latency < 50 ? 'Excellent' : metrics.network_latency < 100 ? 'Good' : 'Fair'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-orange-500" />
                <div className="status-indicator healthy"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Tracking</h3>
              <p className="text-sm text-gray-600">{healthData?.active_vehicles} active vehicles</p>
              <p className="text-xs text-green-600 mt-1">Real-time updates active</p>
            </div>
          </div>
        </section>

        {/* Enhanced Performance Metrics */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard
              title="API Requests"
              value={metrics.requests_per_minute || 0}
              unit="/min"
              icon={<BarChart3 className="w-6 h-6 text-white" />}
              color="bg-blue-500"
              chart={<MiniChart data={historicalData.apiRequests} color="#3b82f6" />}
              trend={0}
            />

            <MetricCard
              title="Database Queries"
              value={metrics.database_queries_per_minute || 0}
              unit="/min"
              icon={<Database className="w-6 h-6 text-white" />}
              color="bg-green-500"
              chart={<MiniChart data={historicalData.dbQueries} color="#10b981" />}
              trend={1}
            />

            <MetricCard
              title="System Load"
              value={((metrics.system_load || 0) * 100).toFixed(1)}
              unit="%"
              icon={<Cpu className="w-6 h-6 text-white" />}
              color={metrics.system_load > 0.8 ? "bg-red-500" : metrics.system_load > 0.6 ? "bg-yellow-500" : "bg-purple-500"}
              subtitle={metrics.system_load > 0.8 ? 'High' : metrics.system_load > 0.5 ? 'Medium' : 'Low'}
              chart={<MiniChart data={historicalData.systemLoad} color="#8b5cf6" />}
              trend={metrics.system_load > 0.7 ? 1 : -1}
            />

            <MetricCard
              title="Memory Usage"
              value={((metrics.memory_usage || 0) * 100).toFixed(1)}
              unit="%"
              icon={<HardDrive className="w-6 h-6 text-white" />}
              color={metrics.memory_usage > 0.8 ? "bg-red-500" : "bg-orange-500"}
              subtitle={metrics.memory_usage > 0.8 ? 'High' : metrics.memory_usage > 0.5 ? 'Medium' : 'Low'}
              trend={0}
            />
            
            <MetricCard
              title="Response Time"
              value={healthData?.api_response_time?.toFixed(0) || 0}
              unit="ms"
              icon={<Zap className="w-6 h-6 text-white" />}
              color={healthData?.api_response_time > 1000 ? "bg-red-500" : healthData?.api_response_time > 500 ? "bg-yellow-500" : "bg-indigo-500"}
              subtitle={healthData?.api_response_time > 1000 ? 'Slow' : healthData?.api_response_time > 500 ? 'Fair' : 'Fast'}
              chart={<MiniChart data={historicalData.responseTime} color="#6366f1" />}
              trend={0}
            />
          </div>
        </section>

        {/* Enhanced System Information */}
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
                    <span className={`font-medium ${
                      (metrics.cache_hit_rate || 0) > 0.9 ? 'text-green-600' : 
                      (metrics.cache_hit_rate || 0) > 0.7 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {((metrics.cache_hit_rate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (metrics.cache_hit_rate || 0) > 0.9 ? 'bg-green-500' :
                        (metrics.cache_hit_rate || 0) > 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(metrics.cache_hit_rate || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Avg Vehicle Speed</span>
                    <p className="font-medium text-lg">{(metrics.average_vehicle_speed || 0).toFixed(1)} km/h</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Network Quality</span>
                    <p className={`font-medium text-lg ${
                      (metrics.network_latency || 0) < 50 ? 'text-green-600' : 
                      (metrics.network_latency || 0) < 100 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(metrics.network_latency || 0) < 50 ? 'Excellent' : 
                       (metrics.network_latency || 0) < 100 ? 'Good' : 'Fair'}
                    </p>
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-green-600">{healthData?.active_vehicles}</span>
                    <p className="text-sm text-gray-600">Active Vehicles</p>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-2xl font-bold text-blue-600">{healthData?.total_routes}</span>
                    <p className="text-sm text-gray-600">Total Routes</p>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-2xl font-bold text-purple-600">{healthData?.total_stops}</span>
                    <p className="text-sm text-gray-600">Bus Stops</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700 flex items-center">
                    <Zap className="w-4 h-4 inline mr-2 text-green-500" />
                    All tracking systems operational
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Real-time updates: ✓ | Route optimization: ✓ | Geospatial queries: ✓
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