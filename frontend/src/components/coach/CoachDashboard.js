import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
  Alert, Button, Avatar, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  People, Assessment, ContentCopy, Check,
  Add, TrendingUp, Warning
} from '@mui/icons-material';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import CoachAssessmentForm from './CoachAssessmentForm';
import CoachRoster from './CoachRoster';
import PlayerDetail from './PlayerDetail';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

const POSITION_COLOURS = {
  'Goalkeeper':           '#ff9800',
  'Centre-Back':          '#ef5350',
  'Full-Back':            '#ec407a',
  'Defensive-Midfielder': '#ab47bc',
  'Central-Midfielder':   '#5c6bc0',
  'Attacking-Midfielder': '#42a5f5',
  'Winger':               '#26c6da',
  'Centre-Forward':       '#66bb6a',
};

const getLatestScores = (athlete) => {
  const assessments = (athlete.performances || []).filter(
    p => p.sessionType === 'assessment' && p.metrics?.technical_composite !== undefined
  );
  if (!assessments.length) return null;
  const latest = assessments.sort((a, b) => new Date(b.performanceDate) - new Date(a.performanceDate))[0];
  const { technical_composite: t, tactical_composite: ta, physical_composite: ph, psychological_composite: ps } = latest.metrics;
  return { technical: t, tactical: ta, physical: ph, psychological: ps,
    overall: parseFloat(((t + ta + ph + ps) / 4).toFixed(1)) };
};

export default function CoachDashboard({ user }) {
  const [roster, setRoster]                   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [copied, setCopied]                   = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  const location = useLocation();
  const urlView  = new URLSearchParams(location.search).get('view');
  const [view, setView] = useState(urlView || 'dashboard');

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('view');
    if      (p === 'assess') { setSelectedAthlete(null); setView('assess'); }
    else if (p === 'roster') setView('roster');
    else                     setView('dashboard');
  }, [location.search]);

  const token = localStorage.getItem('token');
  useEffect(() => { fetchRoster(); }, []);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/roster`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoster(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const copyTeamCode = () => {
    navigator.clipboard.writeText(user.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToPlayer = (athlete) => { setSelectedAthlete(athlete); setView('player'); };
  const goToAssess = (athlete) => { setSelectedAthlete(athlete); setView('assess'); };

  // ── Derived dashboard stats ───────────────────────────────────────────────
  const totalAssessments = roster.reduce((sum, a) => sum + (a.performances?.length || 0), 0);

  const athletesWithScores = roster
    .map(a => ({ ...a, scores: getLatestScores(a) }))
    .filter(a => a.scores !== null);

  const topPerformers = [...athletesWithScores]
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 3);

  const needsAttention = [...athletesWithScores]
    .filter(a => a.scores.overall < 60)
    .sort((a, b) => a.scores.overall - b.scores.overall)
    .slice(0, 3);

  const recentAssessments = roster
    .flatMap(a => (a.performances || []).map(p => ({ ...p, athlete: a })))
    .filter(p => p.sessionType === 'assessment')
    .sort((a, b) => new Date(b.performanceDate) - new Date(a.performanceDate))
    .slice(0, 5);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress />
    </Box>
  );

  if (view === 'assess') return (
    <CoachAssessmentForm
      roster={roster}
      selectedAthlete={selectedAthlete}
      onBack={() => { setView('roster'); setSelectedAthlete(null); }}
      onSuccess={() => { setView('roster'); fetchRoster(); }}
    />
  );

  if (view === 'player' && selectedAthlete) return (
    <PlayerDetail
      athlete={selectedAthlete}
      onBack={() => { setView('roster'); setSelectedAthlete(null); }}
      onAssess={() => goToAssess(selectedAthlete)}
    />
  );

  if (view === 'roster') return (
    <CoachRoster
      roster={roster}
      user={user}
      onPlayerClick={goToPlayer}
      onAssess={goToAssess}
    />
  );

  // ── Dashboard overview ────────────────────────────────────────────────────
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>🏋️ Coach Dashboard</Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Welcome back, {user.firstName}. Here's your squad overview.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}
          onClick={() => goToAssess(null)} disabled={roster.length === 0}>
          New Assessment
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <People sx={{ fontSize: 40, color: '#1976d2' }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>{roster.length}</Typography>
                <Typography variant="body2" color="text.secondary">Players on Roster</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assessment sx={{ fontSize: 40, color: '#43a047' }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>{totalAssessments}</Typography>
                <Typography variant="body2" color="text.secondary">Total Assessments</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '2px dashed #1976d2' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Your Team Code</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Typography variant="h5" fontWeight={700} letterSpacing={3} color="primary">
                  {user.teamCode}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                  <IconButton size="small" onClick={copyTeamCode} color={copied ? 'success' : 'default'}>
                    {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Share this code with players to join your roster
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Assessments */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>📋 Recent Assessments</Typography>
              {recentAssessments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No assessments submitted yet.</Typography>
              ) : (
                recentAssessments.map((p, i) => {
                  const t = p.metrics?.technical_composite || 0;
                  const ta = p.metrics?.tactical_composite || 0;
                  const ph = p.metrics?.physical_composite || 0;
                  const ps = p.metrics?.psychological_composite || 0;
                  const overall = p.metrics?.technical_composite !== undefined
                    ? parseFloat(((t + ta + ph + ps) / 4).toFixed(1)) : null;
                  return (
                    <Box key={i} display="flex" alignItems="center" justifyContent="space-between"
                      py={1} borderBottom={i < recentAssessments.length - 1 ? '1px solid #f0f0f0' : 'none'}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' } }}
                      onClick={() => goToPlayer(p.athlete)}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1976d2', fontSize: 12 }}>
                          {getInitials(p.athlete.user?.firstName, p.athlete.user?.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {p.athlete.user?.firstName} {p.athlete.user?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(p.performanceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </Box>
                      {overall !== null && (
                        <Chip label={`${overall}%`} size="small"
                          color={overall >= 70 ? 'success' : overall >= 50 ? 'warning' : 'error'} />
                      )}
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performers & Needs Attention */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2} direction="column">
            <Grid item>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    <TrendingUp sx={{ color: '#43a047', mr: 1, verticalAlign: 'middle' }} />
                    Top Performers
                  </Typography>
                  {topPerformers.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Submit assessments to see top performers.
                    </Typography>
                  ) : (
                    topPerformers.map((a, i) => (
                      <Box key={a.id} display="flex" alignItems="center" justifyContent="space-between"
                        py={1} borderBottom={i < topPerformers.length - 1 ? '1px solid #f0f0f0' : 'none'}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' } }}
                        onClick={() => goToPlayer(a)}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ width: 20 }}>
                            #{i + 1}
                          </Typography>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: POSITION_COLOURS[a.position] || '#1976d2', fontSize: 12 }}>
                            {getInitials(a.user?.firstName, a.user?.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {a.user?.firstName} {a.user?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{a.position || 'Unknown'}</Typography>
                          </Box>
                        </Box>
                        <Chip label={`${a.scores.overall}%`} size="small" color="success" />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    <Warning sx={{ color: '#ed6c02', mr: 1, verticalAlign: 'middle' }} />
                    Needs Attention
                  </Typography>
                  {needsAttention.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {athletesWithScores.length === 0
                        ? 'Submit assessments to identify players needing support.'
                        : 'All assessed players are performing well! 🎉'}
                    </Typography>
                  ) : (
                    needsAttention.map((a, i) => (
                      <Box key={a.id} display="flex" alignItems="center" justifyContent="space-between"
                        py={1} borderBottom={i < needsAttention.length - 1 ? '1px solid #f0f0f0' : 'none'}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' } }}
                        onClick={() => goToPlayer(a)}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: POSITION_COLOURS[a.position] || '#e0e0e0', fontSize: 12 }}>
                            {getInitials(a.user?.firstName, a.user?.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {a.user?.firstName} {a.user?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{a.position || 'Unknown'}</Typography>
                          </Box>
                        </Box>
                        <Chip label={`${a.scores.overall}%`} size="small" color="warning" />
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}