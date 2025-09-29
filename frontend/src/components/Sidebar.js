import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Map, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Power, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Bus,
  Route,
  TrendingUp
} from 'lucide-react';

const Sidebar = ({ 
  collapsed, 
  onToggleCollapse, 
  activeVehicles, 
  onToggleVehicles, 
  routeOptimization,
  onToggleOptimization,
  onRefresh, 
  lastUpdate 
}) => {
  const menuItems = [
    {
      path: '/',
      icon: Map,
      label: 'Live Map',
      description: 'Real-time vehicle tracking'
    },
    {
      path: '/status',
      icon: BarChart3,
      label: 'System Status',
      description: 'Health & performance metrics'
    }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
      collapsed ? 'w-16' : 'w-64'
    } shadow-lg`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">NagaraTrack</h2>
                <p className="text-sm text-gray-500">Lite</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
              {!collapsed && (
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600">
                    {item.description}
                  </p>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Controls Section */}
      <div className="p-3 border-t border-gray-200">
        {!collapsed && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Controls
            </h3>
            
            <div className="space-y-3">
              {/* Active Vehicles Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bus className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Show Vehicles</span>
                </div>
                <button
                  onClick={onToggleVehicles}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    activeVehicles ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      activeVehicles ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Route Optimization Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Optimize Routes</span>
                </div>
                <button
                  onClick={onToggleOptimization}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    routeOptimization ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      routeOptimization ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className={`btn-modern w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
            collapsed ? 'px-2' : ''
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${collapsed ? '' : 'mr-2'}`} />
          {!collapsed && 'Refresh Data'}
        </button>

        {/* Timestamp */}
        {!collapsed && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center text-xs text-gray-600">
              <Clock className="w-3 h-3 mr-1" />
              Last updated
            </div>
            <p className="text-xs text-gray-900 font-mono mt-1">
              {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* System Status Indicator */}
      <div className={`p-3 border-t border-gray-200 ${
        collapsed ? 'flex justify-center' : ''
      }`}>
        <div className={`flex items-center ${collapsed ? '' : 'space-x-2'}`}>
          <div className="status-indicator healthy"></div>
          {!collapsed && (
            <div>
              <p className="text-xs text-gray-600">System Status</p>
              <p className="text-xs font-medium text-green-600">All systems operational</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;