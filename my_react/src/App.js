import React, { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';
const DASHBOARD_URL = `${API_BASE_URL}/dashboard-stats`;
const REFRESH_INTERVAL_MS = 2000;

const statCards = [
  { key: 'houses', label: 'Houses' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industries', label: 'Industries' },
  { key: 'roads', label: 'Roads' },
  { key: 'powerStations', label: 'Power Stations' },
  { key: 'baseStations', label: 'Base Stations' },
  { key: 'greenery', label: 'Greenery' }
];

const emptyStats = {
  houses: 0,
  commercial: 0,
  industries: 0,
  roads: 0,
  powerStations: 0,
  baseStations: 0,
  greenery: 0,
  occupiedTiles: 0,
  totalTiles: 0,
  lastUpdated: ''
};

const chartSegments = [
  { key: 'houses', label: 'Houses', color: '#f5b942' },
  { key: 'commercial', label: 'Commercial', color: '#61d19b' },
  { key: 'industries', label: 'Industries', color: '#f07c52' },
  { key: 'roads', label: 'Roads', color: '#2f2f32' },
  { key: 'powerStations', label: 'Power Stations', color: '#ffd05c' },
  { key: 'baseStations', label: 'Base Stations', color: '#7e8df5' },
  { key: 'greenery', label: 'Greenery', color: '#73d39d' }
];

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = {
    x: cx + radius * Math.cos(startAngle),
    y: cy + radius * Math.sin(startAngle)
  };
  const end = {
    x: cx + radius * Math.cos(endAngle),
    y: cy + radius * Math.sin(endAngle)
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

function App() {
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const chartData = chartSegments.map((segment) => ({
    ...segment,
    value: stats[segment.key] || 0
  }));
  const totalChartValue = chartData.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2;

  const chartPaths = chartData.map((segment) => {
    const sliceAngle = totalChartValue === 0 ? 0 : (segment.value / totalChartValue) * Math.PI * 2;
    const path = sliceAngle === 0
      ? null
      : describeArc(140, 140, 118, currentAngle, currentAngle + sliceAngle);

    currentAngle += sliceAngle;

    return {
      ...segment,
      path
    };
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(DASHBOARD_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setStats({
            ...emptyStats,
            ...data
          });
          setError('');
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(`Unable to reach dashboard backend at ${DASHBOARD_URL}. ${fetchError.message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live stats from the city grid</p>
        </div>
        <div className="dashboard-meta">
          <span>Backend: {API_BASE_URL}</span>
          <span>Occupied: {stats.occupiedTiles}/{stats.totalTiles}</span>
          <span>Updated: {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Waiting...'}</span>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="stat-grid">
        {statCards.map((card) => (
          <div className="stat-card" key={card.key}>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{stats[card.key]}</span>
          </div>
        ))}
      </div>

      <section className="chart-panel">
        <div className="chart-card">
          <div className="chart-copy">
            <h2>City Distribution</h2>
            <p>Live breakdown of what is currently placed on the grid.</p>
          </div>

          <div className="pie-chart-wrap">
            <svg className="pie-chart" viewBox="0 0 280 280" aria-label="City distribution pie chart" role="img">
              {chartPaths.map((segment) =>
                segment.path ? (
                  <path
                    key={segment.key}
                    d={segment.path}
                    fill={segment.color}
                    stroke="#f5f2eb"
                    strokeWidth="4"
                  />
                ) : null
              )}
              <circle cx="140" cy="140" r="56" fill="#ffffff" />
              <text x="140" y="128" textAnchor="middle" className="pie-chart-total-label">
                Total
              </text>
              <text x="140" y="158" textAnchor="middle" className="pie-chart-total-value">
                {totalChartValue}
              </text>
            </svg>
          </div>

          <div className="chart-legend">
            {chartData.map((segment) => (
              <div className="legend-item" key={segment.key}>
                <span className="legend-swatch" style={{ backgroundColor: segment.color }} />
                <span className="legend-name">{segment.label}</span>
                <span className="legend-value">{segment.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isLoading && <p className="dashboard-status">Loading dashboard data...</p>}
    </div>
  );
}

export default App;
