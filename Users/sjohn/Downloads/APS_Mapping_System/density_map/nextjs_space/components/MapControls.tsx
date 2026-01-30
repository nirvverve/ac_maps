
'use client';

interface MapControlsProps {
  densityMode: 'active' | 'terminated' | 'both';
  onDensityModeChange: (mode: 'active' | 'terminated' | 'both') => void;
}

export default function MapControls({ densityMode, onDensityModeChange }: MapControlsProps) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#1f2937'
      }}>
        Density View Mode
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={() => onDensityModeChange('active')}
          style={{
            padding: '12px 16px',
            border: densityMode === 'active' ? '2px solid #10b981' : '1px solid #e5e7eb',
            borderRadius: '8px',
            background: densityMode === 'active' ? '#ecfdf5' : 'white',
            color: densityMode === 'active' ? '#065f46' : '#4b5563',
            fontWeight: densityMode === 'active' ? '600' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #f0fdf4, #10b981, #15803d)',
            border: '1px solid #d1d5db'
          }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Active Accounts</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Current customer density</div>
          </div>
        </button>

        <button
          onClick={() => onDensityModeChange('terminated')}
          style={{
            padding: '12px 16px',
            border: densityMode === 'terminated' ? '2px solid #ef4444' : '1px solid #e5e7eb',
            borderRadius: '8px',
            background: densityMode === 'terminated' ? '#fef2f2' : 'white',
            color: densityMode === 'terminated' ? '#991b1b' : '#4b5563',
            fontWeight: densityMode === 'terminated' ? '600' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #fef2f2, #ef4444, #991b1b)',
            border: '1px solid #d1d5db'
          }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Terminated Accounts</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lost customer density</div>
          </div>
        </button>

        <button
          onClick={() => onDensityModeChange('both')}
          style={{
            padding: '12px 16px',
            border: densityMode === 'both' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
            borderRadius: '8px',
            background: densityMode === 'both' ? '#fffbeb' : 'white',
            color: densityMode === 'both' ? '#92400e' : '#4b5563',
            fontWeight: densityMode === 'both' ? '600' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #f0fdf4, #fef3c7, #f97316, #991b1b)',
            border: '1px solid #d1d5db'
          }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Churn Rate</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Customer retention analysis</div>
          </div>
        </button>
      </div>
    </div>
  );
}
