import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Avatar,
  Divider, MenuItem, Select, FormControl, InputLabel, LinearProgress
} from '@mui/material';
import { Add, ContentCopy, Check, SportsSoccer } from '@mui/icons-material';

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

const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

const getLatestScores = (athlete) => {
  const assessments = (athlete.performances || []).filter(
    p => p.sessionType === 'assessment' && p.metrics?.technical_composite !== undefined
  );
  if (!assessments.length) return null;
  const latest = assessments.sort((a, b) => new Date(b.performanceDate) - new Date(a.performanceDate))[0];
  const { technical_composite: t, tactical_composite: ta, physical_composite: ph, psychological_composite: ps } = latest.metrics;
  return {
    technical:     t,
    tactical:      ta,
    physical:      ph,
    psychological: ps,
    overall:       parseFloat(((t + ta + ph + ps) / 4).toFixed(1)),
  };
};

export default function CoachRoster({ roster, user, onPlayerClick, onAssess }) {
  const [sortBy, setSortBy]   = useState('name');
  const [copied, setCopied]   = useState(false);

  const copyTeamCode = () => {
    navigator.clipboard.writeText(user.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sortedRoster = [...roster].sort((a, b) => {
    const sa = getLatestScores(a), sb = getLatestScores(b);
    if (sortBy === 'name')      return (a.user?.firstName || '').localeCompare(b.user?.firstName || '');
    if (sortBy === 'position')  return (a.position || '').localeCompare(b.position || '');
    if (sortBy === 'overall')   return (sb?.overall || 0) - (sa?.overall || 0);
    if (sortBy === 'technical') return (sb?.technical || 0) - (sa?.technical || 0);
    if (sortBy === 'tactical')  return (sb?.tactical || 0) - (sa?.tactical || 0);
    if (sortBy === 'physical')  return (sb?.physical || 0) - (sa?.physical || 0);
    return 0;
  });

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight={700}>👥 My Roster</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} label="Sort by" onChange={e => setSortBy(e.target.value)}>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="position">Position</MenuItem>
              <MenuItem value="overall">Overall Score</MenuItem>
              <MenuItem value="technical">Technical Score</MenuItem>
              <MenuItem value="tactical">Tactical Score</MenuItem>
              <MenuItem value="physical">Physical Score</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => onAssess(null)} disabled={roster.length === 0}>
            New Assessment
          </Button>
        </Box>
      </Box>

      {/* Empty state */}
      {roster.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SportsSoccer sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No players yet</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Share your team code <strong>{user.teamCode}</strong> with your players so they can join.
            </Typography>
            <Button variant="outlined" startIcon={copied ? <Check /> : <ContentCopy />} onClick={copyTeamCode}>
              {copied ? 'Copied!' : 'Copy Team Code'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {sortedRoster.map(athlete => {
            const scores = getLatestScores(athlete);
            return (
              <Grid item xs={12} sm={6} md={4} key={athlete.id}>
                <Card
                  sx={{ cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}
                  onClick={() => onPlayerClick(athlete)}
                >
                  <CardContent>
                    {/* Player header */}
                    <Box display="flex" alignItems="center" gap={2} mb={1.5}>
                      <Avatar sx={{ bgcolor: POSITION_COLOURS[athlete.position] || '#1976d2', width: 48, height: 48 }}>
                        {getInitials(athlete.user?.firstName, athlete.user?.lastName)}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {athlete.user?.firstName} {athlete.user?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {athlete.user?.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    {/* Position + skill chips */}
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                      <Chip
                        label={athlete.position || 'Unknown Position'}
                        size="small"
                        sx={{
                          bgcolor: POSITION_COLOURS[athlete.position] || '#e0e0e0',
                          color:   POSITION_COLOURS[athlete.position] ? '#fff' : 'inherit'
                        }}
                      />
                      <Chip label={athlete.skillLevel} size="small" variant="outlined" />
                    </Box>

                    {/* Score bars */}
                    {scores ? (
                      <Box mb={1.5}>
                        {[
                          ['Technical',  scores.technical,  '#1976d2'],
                          ['Tactical',   scores.tactical,   '#7b1fa2'],
                          ['Physical',   scores.physical,   '#2e7d32'],
                        ].map(([label, val, colour]) => (
                          <Box key={label} mb={0.5}>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="caption">{label}</Typography>
                              <Typography variant="caption">{val?.toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate" value={val || 0}
                              sx={{ height: 6, borderRadius: 3, bgcolor: '#f0f0f0',
                                '& .MuiLinearProgress-bar': { bgcolor: colour } }}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                        No assessments yet
                      </Typography>
                    )}

                    {/* Footer */}
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={scores ? `Overall: ${scores.overall}%` : 'Unassessed'}
                        size="small"
                        color={scores ? (scores.overall >= 70 ? 'success' : scores.overall >= 50 ? 'warning' : 'error') : 'default'}
                      />
                      <Button size="small" variant="outlined" startIcon={<Add />}
                        onClick={e => { e.stopPropagation(); onAssess(athlete); }}>
                        Assess
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}