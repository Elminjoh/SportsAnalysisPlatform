import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Typography, Paper, Box, Alert,
} from '@mui/material';
import {
  DirectionsRun, TrendingUp, EmojiEvents, CalendarToday,
} from '@mui/icons-material';
import StatCard from './StatCard';
import PredictionCard from './PredictionCard';
import CoachFeedbackCard from './CoachFeedbackCard';
import Loading from '../common/Loading';
import performanceService from '../../services/performanceService';
import athleteService from '../../services/athleteService';
import mlService from '../../services/mlService';
import { format } from 'date-fns';
import PerformanceChart from './PerformanceChart';

const Dashboard = () => {
  const [stats, setStats]                       = useState(null);
  const [athlete, setAthlete]                   = useState(null);
  const [recentPerformances, setRecentPerformances] = useState([]);
  const [allPerformances, setAllPerformances]   = useState([]);
  const [prediction, setPrediction]             = useState(null);
  const [injuryRisk, setInjuryRisk]             = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Athlete profile
      try {
        const athleteResponse = await athleteService.getMyProfile();
        setAthlete(athleteResponse.data);
        if (athleteResponse.data?.id) fetchMLPredictions(athleteResponse.data.id);
      } catch (athleteErr) {
        if (athleteErr.response?.status === 404) setAthlete(null);
        else throw athleteErr;
      }

      // Performance stats
      try {
        const statsResponse = await performanceService.getStatistics();
        setStats(statsResponse.data);
      } catch (statsErr) {
        if (statsErr.response?.status === 404) {
          setStats({ totalSessions: 0, avgPersonalRating: '0.0',
            bySessionType: { training: 0, competition: 0, assessment: 0 } });
        } else throw statsErr;
      }

      // Recent performances (for display list)
      try {
        const recentRes = await performanceService.getMyPerformances({ limit: 5, sortBy: 'performanceDate', order: 'desc' });
        setRecentPerformances(recentRes.data || []);
      } catch (perfErr) {
        if (perfErr.response?.status === 404) setRecentPerformances([]);
        else throw perfErr;
      }

      // All performances — needed to find coach assessments
      try {
        const allRes = await performanceService.getMyPerformances({ limit: 100 });
        setAllPerformances(allRes.data || []);
      } catch {
        setAllPerformances([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load some dashboard data');
      setLoading(false);
    }
  };

  const fetchMLPredictions = async (athleteId) => {
    try {
      const predictionResponse = await mlService.predictPerformance(athleteId);
      if (predictionResponse.success) setPrediction(predictionResponse.data);
    } catch (err) { console.error('Error fetching prediction:', err); }

    try {
      const riskResponse = await mlService.assessInjuryRisk(athleteId);
      if (riskResponse.success) setInjuryRisk(riskResponse.data);
    } catch (err) { console.error('Error fetching injury risk:', err); }
  };

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <Container><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Welcome back, {athlete?.user?.firstName || athlete?.teamName || 'Athlete'}! 👋
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
        Here's your performance overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Sessions" value={stats?.totalSessions || 0}
            icon={<DirectionsRun fontSize="large" />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg Rating" value={stats?.avgPersonalRating || '0.0'}
            icon={<TrendingUp fontSize="large" />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Competitions" value={stats?.bySessionType?.competition || 0}
            icon={<EmojiEvents fontSize="large" />} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Training Sessions" value={stats?.bySessionType?.training || 0}
            icon={<CalendarToday fontSize="large" />} color="#9c27b0" />
        </Grid>
      </Grid>

      {/* AI Insights */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>🤖 AI-Powered Insights</Typography>
        <PredictionCard prediction={prediction} injuryRisk={injuryRisk} />
      </Box>

      {/* Coach Feedback */}
      <CoachFeedbackCard
        performances={allPerformances}
        coachName={athlete?.coachName || null}
      />

      {/* Performance Charts */}
      <Box sx={{ mb: 4 }}>
        <PerformanceChart performances={recentPerformances} stats={stats} />
      </Box>

      {/* Athlete Profile Summary */}
      {athlete && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Athlete Profile</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">Primary Sport</Typography>
              <Typography variant="body1" fontWeight="bold">{athlete.primarySport || 'Not set'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">Position</Typography>
              <Typography variant="body1" fontWeight="bold">{athlete.position || 'Not set'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">Height</Typography>
              <Typography variant="body1" fontWeight="bold">
                {athlete.height ? `${athlete.height} cm` : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="textSecondary">Weight</Typography>
              <Typography variant="body1" fontWeight="bold">
                {athlete.weight ? `${athlete.weight} kg` : 'Not set'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Recent Performances */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Performances</Typography>
        {recentPerformances.length === 0 ? (
          <Alert severity="info">No performances recorded yet. Start by adding your first performance!</Alert>
        ) : (
          <Box>
            {recentPerformances.map((performance) => (
              <Box key={performance.id} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0',
                borderRadius: 1, '&:hover': { backgroundColor: '#f5f5f5' } }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      {performance.performanceDate ?
                        (() => { try { return format(new Date(performance.performanceDate), 'MMM dd, yyyy'); }
                          catch { return 'Invalid date'; } })() : 'No date'}
                    </Typography>
                    <Typography variant="h6">{performance.sport}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Session Type</Typography>
                    <Typography variant="body1" textTransform="capitalize">{performance.sessionType}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Duration</Typography>
                    <Typography variant="body1">{performance.duration} min</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Rating</Typography>
                    <Typography variant="body1" fontWeight="bold">{performance.personalRating ?? 'N/A'}/10</Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;