import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";

// Fix Leaflet generic marker icon missing issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom icon for Milkman (Start)
const milkmanIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom icon for Customers (Stops)
const customerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LocationPoint {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
    type: 'milkman' | 'customer';
}

interface RouteMapProps {
    locations: LocationPoint[];
    height?: string;
}

// Component to fit map bounds to all markers
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

export function RouteMap({ locations, height = "400px" }: RouteMapProps) {
    if (!locations || locations.length === 0) return null;

    const milkmanLoc = locations.find(l => l.type === 'milkman');
    const customerLocs = locations.filter(l => l.type === 'customer');

    // Create bounds including all points
    const allPoints = locations.map(l => [l.lat, l.lng] as [number, number]);
    const bounds = L.latLngBounds(allPoints);

    // Simple sorting to create a logical path (This is a naive route optimization: Nearest Neighbor could be better but sufficient for display)
    // For actual navigation, we defer to Google Maps.
    // Here we just draw lines connecting them in order of the array passed, or sort by distance from start.
    const sortedPoints = [milkmanLoc, ...customerLocs].filter(Boolean) as LocationPoint[];
    const polylinePositions = sortedPoints.map(l => [l.lat, l.lng] as [number, number]);

    const handleStartNavigation = () => {
        if (!milkmanLoc) return;

        // Construct Google Maps URL
        // https://www.google.com/maps/dir/?api=1&origin=Start&destination=End&waypoints=W1|W2...
        // Destination should be the last point or back to start? Usually last customer.

        const origin = `${milkmanLoc.lat},${milkmanLoc.lng}`;
        // If there are customers, set the last one as destination, others as waypoints
        if (customerLocs.length > 0) {
            const destination = `${customerLocs[customerLocs.length - 1].lat},${customerLocs[customerLocs.length - 1].lng}`;
            const waypoints = customerLocs.slice(0, -1).map(l => `${l.lat},${l.lng}`).join('|');

            let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
            if (waypoints) {
                url += `&waypoints=${waypoints}`;
            }
            window.open(url, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${origin}`, '_blank');
        }
    };

    return (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm" style={{ height }}>
            <MapContainer
                center={[milkmanLoc?.lat || 20.5937, milkmanLoc?.lng || 78.9629]}
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.map((loc, idx) => (
                    <Marker
                        key={idx}
                        position={[loc.lat, loc.lng]}
                        icon={loc.type === 'milkman' ? milkmanIcon : customerIcon}
                    >
                        <Popup>
                            <div className="font-semibold">{loc.name}</div>
                            <div className="text-xs text-gray-500">{loc.address}</div>
                            <div className="text-xs font-bold mt-1 uppercase">{loc.type}</div>
                        </Popup>
                    </Marker>
                ))}

                {polylinePositions.length > 1 && (
                    <Polyline positions={polylinePositions} color="blue" weight={3} opacity={0.7} dashArray="10, 10" />
                )}

                <ChangeView bounds={bounds} />
            </MapContainer>

            <div className="absolute bottom-4 right-4 z-[400]">
                <Button
                    onClick={handleStartNavigation}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                    <Navigation className="mr-2 h-4 w-4" />
                    Start Navigation via Google Maps
                </Button>
            </div>
        </div>
    );
}
