
'use client';

import { useEffect, useState } from 'react';

interface AreaStat {
  area: string;
  zipCount: number;
  activeAccounts: number;
  terminatedAccounts: number;
  totalHistorical: number;
  avgChurnRate: number;
  maxActiveZip: number;
  maxActiveCount: number;
  maxTerminatedZip: number;
  maxTerminatedCount: number;
}

interface AreaStatisticsProps {
  selectedArea: string | null;
  onAreaSelect: (area: string | null) => void;
}

const AREA_COLORS = {
  'West': '#3b82f6',
  'Central': '#10b981',
  'East': '#f97316',
  'Tucson': '#a855f7'
};

export default function AreaStatistics({ selectedArea, onAreaSelect }: AreaStatisticsProps) {
  const [stats, setStats] = useState<AreaStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/area-statistics.json')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading statistics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Loading statistics...
      </div>
    );
  }

  const totalActive = stats.reduce((sum, s) => sum + s.activeAccounts, 0);
  const totalTerminated = stats.reduce((sum, s) => sum + s.terminatedAccounts, 0);
  const totalHistorical = totalActive + totalTerminated;
  const overallChurnRate = ((totalTerminated / totalHistorical) * 100).toFixed(2);

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Territory Statistics
        </h3>
        {selectedArea && (
          <button
            onClick={() => onAreaSelect(null)}
            style={{
              fontSize: '12px',
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Overall Summary */}
      <div style={{
        background: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          OVERALL TOTALS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '13px'
        }}>
          <div>
            <div style={{ color: '#059669', fontWeight: '600', fontSize: '20px' }}>
              {totalActive.toLocaleString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>Active</div>
          </div>
          <div>
            <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '20px' }}>
              {totalTerminated.toLocaleString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>Terminated</div>
          </div>
          <div>
            <div style={{ color: '#4b5563', fontWeight: '600', fontSize: '18px' }}>
              {totalHistorical.toLocaleString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>Total Historical</div>
          </div>
          <div>
            <div style={{
              color: parseFloat(overallChurnRate) > 85 ? '#dc2626' : '#f97316',
              fontWeight: '600',
              fontSize: '18px'
            }}>
              {overallChurnRate}%
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>Avg Churn Rate</div>
          </div>
        </div>
      </div>

      {/* Individual Areas */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {stats.map(stat => (
          <button
            key={stat.area}
            onClick={() => onAreaSelect(selectedArea === stat.area ? null : stat.area)}
            style={{
              padding: '16px',
              border: selectedArea === stat.area 
                ? `2px solid ${AREA_COLORS[stat.area as keyof typeof AREA_COLORS]}` 
                : '1px solid #e5e7eb',
              borderRadius: '8px',
              background: selectedArea === stat.area 
                ? `${AREA_COLORS[stat.area as keyof typeof AREA_COLORS]}08` 
                : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{
                fontWeight: '600',
                fontSize: '15px',
                color: '#1f2937'
              }}>
                {stat.area}
              </span>
              <span style={{
                background: AREA_COLORS[stat.area as keyof typeof AREA_COLORS],
                color: 'white',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {stat.zipCount} ZIPs
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ color: '#059669', fontWeight: '600' }}>
                  {stat.activeAccounts.toLocaleString()}
                </div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>Active</div>
              </div>
              <div>
                <div style={{ color: '#dc2626', fontWeight: '600' }}>
                  {stat.terminatedAccounts.toLocaleString()}
                </div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>Terminated</div>
              </div>
            </div>

            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '11px',
              color: '#6b7280'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Churn Rate:</span>
                <span style={{
                  fontWeight: '600',
                  color: stat.avgChurnRate > 85 ? '#dc2626' : stat.avgChurnRate > 75 ? '#f97316' : '#059669'
                }}>
                  {stat.avgChurnRate}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hottest ZIP:</span>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                  {stat.maxActiveZip} ({stat.maxActiveCount} active)
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
