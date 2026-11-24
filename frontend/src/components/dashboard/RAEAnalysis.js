import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
  Alert, Tooltip, LinearProgress, Divider
} from '@mui/material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Legend, Tooltip as ReTooltip
} from 'recharts';
import { EmojiEvents, Star, TrendingUp, TrendingDown, Remove, Info } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const METRIC_LABELS = {
  speed:            'Speed',
  technique:        'Technique',
  passes_completed: 'Passes',
  goals:            'Goals',
  sprint_count:     'Sprints',
  distance_covered: 'Distance (km)',
  pass_accuracy:    'Pass Acc %',
};

const QUARTER_COLOURS = { Q1: '#ef5350', Q2: '#ff9800', Q3: '#42a5f5', Q4: '#66bb6a' };

const QUARTER_INFO = {
  Q1: { label: 'Jan–Mar', desc: 'Oldest in selection year — potential maturity advantage' },
  Q2: { label: 'Apr–Jun', desc: 'Slightly older — mild maturity advantage' },
  Q3: { label: 'Jul–Sep', desc: 'Slightly younger — mild maturity disadvantage' },
  Q4: { label: 'Oct–Dec', desc: 'Youngest in selection year — potential hidden gem' },
};

// ── Sub-components ──────────────────────────────────────────────────────────
const ImpactChip = ({ value }) => {
  if (value > 5)  return <Chip icon={<TrendingUp fontSize="small" />}  label={`+${value}%`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100' }} />;
  if (value < -5) return <Chip icon={<TrendingDown fontSize="small" />} label={`${value}%`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }} />;
  return               <Chip icon={<Remove fontSize="small" />}        label={`${value}%`} size="small" sx={{ bgcolor: '#f5f5f5', color: '#616161' }} />;
};

const PercentileBar = ({ label, standard, rae }) => (
  <Box mb={2}>
    <Box display="flex" justifyContent="space-between" mb={0.5}>
      <Typography variant="body2" fontWeight={500}>{label}</Typography>
      <Box display="flex" gap={1} alignItems="center">
        <Typography variant="caption" color="text.secondary">Standard: {standard}%</Typography>
        <Typography variant="caption" color="primary">RAE-Adjusted: {rae}%</Typography>
        <ImpactChip value={standard - rae} />
      </Box>
    </Box>
    <Box position="relative" height={8} bgcolor="#f0f0f0" borderRadius={4} mb={0.5}>
      <Box
        position="absolute" height="100%" borderRadius={4}
        bgcolor="#bdbdbd" width={`${standard}%`}
        sx={{ transition: 'width 1s ease' }}
      />
      <Box
        position="absolute" height="100%" borderRadius={4}
        bgcolor="#1976d2" width={`${rae}%`} sx={{ opacity: 0.85, transition: 'width 1s ease' }}
      />
    </Box>
    <Box display="flex" gap={2}>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Box width={10} height={10} borderRadius="50%" bgcolor="#bdbdbd" />
        <Typography variant="caption" color="text.secondary">Standard</Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Box width={10} height={10} borderRadius="50%" bgcolor="#1976d2" />
        <Typography variant="caption" color="primary">RAE-Adjusted</Typography>
      </Box>
    </Box>
  </Box>
);

// ── Main component ──────────────────────────────────────────────────────────
export default function RAEAnalysis() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await axios.get(`${API_URL}/performance/rae`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load RAE analysis');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box p={3}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  const { athlete, standardPercentiles, raePercentiles, raeImpact,
          avgRaeImpact, quarterStats, quarterCounts, insights } = data;

  const qColour = QUARTER_COLOURS[athlete.birthQuarter.quarter];

  // Radar data
  const radarData = Object.keys(METRIC_LABELS).map(m => ({
    metric:   METRIC_LABELS[m],
    Standard: standardPercentiles[m],
    RAE:      raePercentiles[m],
  }));

  // Quarter distribution bar chart
  const quarterDistData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
    quarter: `${q} (${QUARTER_INFO[q].label})`,
    Athletes: quarterCounts[q],
  }));

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography variant="h4" fontWeight={700}>⚖️ RAE Analysis</Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Relative Age Effect (RAE) compensates for the maturity advantage given to players born
        earlier in the selection year. Your RAE-adjusted percentiles show how you perform
        compared to athletes born in the same birth quarter.
      </Typography>

      {/* Birth quarter card */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ border: `2px solid ${qColour}`, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Your Birth Quarter</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Chip
                  label={athlete.birthQuarter.quarter}
                  sx={{ bgcolor: qColour, color: '#fff', fontWeight: 700, fontSize: 18, height: 36, px: 1 }}
                />
                <Typography variant="h6">{athlete.birthQuarter.label}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {QUARTER_INFO[athlete.birthQuarter.quarter].desc}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                Compared against <strong>{quarterCounts[athlete.birthQuarter.quarter]}</strong> athletes
                born in the same quarter
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Insight card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: insights.isHiddenGem ? '#e8f5e9' : insights.isOverrated ? '#fff3e0' : '#f5f5f5' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">RAE Insight</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                {insights.isHiddenGem
                  ? <Star sx={{ color: '#2e7d32', fontSize: 32 }} />
                  : <EmojiEvents sx={{ color: insights.isOverrated ? '#e65100' : '#1976d2', fontSize: 32 }} />
                }
                <Typography variant="h6" fontWeight={700}>
                  {insights.isHiddenGem ? 'Hidden Gem 🌟' : insights.isOverrated ? 'Age Advantage Detected' : 'Fair Assessment'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {insights.summary}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Average RAE impact */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Average RAE Impact</Typography>
              <Typography variant="h3" fontWeight={700} color={avgRaeImpact > 5 ? '#e65100' : avgRaeImpact < -5 ? '#2e7d32' : '#1976d2'} mt={1}>
                {avgRaeImpact > 0 ? '+' : ''}{avgRaeImpact}%
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {avgRaeImpact > 5
                  ? 'Your standard rankings are inflated by birth quarter advantage on average.'
                  : avgRaeImpact < -5
                  ? 'Your standard rankings underestimate your true ability due to birth quarter disadvantage.'
                  : 'Birth quarter has minimal impact on your overall rankings.'}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Tooltip title="Positive = standard percentile is higher than RAE-adjusted (age inflation). Negative = standard percentile is lower than RAE-adjusted (hidden talent).">
                <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: 'help' }}>
                  <Info fontSize="small" color="disabled" />
                  <Typography variant="caption" color="text.secondary">What does this mean?</Typography>
                </Box>
              </Tooltip>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Percentile comparison bars */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Percentile Comparison</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Standard percentile (grey) vs RAE-adjusted percentile (blue). A higher RAE score means you're
            performing better than your birth-quarter peers expect.
          </Typography>
          {Object.keys(METRIC_LABELS).map(m => (
            <PercentileBar
              key={m}
              label={METRIC_LABELS[m]}
              standard={standardPercentiles[m]}
              rae={raePercentiles[m]}
            />
          ))}
        </CardContent>
      </Card>

      {/* Radar + Quarter distribution */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Performance Radar</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Standard vs RAE-adjusted percentiles across all metrics
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar name="Standard" dataKey="Standard" stroke="#bdbdbd" fill="#bdbdbd" fillOpacity={0.3} />
                  <Radar name="RAE-Adjusted" dataKey="RAE" stroke="#1976d2" fill="#1976d2" fillOpacity={0.4} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Birth Quarter Distribution</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Number of athletes in the dataset by birth quarter — an even distribution would
                indicate no RAE bias.
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quarterDistData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="Athletes" fill="#1976d2" radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fontSize: 11 }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary">
                In datasets with RAE bias, Q1 typically has significantly more athletes than Q4.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quarter averages table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Average Performance by Birth Quarter</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            How each birth quarter group performs on average — consistent values across quarters
            suggest RAE has been successfully compensated for.
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Quarter</th>
                  {Object.values(METRIC_LABELS).map(l => (
                    <th key={l} style={{ padding: '8px 12px', textAlign: 'right' }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Q1','Q2','Q3','Q4'].map(q => (
                  <tr key={q} style={{
                    background: q === athlete.birthQuarter.quarter ? '#e3f2fd' : 'white',
                    borderBottom: '1px solid #eee'
                  }}>
                    <td style={{ padding: '8px 12px', fontWeight: q === athlete.birthQuarter.quarter ? 700 : 400 }}>
                      <Chip label={q} size="small" sx={{ bgcolor: QUARTER_COLOURS[q], color: '#fff', mr: 1 }} />
                      {QUARTER_INFO[q].label}
                      {q === athlete.birthQuarter.quarter && <Chip label="You" size="small" sx={{ ml: 1 }} />}
                    </td>
                    {Object.keys(METRIC_LABELS).map(m => (
                      <td key={m} style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {quarterStats[q]?.avg[m] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}