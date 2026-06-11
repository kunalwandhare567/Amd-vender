"""
Route Optimization Engine
- Dijkstra shortest-path on Mumbai–Thane–Pune road graph
- TSP multi-stop ordering (nearest-neighbour heuristic)
- Reroute with blocked edges (incident avoidance)
"""

import heapq
import json
import math
from typing import Any, Dict, List, Optional, Tuple
from itertools import permutations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Incident

router = APIRouter(prefix="/api/route", tags=["routing"])

# ────────────────────────────────────────────────────────────
# Road-network graph: nodes = locations, edges = roads
# Each node: { "lat": float, "lng": float }
# Each edge: (node_a, node_b, distance_km)
# ────────────────────────────────────────────────────────────

NODES: Dict[str, Dict[str, float]] = {
    "Mumbai Port":            {"lat": 18.9388, "lng": 72.8354},
    "Dadar Hub":              {"lat": 19.0178, "lng": 72.8478},
    "Thane Warehouse":        {"lat": 19.2183, "lng": 72.9781},
    "Navi Mumbai Hub":        {"lat": 19.0330, "lng": 73.0297},
    "Panvel Junction":        {"lat": 18.9894, "lng": 73.1175},
    "Khopoli Depot":          {"lat": 18.7860, "lng": 73.3414},
    "Lonavala Junction":      {"lat": 18.7546, "lng": 73.4063},
    "Talegaon Depot":         {"lat": 18.7350, "lng": 73.6757},
    "Pimpri Chinchwad Plant": {"lat": 18.6278, "lng": 73.8131},
    "Pune Chakan MIDC":       {"lat": 18.7606, "lng": 73.8600},
    "Pune City Center":       {"lat": 18.5204, "lng": 73.8567},
    "Kalyan Depot":           {"lat": 19.2437, "lng": 73.1355},
    "Bhiwandi Logistics":     {"lat": 19.2967, "lng": 73.0631},
}

# Edges: (from, to, distance_km)
EDGES: List[Tuple[str, str, float]] = [
    ("Mumbai Port",            "Dadar Hub",              12),
    ("Dadar Hub",              "Thane Warehouse",        25),
    ("Dadar Hub",              "Navi Mumbai Hub",        22),
    ("Thane Warehouse",        "Navi Mumbai Hub",        28),
    ("Thane Warehouse",        "Kalyan Depot",           18),
    ("Thane Warehouse",        "Bhiwandi Logistics",     15),
    ("Kalyan Depot",           "Bhiwandi Logistics",     12),
    ("Kalyan Depot",           "Panvel Junction",        35),
    ("Navi Mumbai Hub",        "Panvel Junction",        18),
    ("Panvel Junction",        "Khopoli Depot",          40),
    ("Khopoli Depot",          "Lonavala Junction",      20),
    ("Lonavala Junction",      "Talegaon Depot",         30),
    ("Talegaon Depot",         "Pimpri Chinchwad Plant", 25),
    ("Talegaon Depot",         "Pune Chakan MIDC",       22),
    ("Pimpri Chinchwad Plant", "Pune Chakan MIDC",       18),
    ("Pimpri Chinchwad Plant", "Pune City Center",       20),
    ("Pune Chakan MIDC",       "Pune City Center",       25),
    ("Lonavala Junction",      "Pune Chakan MIDC",       50),
    ("Bhiwandi Logistics",     "Panvel Junction",        30),
]


def _build_adjacency(
    blocked_edges: Optional[List[Tuple[str, str]]] = None,
) -> Dict[str, List[Tuple[str, float]]]:
    """Build adjacency list, optionally blocking specific edges."""
    adj: Dict[str, List[Tuple[str, float]]] = {n: [] for n in NODES}
    blocked = set()
    if blocked_edges:
        for a, b in blocked_edges:
            blocked.add((a, b))
            blocked.add((b, a))

    for a, b, d in EDGES:
        if (a, b) not in blocked:
            adj[a].append((b, d))
            adj[b].append((a, d))
    return adj


def dijkstra(
    source: str,
    destination: str,
    blocked_edges: Optional[List[Tuple[str, str]]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Dijkstra shortest path.
    Returns {"path": [node_names], "distance_km": float, "coordinates": [{lat,lng,name}]}
    or None if unreachable.
    """
    adj = _build_adjacency(blocked_edges)

    dist = {n: math.inf for n in NODES}
    prev: Dict[str, Optional[str]] = {n: None for n in NODES}
    dist[source] = 0.0
    pq = [(0.0, source)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == destination:
            break
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))

    if dist[destination] == math.inf:
        return None

    # Reconstruct path
    path = []
    node = destination
    while node is not None:
        path.append(node)
        node = prev[node]
    path.reverse()

    coordinates = [
        {"lat": NODES[n]["lat"], "lng": NODES[n]["lng"], "name": n}
        for n in path
    ]

    return {
        "path": path,
        "distance_km": round(dist[destination], 2),
        "coordinates": coordinates,
    }


def solve_tsp(
    start: str,
    stops: List[str],
    end: str,
) -> Dict[str, Any]:
    """
    TSP nearest-neighbour heuristic for multi-stop routes.
    Returns optimised stop order and total distance.
    """
    if not stops:
        result = dijkstra(start, end)
        return {
            "ordered_stops": [],
            "total_distance_km": result["distance_km"] if result else 0,
            "full_path": result["path"] if result else [],
            "coordinates": result["coordinates"] if result else [],
        }

    # For small N (<=6), brute-force exact solution
    if len(stops) <= 6:
        best_order = None
        best_dist = math.inf

        for perm in permutations(stops):
            total = 0
            waypoints = [start] + list(perm) + [end]
            valid = True
            for i in range(len(waypoints) - 1):
                seg = dijkstra(waypoints[i], waypoints[i + 1])
                if seg is None:
                    valid = False
                    break
                total += seg["distance_km"]
            if valid and total < best_dist:
                best_dist = total
                best_order = list(perm)

        if best_order is None:
            return {"ordered_stops": stops, "total_distance_km": 0, "full_path": [], "coordinates": []}

        # Build full path for best order
        full_path = []
        coordinates = []
        waypoints = [start] + best_order + [end]
        for i in range(len(waypoints) - 1):
            seg = dijkstra(waypoints[i], waypoints[i + 1])
            if seg:
                if full_path:
                    full_path.extend(seg["path"][1:])
                    coordinates.extend(seg["coordinates"][1:])
                else:
                    full_path.extend(seg["path"])
                    coordinates.extend(seg["coordinates"])

        return {
            "ordered_stops": best_order,
            "total_distance_km": round(best_dist, 2),
            "full_path": full_path,
            "coordinates": coordinates,
        }

    # Nearest-neighbour fallback for larger N
    remaining = set(stops)
    ordered = []
    current = start
    total = 0

    while remaining:
        nearest = None
        nearest_dist = math.inf
        for s in remaining:
            seg = dijkstra(current, s)
            if seg and seg["distance_km"] < nearest_dist:
                nearest = s
                nearest_dist = seg["distance_km"]
        if nearest is None:
            break
        ordered.append(nearest)
        total += nearest_dist
        current = nearest
        remaining.remove(nearest)

    # Final leg to end
    final = dijkstra(current, end)
    if final:
        total += final["distance_km"]

    # Build full path
    full_path = []
    coordinates = []
    waypoints = [start] + ordered + [end]
    for i in range(len(waypoints) - 1):
        seg = dijkstra(waypoints[i], waypoints[i + 1])
        if seg:
            if full_path:
                full_path.extend(seg["path"][1:])
                coordinates.extend(seg["coordinates"][1:])
            else:
                full_path.extend(seg["path"])
                coordinates.extend(seg["coordinates"])

    return {
        "ordered_stops": ordered,
        "total_distance_km": round(total, 2),
        "full_path": full_path,
        "coordinates": coordinates,
    }


def find_nearest_node(lat: float, lng: float) -> str:
    """Find the closest graph node to a GPS coordinate."""
    best = None
    best_dist = math.inf
    for name, coord in NODES.items():
        d = math.sqrt((coord["lat"] - lat) ** 2 + (coord["lng"] - lng) ** 2)
        if d < best_dist:
            best_dist = d
            best = name
    return best


# ────────────────────────────────────────────────────────────
# API Endpoints
# ────────────────────────────────────────────────────────────

class RouteRequest(BaseModel):
    source: str
    destination: str
    stops: Optional[List[str]] = None  # intermediate waypoints for TSP


class RerouteRequest(BaseModel):
    current_lat: float
    current_lng: float
    destination: str
    blocked_segments: Optional[List[List[str]]] = None  # [[nodeA, nodeB], ...]
    incident_id: Optional[str] = None


@router.get("/nodes")
def get_all_nodes():
    """Return all graph nodes with coordinates for frontend map rendering."""
    return {
        "nodes": [
            {"name": name, "lat": coord["lat"], "lng": coord["lng"]}
            for name, coord in NODES.items()
        ],
        "edges": [
            {"from": a, "to": b, "distance_km": d}
            for a, b, d in EDGES
        ],
    }


@router.post("/calculate")
def calculate_route(req: RouteRequest):
    """Calculate optimal route using Dijkstra (or TSP if stops provided)."""
    if req.source not in NODES:
        raise HTTPException(400, f"Unknown source node: {req.source}")
    if req.destination not in NODES:
        raise HTTPException(400, f"Unknown destination node: {req.destination}")

    if req.stops:
        for s in req.stops:
            if s not in NODES:
                raise HTTPException(400, f"Unknown stop node: {s}")
        result = solve_tsp(req.source, req.stops, req.destination)
        return {"algorithm": "tsp", **result}

    result = dijkstra(req.source, req.destination)
    if result is None:
        raise HTTPException(404, "No path found between source and destination")
    return {"algorithm": "dijkstra", **result}


@router.post("/reroute")
def reroute_around_incident(req: RerouteRequest, session: Session = Depends(get_session)):
    """
    Reroute from current GPS position to destination, avoiding blocked segments.
    Automatically detects blocked edges from active incidents near roads.
    """
    current_node = find_nearest_node(req.current_lat, req.current_lng)

    if req.destination not in NODES:
        raise HTTPException(400, f"Unknown destination: {req.destination}")

    blocked = []
    if req.blocked_segments:
        blocked = [(seg[0], seg[1]) for seg in req.blocked_segments]

    # Also check active incidents in the database for blocked roads
    active_incidents = session.exec(
        select(Incident).where(Incident.status == "Active", Incident.lat.isnot(None))
    ).all()

    for inc in active_incidents:
        inc_node = find_nearest_node(inc.lat, inc.lng)
        # Block all edges touching the incident node
        for a, b, _ in EDGES:
            if a == inc_node or b == inc_node:
                blocked.append((a, b))

    # Calculate original route (without blocks) for comparison
    original = dijkstra(current_node, req.destination)

    # Calculate rerouted path
    rerouted = dijkstra(current_node, req.destination, blocked_edges=blocked)

    if rerouted is None:
        raise HTTPException(404, "No alternative path available")

    delay_km = round(rerouted["distance_km"] - (original["distance_km"] if original else 0), 2)

    return {
        "from_node": current_node,
        "destination": req.destination,
        "original_route": original,
        "rerouted_route": rerouted,
        "additional_distance_km": max(0, delay_km),
        "blocked_nodes": list({find_nearest_node(inc.lat, inc.lng) for inc in active_incidents if inc.lat}),
    }
