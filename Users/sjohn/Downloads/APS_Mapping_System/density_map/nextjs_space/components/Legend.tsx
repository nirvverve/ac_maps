
'use client';

interface LegendProps {
  densityMode: 'active' | 'terminated' | 'both';
}

export default function Legend({ densityMode }: LegendProps) {
  const getLegendData = () => {
    if (densityMode === 'active') {
      return {
        title: 'Active Account Density',
        subtitle: 'Number of current customers per ZIP code',
        gradient: 'linear-gradient(to bottom, #15803d, #22c55e, #86efac, #d1fae5, #f0fdf4)',
        labels: ['50+', '30', '17', '10', '6', '3', '0']
      };
    } else if (densityMode === 'terminated') {
      return {
        title: 'Terminated Account Density',
        subtitle: 'Number of lost customers per ZIP code',
        gradient: 'linear-gradient(to bottom, #991b1b, #dc2626, #ef4444, #f87171, #fca5a5, #fecaca, #fef2f2)',
        labels: ['250+', '150', '98', '64', '35', '15', '0']
      };
    } else {
      return {
        title: 'Churn Rate',
        subtitle: 'Percentage of terminated vs. total historical accounts',
        gradient: 'linear-gradient(to bottom, #991b1b, #dc2626, #f97316, #fbbf24, #fde68a, #fef3c7, #f0fdf4)',
        labels: ['95%+', '90%', '85%', '80%', '70%', '50%', '0%']
      };
    }
  };

  const legend = getLegendData();

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
        marginBottom: '4px',
        color: '#1f2937'
      }}>
        {legend.title}
      </h3>
      <p style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '16px'
      }}>
        {legend.subtitle}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          background: legend.gradient,
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }} />
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#4b5563',
          fontWeight: '500'
        }}>
          {legend.labels.map((label, idx) => (
            <div key={idx}>{label}</div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#6b7280',
        lineHeight: '1.5'
      }}>
        <strong>Note:</strong> Darker colors indicate higher density. 
        Click on any ZIP code for detailed statistics.
      </div>
    </div>
  );
}
