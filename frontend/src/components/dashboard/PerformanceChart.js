import React from 'react';
import {
  Paper, Typography, Box, ToggleButtonGroup, ToggleButton,
  Chip, Stack
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format, isValid } from 'date-fns';

const safeFormatDate = (dateVal) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  return isValid(d) ? format(d, 'MMM dd') : 'Unknown';
};

const METRICS = [
  { key: 'technique',        label: 'Technique',        color: '#1976d2', unit: '/100' },
  { key: 'passes_completed', label: 'Passes',           color: '#2e7d32', unit: '' },
  { key: 'goals',            label: 'Goals',            color: '#ed6c02', unit: '' },
  { key: 'sprint_count',     label: 'Sprints',          color: '#9c27b0', unit: '' },
  { key: 'distance_covered', label: 'Distance (km)',    color: '#0288d1', unit: 'km' },
  { key: 'speed',            label: 'Speed',            color: '#d32f2f', unit: '/100' },
];

const PerformanceChart = ({ performances, stats }) => {
  const [chartType, setChartType]       = React.useState('line');
  const [activeMetrics, setActiveMetrics] = React.useState(['technique', 'passes_completed']);

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(m => m !== key) : prev // keep at least 1
        : [...prev, key]
    );
  };

  // Build chart data from performances
  const chartData = performances
    .slice()
    .sort((a, b) => new Date(a.performanceDate || a.performancedate) - new Date(b.performanceDate || b.performancedate))
    .map((perf) => {
      const m = perf.metrics || {};
      return {
        date:            safeFormatDate(perf.performanceDate || perf.performancedate),
        technique:       m.technique        ?? null,
        passes_completed:m.passes_completed ?? null,
        goals:           m.goals            ?? null,
        sprint_count:    m.sprint_count     ?? null,
        distance_covered:m.distance_covered ?? null,
        speed:           m.speed            ?? null,
        sessionType:     perf.sessionType   || perf.sessiontype,
      };
    });

  // Session type breakdown
  const sessionTypeData = [
    { name: 'Training',    value: stats?.bySessionType?.training    || 0, color: '#1976d2' },
    { name: 'Competition', value: stats?.bySessionType?.competition || 0, color: '#2e7d32' },
    { name: 'Assessment',  value: stats?.bySessionType?.assessment  || 0, color: '#ed6c02' },
  ].filter(i => i.value > 0);

  // Intensity breakdown
  const intensityData = performances.reduce((acc, perf) => {
    const intensity = perf.intensity || 'unknown';
    const existing  = acc.find(i => i.name === intensity);
    if (existing) existing.value += 1;
    else acc.push({ name: intensity, value: 1 });
    return acc;
  }, []);

  // Average metrics for bar chart
  const avgMetricsData = METRICS.map(({ key, label, color }) => {
    const vals = chartData.map(d => d[key]).filter(v => v !== null && v !== undefined);
    const avg  = vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
    return { name: label, value: avg, color };
  });

  if (!performances || performances.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Performance Analytics</Typography>
        <Typography variant="body2" color="textSecondary">
          No performance data available yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Performance Analytics</Typography>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, v) => v && setChartType(v)}
          size="small"
        >
          <ToggleButton value="line">Trends</ToggleButton>
          <ToggleButton value="bar">Averages</ToggleButton>
          <ToggleButton value="pie">Breakdown</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Metric selector (only for line chart) */}
      {chartType === 'line' && (
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
          {METRICS.map(({ key, label, color }) => (
            <Chip
              key={key}
              label={label}
              size="small"
              onClick={() => toggleMetric(key)}
              sx={{
                mb: 1,
                backgroundColor: activeMetrics.includes(key) ? color : '#e0e0e0',
                color: activeMetrics.includes(key) ? '#fff' : '#555',
                fontWeight: activeMetrics.includes(key) ? 'bold' : 'normal',
                cursor: 'pointer',
                '&:hover': { opacity: 0.85 }
              }}
            />
          ))}
        </Stack>
      )}

      {/* LINE CHART — metric trends */}
      {chartType === 'line' && (
        <>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Football Metrics Over Time — click chips above to toggle metrics
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" style={{ fontSize: '11px' }} />
              <YAxis style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
              <Legend />
              {METRICS.filter(m => activeMetrics.includes(m.key)).map(({ key, label, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 3 }}
                  activeDot={{ r: 5 }}
                  name={label}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {/* BAR CHART — average metrics */}
      {chartType === 'bar' && (
        <>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Average Metric Values Across All Sessions
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={avgMetricsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" style={{ fontSize: '11px' }} />
              <YAxis type="category" dataKey="name" style={{ fontSize: '11px' }} width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
              <Bar dataKey="value" name="Average" radius={[0, 8, 8, 0]}>
                {avgMetricsData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* PIE CHARTS — session & intensity breakdown */}
      {chartType === 'pie' && (
        <Box display="flex" gap={4} flexWrap="wrap">
          <Box flex={1} minWidth={250}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Session Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sessionTypeData}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {sessionTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box flex={1} minWidth={250}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Intensity Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={intensityData}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {intensityData.map((entry, i) => (
                    <Cell key={i} fill={['#1976d2','#2e7d32','#ed6c02','#9c27b0','#d32f2f'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default PerformanceChart;