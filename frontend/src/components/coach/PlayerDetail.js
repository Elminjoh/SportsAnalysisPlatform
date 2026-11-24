import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  CircularProgress, Alert, Avatar, Divider, LinearProgress
} from '@mui/material';
import { ArrowBack, Add, SportsSoccer } from '@mui/icons-material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const COMPOSITE_LABELS = {
  technical_composite:     { label: 'Technical',     colour: '#1976d2' },
  tactical_composite:      { label: 'Tactical',      colour: '#7b1fa2' },
  physical_composite:      { label: 'Physical',      colour: '#2e7d32' },
  psychological_composite: { label: 'Psychological', colour: '#c62828' },
};

export default function PlayerDetail({ athlete, onBack, onAssess }) {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    const fetchPerformances = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch all performances for this athlete (coach can see their roster's data)
        const res = await axios.get(`${API_URL}/performance?athleteId=${athlete.id}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPerformances(res.data.data || []);
      } catch (e) {
        setError('Could not load performance history');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformances();
  }, [athlete.id]);

  // Get latest assessment with composite scores
  const assessments = performances.filter(p =>
    p.sessionType === 'assessment' && p.metrics?.technical_composite !== undefined
  );
  const latest = assessments[assessments.length - 1];

  // Radar data from latest assessment
  const radarData = latest ? [
    { subject: 'Technical',     value: latest.metrics.technical_composite     || 0 },
    { subject: 'Tactical',      value: latest.metrics.tactical_composite      || 0 },
    { subject: 'Physical',      value: latest.metrics.physical_composite      || 0 },
    { subject: 'Psychological', value: latest.metrics.psychological_composite || 0 },
  ] : [];

  // Trend data for composite scores over time
  const trendData = assessments.map(p => ({
    date:          new Date(p.performanceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    Technical:     p.metrics.technical_composite     || 0,
    Tactical:      p.metrics.tactical_composite      || 0,
    Physical:      p.metrics.physical_composite      || 0,
    Psychological: p.metrics.psychological_composite || 0,
  }));

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={onBack}>Back to Roster</Button>
        <Button variant="contained" startIcon={<Add />} onClick={onAssess}>New Assessment</Button>
      </Box>

      {/* Player header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: '#1976d2', fontSize: 24 }}>
              {athlete.user?.firstName?.[0]}{athlete.user?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {athlete.user?.firstName} {athlete.user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">{athlete.user?.email}</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip label={athlete.position || 'Unknown'} size="small" color="primary" />
                <Chip label={athlete.skillLevel} size="small" variant="outlined" />
                <Chip label={athlete.teamName || 'No team'} size="small" variant="outlined" />
                <Chip label={`${assessments.length} assessments`} size="small" color="success" />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}

      {!loading && assessments.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SportsSoccer sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No assessments yet</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Submit your first assessment for this player to see their performance profile.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={onAssess}>
              Submit Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && latest && (
        <Grid container spacing={3}>
          {/* Composite score bars */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Latest Assessment</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  {new Date(latest.performanceDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
                {Object.entries(COMPOSITE_LABELS).map(([key, { label, colour }]) => (
                  <Box key={key} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>{label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {latest.metrics[key]?.toFixed(0) || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={latest.metrics[key] || 0}
                      sx={{ height: 10, borderRadius: 5, bgcolor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': { bgcolor: colour, borderRadius: 5 } }}
                    />
                  </Box>
                ))}
                {latest.coachFeedback && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {latest.coachFeedback.replace(' | ', '\n')}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Radar */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Performance Profile</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar name="Score" dataKey="value" stroke="#1976d2" fill="#1976d2" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Trend chart */}
          {trendData.length > 1 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>Development Trends</Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {Object.entries(COMPOSITE_LABELS).map(([key, { label, colour }]) => (
                        <Line key={key} type="monotone" dataKey={label}
                          stroke={colour} strokeWidth={2} dot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}