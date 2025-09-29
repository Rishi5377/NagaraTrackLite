import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LiveMapPage from './components/LiveMapPage';
import SystemStatusPage from './components/SystemStatusPage';
import RouteAnalytics from './components/RouteAnalytics';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeVehicles, setActiveVehicles] = useState(true);
  const [routeOptimization, setRouteOptimization] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const handleRefresh = () => {
    setLastUpdate(new Date());
  };

  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            activeVehicles={activeVehicles}
            onToggleVehicles={() => setActiveVehicles(!activeVehicles)}
            routeOptimization={routeOptimization}
            onToggleOptimization={() => setRouteOptimization(!routeOptimization)}
            onRefresh={handleRefresh}
            lastUpdate={lastUpdate}
          />
          
          <main className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <LiveMapPage 
                    activeVehicles={activeVehicles}
                    routeOptimization={routeOptimization}
                    lastUpdate={lastUpdate}
                  />
                } 
              />
              <Route 
                path="/status" 
                element={<SystemStatusPage />} 
              />
              <Route 
                path="/analytics" 
                element={<RouteAnalytics />} 
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;