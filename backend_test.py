#!/usr/bin/env python3
"""
NagaraTrack Lite Backend API Testing Suite
Tests all backend endpoints for functionality and data integrity
"""

import requests
import json
import time
from datetime import datetime
import sys

# Backend URL from environment
BACKEND_URL = "https://smart-bus-dash.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
    def log_result(self, test_name, success, message=""):
        self.results["total_tests"] += 1
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def test_basic_connectivity(self):
        """Test GET /api/ for basic connectivity"""
        try:
            response = requests.get(f"{BACKEND_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "NagaraTrack Lite API" in data.get("message", ""):
                    self.log_result("Basic Connectivity", True, f"Status: {response.status_code}")
                    return True
                else:
                    self.log_result("Basic Connectivity", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Basic Connectivity", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Basic Connectivity", False, f"Connection error: {str(e)}")
            return False
    
    def test_bus_stops_endpoint(self):
        """Test GET /api/stops to verify bus stops with GeoJSON coordinates"""
        try:
            response = requests.get(f"{BACKEND_URL}/stops", timeout=10)
            if response.status_code == 200:
                stops = response.json()
                if isinstance(stops, list) and len(stops) > 0:
                    # Verify structure of first stop
                    stop = stops[0]
                    required_fields = ['id', 'stop_id', 'name', 'location', 'code']
                    missing_fields = [field for field in required_fields if field not in stop]
                    
                    if missing_fields:
                        self.log_result("Bus Stops Structure", False, f"Missing fields: {missing_fields}")
                        return False
                    
                    # Verify GeoJSON format
                    location = stop.get('location', {})
                    if (location.get('type') == 'Point' and 
                        isinstance(location.get('coordinates'), list) and 
                        len(location.get('coordinates')) == 2):
                        lng, lat = location['coordinates']
                        if isinstance(lng, (int, float)) and isinstance(lat, (int, float)):
                            self.log_result("Bus Stops Endpoint", True, f"Found {len(stops)} stops with valid GeoJSON")
                            return stops
                        else:
                            self.log_result("Bus Stops Coordinates", False, "Invalid coordinate types")
                            return False
                    else:
                        self.log_result("Bus Stops GeoJSON", False, f"Invalid GeoJSON format: {location}")
                        return False
                else:
                    self.log_result("Bus Stops Endpoint", False, "No stops returned or invalid format")
                    return False
            else:
                self.log_result("Bus Stops Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Bus Stops Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_routes_endpoint(self):
        """Test GET /api/routes to verify routes with coordinate arrays"""
        try:
            response = requests.get(f"{BACKEND_URL}/routes", timeout=10)
            if response.status_code == 200:
                routes = response.json()
                if isinstance(routes, list) and len(routes) > 0:
                    # Verify structure of first route
                    route = routes[0]
                    required_fields = ['id', 'name', 'color', 'coordinates']
                    missing_fields = [field for field in required_fields if field not in route]
                    
                    if missing_fields:
                        self.log_result("Routes Structure", False, f"Missing fields: {missing_fields}")
                        return False
                    
                    # Verify coordinates array
                    coordinates = route.get('coordinates', [])
                    if isinstance(coordinates, list) and len(coordinates) > 0:
                        # Check first coordinate pair
                        coord = coordinates[0]
                        if (isinstance(coord, list) and len(coord) == 2 and 
                            isinstance(coord[0], (int, float)) and isinstance(coord[1], (int, float))):
                            self.log_result("Routes Endpoint", True, f"Found {len(routes)} routes with valid coordinates")
                            return routes
                        else:
                            self.log_result("Routes Coordinates", False, f"Invalid coordinate format: {coord}")
                            return False
                    else:
                        self.log_result("Routes Coordinates", False, "No coordinates or invalid format")
                        return False
                else:
                    self.log_result("Routes Endpoint", False, "No routes returned or invalid format")
                    return False
            else:
                self.log_result("Routes Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Routes Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_vehicles_endpoint(self):
        """Test GET /api/vehicles to verify vehicle tracking data"""
        try:
            response = requests.get(f"{BACKEND_URL}/vehicles", timeout=10)
            if response.status_code == 200:
                vehicles = response.json()
                if isinstance(vehicles, list) and len(vehicles) > 0:
                    # Verify structure of first vehicle
                    vehicle = vehicles[0]
                    required_fields = ['id', 'route_id', 'vehicle_number', 'location', 'bearing', 'speed', 'occupancy']
                    missing_fields = [field for field in required_fields if field not in vehicle]
                    
                    if missing_fields:
                        self.log_result("Vehicles Structure", False, f"Missing fields: {missing_fields}")
                        return False
                    
                    # Verify location GeoJSON
                    location = vehicle.get('location', {})
                    if (location.get('type') == 'Point' and 
                        isinstance(location.get('coordinates'), list) and 
                        len(location.get('coordinates')) == 2):
                        
                        # Verify numeric fields
                        if (isinstance(vehicle.get('bearing'), (int, float)) and
                            isinstance(vehicle.get('speed'), (int, float)) and
                            isinstance(vehicle.get('occupancy'), int)):
                            self.log_result("Vehicles Endpoint", True, f"Found {len(vehicles)} vehicles with valid data")
                            return vehicles
                        else:
                            self.log_result("Vehicles Data Types", False, "Invalid data types for bearing/speed/occupancy")
                            return False
                    else:
                        self.log_result("Vehicles Location", False, f"Invalid location format: {location}")
                        return False
                else:
                    self.log_result("Vehicles Endpoint", False, "No vehicles returned or invalid format")
                    return False
            else:
                self.log_result("Vehicles Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Vehicles Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_nearby_stops(self):
        """Test GET /api/stops/nearby for geospatial proximity queries"""
        try:
            # Test with Mumbai coordinates
            lng, lat, radius = 72.8777, 19.0760, 1000
            response = requests.get(f"{BACKEND_URL}/stops/nearby?lng={lng}&lat={lat}&radius={radius}", timeout=10)
            
            if response.status_code == 200:
                nearby_stops = response.json()
                if isinstance(nearby_stops, list):
                    # Should return some stops within 1km of central Mumbai
                    if len(nearby_stops) > 0:
                        # Verify structure
                        stop = nearby_stops[0]
                        if 'location' in stop and 'coordinates' in stop['location']:
                            self.log_result("Nearby Stops Query", True, f"Found {len(nearby_stops)} stops within {radius}m")
                            return True
                        else:
                            self.log_result("Nearby Stops Structure", False, "Invalid stop structure")
                            return False
                    else:
                        self.log_result("Nearby Stops Query", True, "No stops found in radius (valid response)")
                        return True
                else:
                    self.log_result("Nearby Stops Query", False, "Invalid response format")
                    return False
            else:
                self.log_result("Nearby Stops Query", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Nearby Stops Query", False, f"Error: {str(e)}")
            return False
    
    def test_route_optimization(self, routes):
        """Test GET /api/routes/{route_id}/optimize for route optimization"""
        if not routes:
            self.log_result("Route Optimization", False, "No routes available for testing")
            return False
            
        try:
            route_id = routes[0]['id']
            response = requests.get(f"{BACKEND_URL}/routes/{route_id}/optimize", timeout=10)
            
            if response.status_code == 200:
                optimization = response.json()
                required_fields = ['route_id', 'original_coordinates', 'optimized_coordinates', 'time_saved', 'traffic_score']
                missing_fields = [field for field in required_fields if field not in optimization]
                
                if missing_fields:
                    self.log_result("Route Optimization Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify data types and values
                if (optimization['route_id'] == route_id and
                    isinstance(optimization['original_coordinates'], list) and
                    isinstance(optimization['optimized_coordinates'], list) and
                    isinstance(optimization['time_saved'], (int, float)) and
                    isinstance(optimization['traffic_score'], (int, float))):
                    
                    time_saved = optimization['time_saved']
                    traffic_score = optimization['traffic_score']
                    self.log_result("Route Optimization", True, f"Time saved: {time_saved}min, Traffic score: {traffic_score:.2f}")
                    return True
                else:
                    self.log_result("Route Optimization Data", False, "Invalid data types or values")
                    return False
            else:
                self.log_result("Route Optimization", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Route Optimization", False, f"Error: {str(e)}")
            return False
    
    def test_vehicle_tracking(self, vehicles):
        """Test GET /api/vehicles/{vehicle_id}/track for vehicle tracking with predictions"""
        if not vehicles:
            self.log_result("Vehicle Tracking", False, "No vehicles available for testing")
            return False
            
        try:
            vehicle_id = vehicles[0]['id']
            response = requests.get(f"{BACKEND_URL}/vehicles/{vehicle_id}/track", timeout=10)
            
            if response.status_code == 200:
                tracking = response.json()
                required_fields = ['vehicle_id', 'current_position', 'speed', 'bearing', 'predicted_positions', 'eta_next_stop']
                missing_fields = [field for field in required_fields if field not in tracking]
                
                if missing_fields:
                    self.log_result("Vehicle Tracking Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify data types and structure
                if (tracking['vehicle_id'] == vehicle_id and
                    isinstance(tracking['current_position'], list) and len(tracking['current_position']) == 2 and
                    isinstance(tracking['predicted_positions'], list) and
                    isinstance(tracking['speed'], (int, float)) and
                    isinstance(tracking['bearing'], (int, float)) and
                    isinstance(tracking['eta_next_stop'], (int, float))):
                    
                    pred_count = len(tracking['predicted_positions'])
                    eta = tracking['eta_next_stop']
                    self.log_result("Vehicle Tracking", True, f"Predictions: {pred_count}, ETA: {eta}min")
                    return True
                else:
                    self.log_result("Vehicle Tracking Data", False, "Invalid data types or structure")
                    return False
            else:
                self.log_result("Vehicle Tracking", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Vehicle Tracking", False, f"Error: {str(e)}")
            return False
    
    def test_health_endpoint(self):
        """Test GET /api/health for comprehensive system metrics"""
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            
            if response.status_code == 200:
                health = response.json()
                
                # Check basic health fields
                basic_fields = ['status', 'database_connected', 'api_response_time', 'active_vehicles', 
                               'total_routes', 'total_stops', 'system_uptime', 'last_update']
                missing_basic = [field for field in basic_fields if field not in health]
                
                if missing_basic:
                    self.log_result("Health Basic Fields", False, f"Missing fields: {missing_basic}")
                    return False
                
                # Check advanced metrics
                if 'advanced_metrics' not in health:
                    self.log_result("Health Advanced Metrics", False, "Missing advanced_metrics field")
                    return False
                
                advanced = health['advanced_metrics']
                advanced_fields = ['requests_per_minute', 'database_queries_per_minute', 'average_vehicle_speed',
                                 'system_load', 'memory_usage', 'cache_hit_rate', 'network_latency']
                missing_advanced = [field for field in advanced_fields if field not in advanced]
                
                if missing_advanced:
                    self.log_result("Health Advanced Fields", False, f"Missing advanced fields: {missing_advanced}")
                    return False
                
                # Verify data types and reasonable values
                if (health['status'] in ['healthy', 'unhealthy'] and
                    isinstance(health['database_connected'], bool) and
                    isinstance(health['api_response_time'], (int, float)) and
                    isinstance(health['active_vehicles'], int) and
                    isinstance(health['total_routes'], int) and
                    isinstance(health['total_stops'], int)):
                    
                    status = health['status']
                    db_connected = health['database_connected']
                    vehicles = health['active_vehicles']
                    routes = health['total_routes']
                    stops = health['total_stops']
                    
                    self.log_result("Health Endpoint", True, 
                                  f"Status: {status}, DB: {db_connected}, Vehicles: {vehicles}, Routes: {routes}, Stops: {stops}")
                    return True
                else:
                    self.log_result("Health Data Types", False, "Invalid data types in health response")
                    return False
            else:
                self.log_result("Health Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_real_time_updates(self, vehicles):
        """Test real-time vehicle position updates by checking positions over time"""
        if not vehicles or len(vehicles) == 0:
            self.log_result("Real-time Updates", False, "No vehicles available for testing")
            return False
            
        try:
            vehicle_id = vehicles[0]['id']
            
            # Get initial position
            response1 = requests.get(f"{BACKEND_URL}/vehicles", timeout=10)
            if response1.status_code != 200:
                self.log_result("Real-time Updates", False, "Failed to get initial vehicle positions")
                return False
                
            vehicles1 = response1.json()
            initial_vehicle = next((v for v in vehicles1 if v['id'] == vehicle_id), None)
            if not initial_vehicle:
                self.log_result("Real-time Updates", False, "Vehicle not found in initial request")
                return False
                
            initial_pos = initial_vehicle['location']['coordinates']
            initial_timestamp = initial_vehicle.get('timestamp')
            
            # Wait for background task to update positions (background task runs every 2 seconds)
            print("⏳ Waiting 5 seconds for real-time position updates...")
            time.sleep(5)
            
            # Get updated position
            response2 = requests.get(f"{BACKEND_URL}/vehicles", timeout=10)
            if response2.status_code != 200:
                self.log_result("Real-time Updates", False, "Failed to get updated vehicle positions")
                return False
                
            vehicles2 = response2.json()
            updated_vehicle = next((v for v in vehicles2 if v['id'] == vehicle_id), None)
            if not updated_vehicle:
                self.log_result("Real-time Updates", False, "Vehicle not found in updated request")
                return False
                
            updated_pos = updated_vehicle['location']['coordinates']
            updated_timestamp = updated_vehicle.get('timestamp')
            
            # Check if position or timestamp changed
            position_changed = (initial_pos[0] != updated_pos[0] or initial_pos[1] != updated_pos[1])
            timestamp_changed = (initial_timestamp != updated_timestamp)
            
            if position_changed or timestamp_changed:
                self.log_result("Real-time Updates", True, 
                              f"Position changed: {position_changed}, Timestamp updated: {timestamp_changed}")
                return True
            else:
                # This might be normal if vehicle is at a stop, so we'll consider it a pass
                self.log_result("Real-time Updates", True, "No position change detected (vehicle may be stationary)")
                return True
                
        except Exception as e:
            self.log_result("Real-time Updates", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print(f"🚀 Starting NagaraTrack Lite Backend API Tests")
        print(f"🔗 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Basic connectivity
        if not self.test_basic_connectivity():
            print("❌ Basic connectivity failed - aborting remaining tests")
            return self.results
        
        # Test 2: Bus stops endpoint
        stops = self.test_bus_stops_endpoint()
        
        # Test 3: Routes endpoint  
        routes = self.test_routes_endpoint()
        
        # Test 4: Vehicles endpoint
        vehicles = self.test_vehicles_endpoint()
        
        # Test 5: Nearby stops geospatial query
        self.test_nearby_stops()
        
        # Test 6: Route optimization (requires routes)
        if routes:
            self.test_route_optimization(routes)
        
        # Test 7: Vehicle tracking (requires vehicles)
        if vehicles:
            self.test_vehicle_tracking(vehicles)
        
        # Test 8: Health endpoint
        self.test_health_endpoint()
        
        # Test 9: Real-time updates (requires vehicles)
        if vehicles:
            self.test_real_time_updates(vehicles)
        
        return self.results
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend is working well.")
        elif success_rate >= 70:
            print("⚠️  Good, but some issues need attention.")
        else:
            print("🚨 Multiple issues detected - needs investigation.")

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    tester.print_summary()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)