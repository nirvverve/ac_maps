
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AreaStatistics from '@/components/AreaStatistics';
import MapControls from '@/components/MapControls';
import Legend from '@/components/Legend';

// Dynamically import the map component to reduce initial bundle
const DensityMap = dynamic(() => import('@/components/DensityMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '12px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          🗺️
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Loading map...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [densityMode, setDensityMode] = useState<'active' | 'terminated' | 'both'>('active');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        padding: '24px 32px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          letterSpacing: '-0.5px'
        }}>
          Territory Account Density Analysis
        </h1>
        <p style={{ 
          fontSize: '14px', 
          opacity: 0.9,
          maxWidth: '800px'
        }}>
          Interactive visualization of active and terminated accounts across Phoenix and Tucson territories. 
          Darker colors indicate higher account density.
        </p>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden',
        gap: '16px',
        padding: '16px'
      }}>
        {/* Sidebar */}
        <div style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          <MapControls 
            densityMode={densityMode}
            onDensityModeChange={setDensityMode}
          />
          <Legend densityMode={densityMode} />
          <AreaStatistics 
            selectedArea={selectedArea}
            onAreaSelect={setSelectedArea}
          />
        </div>

        {/* Map */}
        <div style={{ 
          flex: 1,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          background: 'white'
        }}>
          <DensityMap 
            densityMode={densityMode}
            selectedArea={selectedArea}
          />
        </div>
      </div>
    </div>
  );
}
