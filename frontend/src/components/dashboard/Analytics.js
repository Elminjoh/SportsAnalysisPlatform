import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Typography, Paper, Box, Alert,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress
} from '@mui/material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { format, isValid } from 'date-fns';
import performanceService from '../../services/performanceService';

const safeDate = (d) => {
  const date = new Date(d);
  return isValid(date) ? format(date, 'MMM dd yyyy') : 'Unknown';
};

// ─── Stat highlight card ─────────────────────────────────────────────────────
const HighlightCard = ({ label, value, sub, color }) => (
  <Paper sx={{ p: 2.5, borderLeft: `4px solid ${color}`, height: '100%' }}>
    <Typography variant="body2" color="textSecondary">{label}</Typography>
    <Typography variant="h4" fontWeight="bold" sx={{ color, my: 0.5 }}>{value}</Typography>
    <Typography variant="caption" color="textSecondary">{sub}</Typography>
  </Paper>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await performanceService.getMyPerformances({ limit: 100, sortBy: 'performanceDate', order: 'asc' });
      setPerformances(res.data || []);
    } catch (err) {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Container>
  );

  if (error) return <Container><Alert severity="error">{error}</Alert></Container>;

  if (performances.length === 0) return (
    <Container>
      <Alert severity="info">No performance data yet. Add some sessions to see analytics.</Alert>
    </Container>
  );

  // ─── Derived data ───────────────────────────────────────────────────────────

  const metrics = performances.map(p => p.metrics || {});

  const avg = (key) => {
    const vals = metrics.map(m => m[key]).filter(v => v != null);
    return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  };

  const max = (key) => {
    const vals = metrics.map(m => m[key]).filter(v => v != null);
    return vals.length ? Math.max(...vals) : 0;
  };

  const bestSession = (key) => {
    let best = null;
    performances.forEach(p => {
      const val = p.metrics?.[key];
      if (val != null && (!best || val > best.val)) best = { val, date: p.performanceDate };
    });
    return best;
  };

  // Radar chart data — normalise to 0-100
  const radarData = [
    { metric: 'Technique',  value: avg('technique'),                              max: 100 },
    { metric: 'Speed',      value: avg('speed'),                                  max: 100 },
    { metric: 'Passes',     value: Math.min(100, avg('passes_completed') * 1.5),  max: 100 },
    { metric: 'Sprints',    value: Math.min(100, avg('sprint_count') * 2.5),      max: 100 },
    { metric: 'Distance',   value: Math.min(100, avg('distance_covered') * 9),    max: 100 },
    { metric: 'Goals',      value: Math.min(100, avg('goals') * 25),              max: 100 },
  ].map(d => ({ ...d, value: parseFloat(d.value.toFixed(1)) }));

  // Trend line data — all sessions over time
  const trendData = performances.map(p => ({
    date:      safeDate(p.performanceDate),
    technique: p.metrics?.technique        ?? null,
    speed:     p.metrics?.speed            ?? null,
    passes:    p.metrics?.passes_completed ?? null,
  }));

  // Highlights
  const bestGoals    = bestSession('goals');
  const bestTech     = bestSession('technique');
  const bestPasses   = bestSession('passes_completed');
  const bestSprints  = bestSession('sprint_count');

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>📊 Performance Analytics</Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Deep dive into your performance data across {performances.length} session{performances.length !== 1 ? 's' : ''}
      </Typography>

      {/* ── Highlight cards ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <HighlightCard
            label="Best Goals in a Match"
            value={bestGoals?.val ?? 0}
            sub={bestGoals ? safeDate(bestGoals.date) : 'No data'}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HighlightCard
            label="Best Technique Score"
            value={bestTech?.val ?? 0}
            sub={bestTech ? safeDate(bestTech.date) : 'No data'}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HighlightCard
            label="Best Passes in a Match"
            value={bestPasses?.val ?? 0}
            sub={bestPasses ? safeDate(bestPasses.date) : 'No data'}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HighlightCard
            label="Best Sprint Count"
            value={bestSprints?.val ?? 0}
            sub={bestSprints ? safeDate(bestSprints.date) : 'No data'}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* ── Radar + Trend ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Radar chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Overall Performance Profile</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Average metrics normalised to 0–100
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" style={{ fontSize: '12px' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  name="Avg Performance"
                  dataKey="value"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.4}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Trend lines */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Metric Trends Over Time</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Technique, Speed & Passes across all sessions
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '10px' }} interval="preserveStartEnd" />
                <YAxis style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
                <Legend />
                <Line type="monotone" dataKey="technique" stroke="#1976d2" strokeWidth={2} dot={false} name="Technique" connectNulls />
                <Line type="monotone" dataKey="speed"     stroke="#d32f2f" strokeWidth={2} dot={false} name="Speed"     connectNulls />
                <Line type="monotone" dataKey="passes"    stroke="#2e7d32" strokeWidth={2} dot={false} name="Passes"    connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Averages summary ── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Season Averages</Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Avg Technique',  value: `${avg('technique')}/100`,        color: '#1976d2' },
            { label: 'Avg Speed',      value: `${avg('speed')}/100`,            color: '#d32f2f' },
            { label: 'Avg Passes',     value: avg('passes_completed'),           color: '#2e7d32' },
            { label: 'Avg Goals',      value: avg('goals'),                     color: '#ed6c02' },
            { label: 'Avg Sprints',    value: avg('sprint_count'),              color: '#9c27b0' },
            { label: 'Avg Distance',   value: `${avg('distance_covered')} km`,  color: '#0288d1' },
            { label: 'Pass Accuracy',  value: `${avg('pass_accuracy')}%`,       color: '#558b2f' },
            { label: 'Max Goals',      value: max('goals'),                     color: '#f57c00' },
          ].map(({ label, value, color }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="body2" color="textSecondary">{label}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ── Session history table ── */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Session History</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: '#f5f5f5' } }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Goals</TableCell>
                <TableCell align="center">Passes</TableCell>
                <TableCell align="center">Technique</TableCell>
                <TableCell align="center">Speed</TableCell>
                <TableCell align="center">Sprints</TableCell>
                <TableCell align="center">Distance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performances.slice().reverse().map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{safeDate(p.performanceDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.sessionType || 'N/A'}
                      size="small"
                      sx={{
                        textTransform: 'capitalize',
                        backgroundColor:
                          p.sessionType === 'competition' ? '#e8f5e9' :
                          p.sessionType === 'training'    ? '#e3f2fd' : '#fff3e0',
                        color:
                          p.sessionType === 'competition' ? '#2e7d32' :
                          p.sessionType === 'training'    ? '#1565c0' : '#e65100',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">{p.metrics?.goals        ?? '-'}</TableCell>
                  <TableCell align="center">{p.metrics?.passes_completed ?? '-'}</TableCell>
                  <TableCell align="center">{p.metrics?.technique    ?? '-'}</TableCell>
                  <TableCell align="center">{p.metrics?.speed        ?? '-'}</TableCell>
                  <TableCell align="center">{p.metrics?.sprint_count ?? '-'}</TableCell>
                  <TableCell align="center">{p.metrics?.distance_covered ? `${p.metrics.distance_covered}km` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Analytics;