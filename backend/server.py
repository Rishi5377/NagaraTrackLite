from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import random
import math
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Global variables for tracking system state
system_metrics = {
    'api_requests': 0,
    'database_queries': 0,
    'active_vehicles': 0,
    'system_uptime': datetime.now(timezone.utc),
    'last_update': datetime.now(timezone.utc)
}

# Vehicle position cache for smooth animations
vehicle_positions = {}

# Route optimization cache
route_cache = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database with seed data
    await initialize_database()
    # Start background tasks
    asyncio.create_task(update_vehicle_positions())
    asyncio.create_task(update_system_metrics())
    yield
    # Shutdown: Close database connection
    client.close()

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# Pydantic Models
class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class BusStop(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stop_id: str
    name: str
    location: GeoPoint
    code: str
    amenities: List[str] = []
    accessibility: bool = True

class Route(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str
    description: str
    coordinates: List[List[float]]  # Array of [lng, lat] points
    stops: List[str] = []  # Stop IDs
    distance: float = 0.0  # in km
    estimated_time: int = 0  # in minutes

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    route_id: str
    vehicle_number: str
    location: GeoPoint
    bearing: float
    speed: float  # km/h
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    occupancy: int = 0  # passenger count
    status: str = "active"  # active, maintenance, offline
    next_stop: str = ""
    delay: int = 0  # in minutes

class SystemHealth(BaseModel):
    status: str
    database_connected: bool
    api_response_time: float
    active_vehicles: int
    total_routes: int
    total_stops: int
    system_uptime: str
    last_update: datetime
    advanced_metrics: Dict[str, Any]

# Database initialization with realistic seed data
async def initialize_database():
    # Check if data already exists
    existing_stops = await db.bus_stops.count_documents({})
    if existing_stops > 0:
        return
    
    # Realistic Mumbai bus stops data
    bus_stops_data = [
        {"stop_id": "CST001", "name": "Chhatrapati Shivaji Terminus", "location": {"type": "Point", "coordinates": [72.8347, 18.9394]}, "code": "CST", "amenities": ["shelter", "seating", "digital_display"]},
        {"stop_id": "BKC002", "name": "Bandra Kurla Complex", "location": {"type": "Point", "coordinates": [72.8697, 19.0638]}, "code": "BKC", "amenities": ["shelter", "seating"]},
        {"stop_id": "JUH003", "name": "Juhu Beach", "location": {"type": "Point", "coordinates": [72.8267, 19.0968]}, "code": "JUH", "amenities": ["shelter"]},
        {"stop_id": "AND004", "name": "Andheri Station", "location": {"type": "Point", "coordinates": [72.8397, 19.1197]}, "code": "AND", "amenities": ["shelter", "seating", "digital_display", "wifi"]},
        {"stop_id": "POW005", "name": "Powai Lake", "location": {"type": "Point", "coordinates": [72.8977, 19.1247]}, "code": "POW", "amenities": ["shelter", "seating"]},
        {"stop_id": "VRL006", "name": "Versova", "location": {"type": "Point", "coordinates": [72.8097, 19.1317]}, "code": "VRL", "amenities": ["shelter"]},
        {"stop_id": "GTW007", "name": "Gateway of India", "location": {"type": "Point", "coordinates": [72.8347, 18.9218]}, "code": "GTW", "amenities": ["shelter", "seating", "tourist_info"]},
        {"stop_id": "NFH008", "name": "Nariman Point", "location": {"type": "Point", "coordinates": [72.8226, 18.9267]}, "code": "NFH", "amenities": ["shelter", "seating", "digital_display"]}
    ]
    
    # Insert bus stops
    for stop_data in bus_stops_data:
        stop_data['id'] = str(uuid.uuid4())
        stop_data['accessibility'] = True
    await db.bus_stops.insert_many(bus_stops_data)
    
    # Create 2dsphere index for geospatial queries
    await db.bus_stops.create_index([("location", "2dsphere")])
    
    # Routes data with realistic Mumbai routes
    routes_data = [
        {
            "name": "Express Line 1: CST - Andheri",
            "color": "#FF6B6B",
            "description": "High-frequency express route connecting South Mumbai to Western suburbs",
            "coordinates": [
                [72.8347, 18.9394],  # CST
                [72.8297, 18.9494],  # Marine Drive
                [72.8226, 18.9267],  # Nariman Point
                [72.8347, 18.9618],  # Opera House
                [72.8247, 19.0176],  # Worli
                [72.8197, 19.0338],  # Mahim
                [72.8297, 19.0548],  # Bandra
                [72.8397, 19.0748],  # Santacruz
                [72.8397, 19.1197]   # Andheri
            ],
            "stops": ["CST001", "NFH008", "AND004"],
            "distance": 28.5,
            "estimated_time": 65
        },
        {
            "name": "Coastal Route 2: Gateway - Juhu",
            "color": "#4ECDC4",
            "description": "Scenic coastal route connecting tourist destinations",
            "coordinates": [
                [72.8347, 18.9218],  # Gateway of India
                [72.8276, 18.9358],  # Colaba
                [72.8226, 18.9467],  # Cuffe Parade
                [72.8197, 18.9876],  # Breach Candy
                [72.8147, 19.0376],  # Haji Ali
                [72.8197, 19.0576],  # Mahim Bay
                [72.8267, 19.0968]   # Juhu Beach
            ],
            "stops": ["GTW007", "NFH008", "JUH003"],
            "distance": 22.3,
            "estimated_time": 55
        },
        {
            "name": "Tech Route 3: BKC - Powai",
            "color": "#45B7D1",
            "description": "Business district connector for IT professionals",
            "coordinates": [
                [72.8697, 19.0638],  # BKC
                [72.8797, 19.0738],  # SEEPZ
                [72.8897, 19.0938],  # Chakala
                [72.8977, 19.1047],  # JVLR
                [72.8977, 19.1247]   # Powai Lake
            ],
            "stops": ["BKC002", "POW005"],
            "distance": 18.7,
            "estimated_time": 42
        }
    ]
    
    # Insert routes
    for route_data in routes_data:
        route_data['id'] = str(uuid.uuid4())
    await db.routes.insert_many(routes_data)
    
    # Get inserted route IDs for vehicles
    routes = await db.routes.find().to_list(None)
    
    # Vehicles data
    vehicles_data = []
    vehicle_numbers = ["MH01-AB-1234", "MH01-CD-5678", "MH01-EF-9012", "MH01-GH-3456", "MH01-IJ-7890"]
    
    for i, route in enumerate(routes):
        for j in range(2):  # 2 vehicles per route
            vehicle = {
                "route_id": route['id'],
                "vehicle_number": f"{vehicle_numbers[i]}{j+1:02d}",
                "location": {"type": "Point", "coordinates": route['coordinates'][j % len(route['coordinates'])]},
                "bearing": random.uniform(0, 360),
                "speed": random.uniform(15, 45),
                "occupancy": random.randint(5, 50),
                "status": "active",
                "next_stop": route['stops'][0] if route['stops'] else "",
                "delay": random.randint(-2, 8),
                "timestamp": datetime.now(timezone.utc)
            }
            vehicle['id'] = str(uuid.uuid4())
            vehicles_data.append(vehicle)
    
    await db.vehicles.insert_many(vehicles_data)
    await db.vehicles.create_index([("location", "2dsphere")])
    
    global system_metrics
    system_metrics['active_vehicles'] = len(vehicles_data)
    
    logging.info("Database initialized with seed data")

# Background task to update vehicle positions for smooth animation
async def update_vehicle_positions():
    while True:
        try:
            vehicles = await db.vehicles.find({"status": "active"}).to_list(None)
            
            for vehicle in vehicles:
                # Get route coordinates
                route = await db.routes.find_one({"id": vehicle['route_id']})
                if not route:
                    continue
                    
                # Move vehicle along route with realistic speed
                current_coords = vehicle['location']['coordinates']
                route_coords = route['coordinates']
                
                # Find next position along route
                next_coords = get_next_position(current_coords, route_coords, vehicle['speed'])
                
                # Update vehicle position
                await db.vehicles.update_one(
                    {"id": vehicle['id']},
                    {
                        "$set": {
                            "location.coordinates": next_coords,
                            "bearing": calculate_bearing(current_coords, next_coords),
                            "timestamp": datetime.now(timezone.utc),
                            "speed": random.uniform(vehicle['speed'] * 0.8, vehicle['speed'] * 1.2),
                            "occupancy": max(0, vehicle['occupancy'] + random.randint(-2, 3))
                        }
                    }
                )
                
            await asyncio.sleep(2)  # Update every 2 seconds for smooth animation
            
        except Exception as e:
            logging.error(f"Error updating vehicle positions: {e}")
            await asyncio.sleep(5)

# Background task to update system metrics
async def update_system_metrics():
    while True:
        try:
            global system_metrics
            
            # Update active vehicles count
            active_count = await db.vehicles.count_documents({"status": "active"})
            system_metrics['active_vehicles'] = active_count
            system_metrics['last_update'] = datetime.now(timezone.utc)
            
            # Simulate some realistic fluctuations
            system_metrics['api_requests'] += random.randint(1, 5)
            system_metrics['database_queries'] += random.randint(2, 8)
            
            await asyncio.sleep(30)  # Update every 30 seconds
            
        except Exception as e:
            logging.error(f"Error updating system metrics: {e}")
            await asyncio.sleep(60)

def get_next_position(current_coords, route_coords, speed_kmh):
    """Calculate next position along route based on speed"""
    # Convert speed to degrees per second (rough approximation)
    speed_deg_per_sec = (speed_kmh / 111320) / 3600  # 111320 meters per degree at equator
    
    # Find closest point on route
    min_dist = float('inf')
    closest_idx = 0
    
    for i, coord in enumerate(route_coords):
        dist = calculate_distance(current_coords, coord)
        if dist < min_dist:
            min_dist = dist
            closest_idx = i
    
    # Move towards next point on route
    if closest_idx < len(route_coords) - 1:
        target = route_coords[closest_idx + 1]
    else:
        target = route_coords[0]  # Loop back to start
    
    # Calculate direction and move
    dx = target[0] - current_coords[0]
    dy = target[1] - current_coords[1]
    distance = math.sqrt(dx*dx + dy*dy)
    
    if distance > 0:
        # Normalize and scale by speed
        move_x = (dx / distance) * speed_deg_per_sec * 2  # *2 for 2-second intervals
        move_y = (dy / distance) * speed_deg_per_sec * 2
        
        new_x = current_coords[0] + move_x
        new_y = current_coords[1] + move_y
        
        return [new_x, new_y]
    
    return current_coords

def calculate_distance(coord1, coord2):
    """Calculate distance between two coordinates"""
    dx = coord1[0] - coord2[0]
    dy = coord1[1] - coord2[1]
    return math.sqrt(dx*dx + dy*dy)

def calculate_bearing(coord1, coord2):
    """Calculate bearing between two coordinates"""
    dx = coord2[0] - coord1[0]
    dy = coord2[1] - coord1[1]
    bearing = math.atan2(dx, dy) * 180 / math.pi
    return (bearing + 360) % 360

# API Endpoints
@api_router.get("/")
async def root():
    global system_metrics
    system_metrics['api_requests'] += 1
    return {"message": "NagaraTrack Lite API - Advanced Bus Tracking System"}

@api_router.get("/stops", response_model=List[BusStop])
async def get_bus_stops(limit: int = 100):
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    stops = await db.bus_stops.find().limit(limit).to_list(None)
    return [BusStop(**stop) for stop in stops]

@api_router.get("/stops/nearby")
async def get_nearby_stops(lng: float, lat: float, radius: int = 1000):
    """Get stops within radius (meters) of a location"""
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    stops = await db.bus_stops.find({
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius
            }
        }
    }).to_list(None)
    
    return [BusStop(**stop) for stop in stops]

@api_router.get("/routes", response_model=List[Route])
async def get_routes():
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    routes = await db.routes.find().to_list(None)
    return [Route(**route) for route in routes]

@api_router.get("/routes/{route_id}/optimize")
async def optimize_route(route_id: str):
    """Get optimized route with traffic considerations"""
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    route = await db.routes.find_one({"id": route_id})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Simulate route optimization (in real app, this would use traffic APIs)
    optimized_coords = route['coordinates'].copy()
    
    # Add some realistic optimization (slight route adjustments)
    for i in range(1, len(optimized_coords) - 1):
        # Add small random variations to simulate traffic optimization
        optimized_coords[i][0] += random.uniform(-0.001, 0.001)
        optimized_coords[i][1] += random.uniform(-0.001, 0.001)
    
    # Simulate improved metrics
    optimized_time = int(route['estimated_time'] * random.uniform(0.85, 0.95))
    traffic_score = random.uniform(0.6, 1.0)
    
    return {
        "route_id": route_id,
        "original_coordinates": route['coordinates'],
        "optimized_coordinates": optimized_coords,
        "time_saved": route['estimated_time'] - optimized_time,
        "traffic_score": traffic_score,
        "optimization_applied": True
    }

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(route_id: Optional[str] = None):
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    query = {}
    if route_id:
        query["route_id"] = route_id
    
    vehicles = await db.vehicles.find(query).to_list(None)
    return [Vehicle(**vehicle) for vehicle in vehicles]

@api_router.get("/vehicles/{vehicle_id}/track")
async def track_vehicle(vehicle_id: str, duration: int = 300):
    """Get vehicle tracking history and prediction"""
    global system_metrics
    system_metrics['api_requests'] += 1
    system_metrics['database_queries'] += 1
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    route = await db.routes.find_one({"id": vehicle['route_id']})
    
    # Simulate tracking history and predictions
    current_pos = vehicle['location']['coordinates']
    tracking_data = {
        "vehicle_id": vehicle_id,
        "current_position": current_pos,
        "speed": vehicle['speed'],
        "bearing": vehicle['bearing'],
        "predicted_positions": [],
        "eta_next_stop": random.randint(3, 12),
        "route_progress": random.uniform(0.1, 0.9)
    }
    
    # Generate predicted positions
    if route:
        route_coords = route['coordinates']
        for i in range(5):  # Next 5 positions
            pred_pos = get_next_position(current_pos, route_coords, vehicle['speed'])
            tracking_data['predicted_positions'].append(pred_pos)
            current_pos = pred_pos
    
    return tracking_data

@api_router.get("/health")
async def health_check():
    global system_metrics
    system_metrics['api_requests'] += 1
    
    try:
        # Test database connection
        start_time = datetime.now()
        await db.vehicles.count_documents({})
        db_response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Get counts
        total_routes = await db.routes.count_documents({})
        total_stops = await db.bus_stops.count_documents({})
        active_vehicles = await db.vehicles.count_documents({"status": "active"})
        
        # Calculate uptime
        uptime_delta = datetime.now(timezone.utc) - system_metrics['system_uptime']
        uptime_str = str(uptime_delta).split('.')[0]  # Remove microseconds
        
        # Advanced metrics
        advanced_metrics = {
            "requests_per_minute": system_metrics['api_requests'],
            "database_queries_per_minute": system_metrics['database_queries'],
            "average_vehicle_speed": random.uniform(25, 35),
            "system_load": random.uniform(0.2, 0.8),
            "memory_usage": random.uniform(0.4, 0.7),
            "cache_hit_rate": random.uniform(0.85, 0.95),
            "network_latency": random.uniform(10, 50)
        }
        
        health = SystemHealth(
            status="healthy",
            database_connected=True,
            api_response_time=db_response_time,
            active_vehicles=active_vehicles,
            total_routes=total_routes,
            total_stops=total_stops,
            system_uptime=uptime_str,
            last_update=system_metrics['last_update'],
            advanced_metrics=advanced_metrics
        )
        
        return health
        
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return SystemHealth(
            status="unhealthy",
            database_connected=False,
            api_response_time=0,
            active_vehicles=0,
            total_routes=0,
            total_stops=0,
            system_uptime="0:00:00",
            last_update=datetime.now(timezone.utc),
            advanced_metrics={"error": str(e)}
        )

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("NagaraTrack Lite API server starting...")