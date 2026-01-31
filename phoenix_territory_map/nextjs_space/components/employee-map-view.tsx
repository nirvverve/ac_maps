
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAreaDisplayName } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  zip: string;
  title: string;
  currentLocation: string;
  recommendedOffice: string;
  troyAssignment?: string;
  distanceToRecommended: number;
  manager: string;
  distanceToWest: number;
  distanceToCentral: number;
  distanceToEast: number;
}

interface Office {
  zipCode: string;
  area: string;
  category: string;
  label: string;
  fullName?: string;
  lat: number;
  lng: number;
}

export default function EmployeeMapView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filterOffice, setFilterOffice] = useState<string>('all');
  const [territoryAssignments, setTerritoryAssignments] = useState<any[]>([]);
  const [zipBoundaries, setZipBoundaries] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/employee-locations.json').then(res => res.json()),
      fetch('/office-locations.json').then(res => res.json()),
      fetch('/phoenix-tucson-map-data.json').then(res => res.json()),
      fetch('/az-zip-boundaries.json').then(res => res.json())
    ]).then(([empData, officeData, territoryData, boundariesData]) => {
      setEmployees(empData);
      setOffices(officeData);
      setTerritoryAssignments(territoryData);
      setZipBoundaries(boundariesData);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google || employees.length === 0) return;

    const mapInstance = new google.maps.Map(document.getElementById('employee-map')!, {
      zoom: 10,
      center: { lat: 33.4484, lng: -112.0740 },
      mapTypeId: 'roadmap',
    });

    setMap(mapInstance);

    // Draw territory boundaries
    if (territoryAssignments.length > 0 && zipBoundaries) {
      const territoriesMap = new Map<string, any[]>();
      
      territoryAssignments.forEach(assignment => {
        if (!territoriesMap.has(assignment.area)) {
          territoriesMap.set(assignment.area, []);
        }
        
        const boundary = zipBoundaries.features?.find(
          (f: any) => f.properties?.ZCTA5CE10 === assignment.zip
        );
        
        if (boundary) {
          territoriesMap.get(assignment.area)?.push(boundary.geometry);
        }
      });

      // Draw territory boundaries for each area with unified appearance
      const territoryColors: Record<string, string> = {
        West: '#3b82f6',
        Central: '#10b981',
        East: '#f97316',
        Tucson: '#ec4899',
      };

      territoriesMap.forEach((geometries, area) => {
        const color = territoryColors[area] || '#6b7280';
        
        geometries.forEach(geometry => {
          const paths = convertGeometryToPaths(geometry);
          
          paths.forEach((path: google.maps.LatLngLiteral[]) => {
            new google.maps.Polygon({
              paths: path,
              strokeColor: color,
              strokeOpacity: 0.15,
              strokeWeight: 0.5,
              fillColor: color,
              fillOpacity: 0.15,
              map: mapInstance,
              clickable: false,
              zIndex: 1,
            });
          });
        });
        
        // Draw outer boundary with prominent stroke
        const allPaths: google.maps.LatLngLiteral[] = [];
        geometries.forEach(geometry => {
          const paths = convertGeometryToPaths(geometry);
          paths.forEach((path: google.maps.LatLngLiteral[]) => {
            allPaths.push(...path);
          });
        });
        
        // Create convex hull for outer boundary (simplified approach)
        if (allPaths.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          allPaths.forEach(point => bounds.extend(point));
          
          // Draw a perimeter polygon using all collected paths
          // Since we can't easily compute true union, we overlay all polygons with thin strokes
          // and the outer edges will naturally form the visible boundary
        }
      });
    }

    // Draw office locations as stars
    offices.forEach(office => {
      // Color based on area - matching the territory boundaries
      const officeColors: Record<string, string> = {
        West: '#3b82f6',
        Central: '#10b981',
        East: '#f97316',
        Tucson: '#ec4899',
      };
      
      const color = officeColors[office.area] || (office.category === 'NEXT YEAR' ? '#ef4444' : '#f97316');
      
      const starMarker = new google.maps.Marker({
        position: { lat: office.lat, lng: office.lng },
        map: mapInstance,
        icon: {
          path: 'M 0,-24 L 7,-7 L 24,-7 L 10,3 L 15,20 L 0,10 L -15,20 L -10,3 L -24,-7 L -7,-7 Z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 0.8,
        },
        title: office.label,
        zIndex: 1000,
      });

      const displayName = office.fullName || getAreaDisplayName(office.area);
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${office.label}</h3>
            <p style="color: #666; margin: 0;">${displayName}</p>
          </div>
        `,
      });

      starMarker.addListener('click', () => {
        infoWindow.open(mapInstance, starMarker);
      });
    });

    // Draw employee locations
    const filteredEmployees = filterOffice === 'all' 
      ? employees 
      : employees.filter(e => e.troyAssignment === filterOffice);

    filteredEmployees.forEach(emp => {
      const assignment = emp.troyAssignment || emp.recommendedOffice;
      const color = assignment === 'West' ? '#3b82f6' :
                    assignment === 'Central' ? '#10b981' :
                    assignment === 'East' ? '#8b5cf6' :
                    assignment === 'Commercial' ? '#f59e0b' :
                    assignment === 'Tucson' ? '#ec4899' :
                    '#6b7280';

      const marker = new google.maps.Marker({
        position: { lat: emp.latitude, lng: emp.longitude },
        map: mapInstance,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
        title: emp.name,
      });

      marker.addListener('click', () => {
        setSelectedEmployee(emp);
        
        const troyBranch = emp.troyAssignment || 'Not assigned';
        const prevRecommendation = emp.recommendedOffice || 'N/A';
        const assignmentMatch = troyBranch === prevRecommendation;
        
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; max-width: 320px;">
              <h3 style="font-weight: bold; margin-bottom: 8px;">${emp.name}</h3>
              <p style="margin: 4px 0;"><strong>Title:</strong> ${emp.title}</p>
              <p style="margin: 4px 0;"><strong>Location:</strong> ${emp.city}, ${emp.zip}</p>
              <p style="margin: 4px 0;"><strong>Manager:</strong> ${emp.manager}</p>
              <hr style="margin: 8px 0;">
              <p style="margin: 4px 0;"><strong>Troy's Assignment:</strong> <span style="color: #059669; font-weight: bold;">${troyBranch}</span></p>
              ${!assignmentMatch && prevRecommendation !== 'N/A' ? `
                <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
                  <em>(Previous recommendation: ${prevRecommendation})</em>
                </p>
              ` : ''}
              <hr style="margin: 8px 0;">
              <p style="margin: 4px 0; font-size: 12px;"><strong>Distances to 2026 Offices:</strong></p>
              <p style="margin: 2px 0; font-size: 12px;">• West: ${emp.distanceToWest} mi</p>
              <p style="margin: 2px 0; font-size: 12px;">• Central: ${emp.distanceToCentral} mi</p>
              <p style="margin: 2px 0; font-size: 12px;">• East: ${emp.distanceToEast} mi</p>
            </div>
          `,
        });

        infoWindow.open(mapInstance, marker);
      });
    });

  }, [employees, offices, filterOffice, territoryAssignments, zipBoundaries]);

  const officeCounts = {
    West: employees.filter(e => e.troyAssignment === 'West').length,
    Central: employees.filter(e => e.troyAssignment === 'Central').length,
    East: employees.filter(e => e.troyAssignment === 'East').length,
    Commercial: employees.filter(e => e.troyAssignment === 'Commercial').length,
    Tucson: employees.filter(e => e.troyAssignment === 'Tucson').length,
  };

  return (
    <div className="flex h-full">
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold mb-2">Employee Locations</h2>
          <p className="text-sm text-gray-600 mb-4">
            Showing home addresses with Troy&apos;s branch assignments
          </p>
          
          <div className="space-y-2">
            <button
              onClick={() => setFilterOffice('all')}
              className={`w-full px-3 py-2 text-left rounded ${
                filterOffice === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All Employees ({employees.length})
            </button>
            <button
              onClick={() => setFilterOffice('West')}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between ${
                filterOffice === 'West' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <span>West Branch</span>
              <Badge variant="secondary">{officeCounts.West}</Badge>
            </button>
            <button
              onClick={() => setFilterOffice('Central')}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between ${
                filterOffice === 'Central' ? 'bg-green-600 text-white' : 'bg-green-50 hover:bg-green-100'
              }`}
            >
              <span>Central Branch</span>
              <Badge variant="secondary">{officeCounts.Central}</Badge>
            </button>
            <button
              onClick={() => setFilterOffice('East')}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between ${
                filterOffice === 'East' ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100'
              }`}
            >
              <span>East Branch</span>
              <Badge variant="secondary">{officeCounts.East}</Badge>
            </button>
            <button
              onClick={() => setFilterOffice('Commercial')}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between ${
                filterOffice === 'Commercial' ? 'bg-amber-600 text-white' : 'bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <span>Commercial Branch</span>
              <Badge variant="secondary">{officeCounts.Commercial}</Badge>
            </button>
            <button
              onClick={() => setFilterOffice('Tucson')}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between ${
                filterOffice === 'Tucson' ? 'bg-pink-600 text-white' : 'bg-pink-50 hover:bg-pink-100'
              }`}
            >
              <span>Tucson Branch</span>
              <Badge variant="secondary">{officeCounts.Tucson}</Badge>
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>West Branch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Central Branch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span>East Branch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span>Commercial Branch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500"></div>
              <span>Tucson Branch</span>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <div className="text-red-500 text-xl">★</div>
              <span>2026 Office Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-orange-500 text-xl">★</div>
              <span>Future Office Location</span>
            </div>
          </div>

          {selectedEmployee && (
            <Card className="mt-4 p-4">
              <h3 className="font-semibold mb-2">Selected Employee</h3>
              <p className="text-sm font-medium">{selectedEmployee.name}</p>
              <p className="text-xs text-gray-600">{selectedEmployee.title}</p>
              <p className="text-xs text-gray-600 mt-1">{selectedEmployee.city}</p>
              <div className="mt-3 space-y-1">
                <p className="text-xs">
                  <span className="font-medium">Troy&apos;s Assignment:</span> {selectedEmployee.troyAssignment || 'N/A'}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Manager:</span> {selectedEmployee.manager}
                </p>
                {selectedEmployee.troyAssignment !== selectedEmployee.recommendedOffice && (
                  <p className="text-xs text-gray-500 italic">
                    (Previous rec.: {selectedEmployee.recommendedOffice})
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <div id="employee-map" className="w-full h-full"></div>
      </div>
    </div>
  );
}

function convertGeometryToPaths(geometry: any) {
  if (!geometry?.coordinates) return [];
  
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring: number[][]) =>
      ring.map(([lng, lat]: number[]) => ({ lat, lng }))
    );
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon: number[][][]) =>
      polygon.map((ring: number[][]) =>
        ring.map(([lng, lat]: number[]) => ({ lat, lng }))
      )
    );
  }
  
  return [];
}
