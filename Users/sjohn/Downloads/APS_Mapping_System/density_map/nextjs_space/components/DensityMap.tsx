
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface DensityMapProps {
  densityMode: 'active' | 'terminated' | 'both';
  selectedArea: string | null;
}

// Area colors matching the original map
const AREA_COLORS = {
  'West': '#3b82f6',    // Blue
  'Central': '#10b981', // Green
  'East': '#f97316',    // Orange
  'Tucson': '#a855f7'   // Purple
};

export default function DensityMap({ densityMode, selectedArea }: DensityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Check WebGL support
      if (!mapboxgl.supported()) {
        setMapError('WebGL is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }

      // Initialize map
      mapboxgl.accessToken = 'pk.eyJ1IjoiYWJhY3VzYWkiLCJhIjoiY20zbnkyNjYwMGJ4YzJxcHdzaXRrMG05ZiJ9.yxYa0rGJi3C42WkDKPvBGQ';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-111.9, 33.5],
      zoom: 8.5,
      maxZoom: 13,
      minZoom: 7
    });

    map.current.on('load', async () => {
      if (!map.current) return;

      // Load density data
      const response = await fetch('/density-map-data.json');
      const data = await response.json();

      // Add source
      map.current.addSource('density-data', {
        type: 'geojson',
        data: data
      });

      // Add layers for each density mode
      addDensityLayers(map.current);
      
      setMapLoaded(true);

      // Add hover effects
      map.current.on('mousemove', 'active-density-layer', handleMouseMove);
      map.current.on('mouseleave', 'active-density-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      
      map.current.on('mousemove', 'terminated-density-layer', handleMouseMove);
      map.current.on('mouseleave', 'terminated-density-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      // Add click events
      map.current.on('click', 'active-density-layer', handleClick);
      map.current.on('click', 'terminated-density-layer', handleClick);
    });

    return () => {
      map.current?.remove();
    };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize the map. Please refresh the page and try again.');
    }
  }, []);

  // Update layer visibility based on density mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const activeLayer = 'active-density-layer';
    const terminatedLayer = 'terminated-density-layer';
    const bothLayer = 'both-density-layer';
    const outlineLayer = 'zip-outline-layer';

    // Hide all layers first
    [activeLayer, terminatedLayer, bothLayer].forEach(layer => {
      if (map.current?.getLayer(layer)) {
        map.current.setLayoutProperty(layer, 'visibility', 'none');
      }
    });

    // Show selected layer
    const layerToShow = densityMode === 'active' ? activeLayer 
                      : densityMode === 'terminated' ? terminatedLayer 
                      : bothLayer;
    
    if (map.current.getLayer(layerToShow)) {
      map.current.setLayoutProperty(layerToShow, 'visibility', 'visible');
    }
  }, [densityMode, mapLoaded]);

  // Filter by area
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const filter = selectedArea 
      ? ['==', ['get', 'area'], selectedArea]
      : null;

    ['active-density-layer', 'terminated-density-layer', 'both-density-layer'].forEach(layer => {
      if (map.current?.getLayer(layer)) {
        map.current.setFilter(layer, filter);
      }
    });
  }, [selectedArea, mapLoaded]);

  const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = 'pointer';
  };

  const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!map.current || !e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const props = feature.properties;

    if (!props) return;

    const popupContent = `
      <div style="min-width: 280px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: bold;">ZIP ${props.zipCode}</h3>
          <span style="
            background: ${AREA_COLORS[props.area as keyof typeof AREA_COLORS]};
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          ">
            ${props.area}
          </span>
        </div>
        
        <div style="
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div style="margin-bottom: 8px;">
            <span style="color: #059669; font-weight: 600; font-size: 24px;">
              ${props.activeCount}
            </span>
            <span style="color: #6b7280; font-size: 14px; margin-left: 4px;">
              Active Accounts
            </span>
          </div>
          <div>
            <span style="color: #dc2626; font-weight: 600; font-size: 24px;">
              ${props.terminatedCount}
            </span>
            <span style="color: #6b7280; font-size: 14px; margin-left: 4px;">
              Terminated Accounts
            </span>
          </div>
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 13px;
        ">
          <div>
            <div style="color: #6b7280; margin-bottom: 2px;">Total Historical</div>
            <div style="font-weight: 600; font-size: 16px;">${props.totalHistorical}</div>
          </div>
          <div>
            <div style="color: #6b7280; margin-bottom: 2px;">Churn Rate</div>
            <div style="
              font-weight: 600;
              font-size: 16px;
              color: ${props.churnRate > 85 ? '#dc2626' : props.churnRate > 75 ? '#f97316' : '#059669'};
            ">
              ${props.churnRate}%
            </div>
          </div>
        </div>
      </div>
    `;

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(popupContent)
      .addTo(map.current);
  };

  if (mapError) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>⚠️</div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#dc2626',
            marginBottom: '8px'
          }}>
            Map Loading Error
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            maxWidth: '400px'
          }}>
            {mapError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    />
  );
}

function addDensityLayers(map: mapboxgl.Map) {
  // Active accounts density layer (graduated green)
  map.addLayer({
    id: 'active-density-layer',
    type: 'fill',
    source: 'density-data',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'activeCount'],
        0, '#f0fdf4',      // Very light green
        3, '#d1fae5',      // 20th percentile
        6, '#86efac',      // 40th percentile
        10, '#4ade80',     // 60th percentile
        17, '#22c55e',     // 80th percentile
        30, '#16a34a',     // 90th percentile
        50, '#15803d'      // Max - dark green
      ],
      'fill-opacity': 0.75
    },
    layout: {
      'visibility': 'visible'
    }
  });

  // Terminated accounts density layer (graduated red)
  map.addLayer({
    id: 'terminated-density-layer',
    type: 'fill',
    source: 'density-data',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'terminatedCount'],
        0, '#fef2f2',      // Very light red
        15, '#fecaca',     // 20th percentile
        35, '#fca5a5',     // 40th percentile
        64, '#f87171',     // 60th percentile
        98, '#ef4444',     // 80th percentile
        150, '#dc2626',    // 90th percentile
        250, '#991b1b'     // Max - dark red
      ],
      'fill-opacity': 0.75
    },
    layout: {
      'visibility': 'none'
    }
  });

  // Both (churn rate) layer (graduated yellow to red)
  map.addLayer({
    id: 'both-density-layer',
    type: 'fill',
    source: 'density-data',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'churnRate'],
        0, '#f0fdf4',      // Green (low churn)
        50, '#fef3c7',     // Yellow
        70, '#fde68a',     // Darker yellow
        80, '#fbbf24',     // Orange
        85, '#f97316',     // Dark orange
        90, '#dc2626',     // Red
        95, '#991b1b'      // Dark red (high churn)
      ],
      'fill-opacity': 0.75
    },
    layout: {
      'visibility': 'none'
    }
  });

  // Zip code outline layer
  map.addLayer({
    id: 'zip-outline-layer',
    type: 'line',
    source: 'density-data',
    paint: {
      'line-color': '#64748b',
      'line-width': 1,
      'line-opacity': 0.4
    }
  });
}
