import React from 'react';
import {
  Paper, Typography, Box, Grid, LinearProgress,
  Chip, Divider, Alert
} from '@mui/material';
import { SportsScore, Star, TrendingUp } from '@mui/icons-material';
import { format } from 'date-fns';

const COMPOSITES = [
  { key: 'technical_composite',     label: 'Technical',     colour: '#1976d2' },
  { key: 'tactical_composite',      label: 'Tactical',      colour: '#7b1fa2' },
  { key: 'physical_composite',      label: 'Physical',      colour: '#2e7d32' },
  { key: 'psychological_composite', label: 'Psychological', colour: '#c62828' },
];

export default function CoachFeedbackCard({ performances, coachName }) {
  // Filter to coach assessments only
  const assessments = (performances || [])
    .filter(p => p.sessionType === 'assessment' && p.metrics?.technical_composite !== undefined)
    .sort((a, b) => new Date(b.performanceDate) - new Date(a.performanceDate));

  const latest = assessments[0];

  // Not linked to a coach yet
  if (!coachName) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>📋 Coach Feedback</Typography>
        <Alert severity="info">
          You haven't joined a team yet. Use the <strong>Join Team</strong> button on your Profile page to connect with your coach.
        </Alert>
      </Paper>
    );
  }

  // Linked to coach but no assessments yet
  if (!latest) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">📋 Coach Feedback</Typography>
          <Chip label={`Coach: ${coachName}`} size="small" color="primary" variant="outlined" />
        </Box>
        <Alert severity="info">
          Your coach hasn't submitted an assessment yet. Check back after your next session.
        </Alert>
      </Paper>
    );
  }

  // Parse coach notes
  const feedbackLines = latest.coachFeedback
    ? latest.coachFeedback.split(' | ').filter(Boolean)
    : [];

  const standout = feedbackLines.find(l => l.startsWith('Standout:'))?.replace('Standout:', '').trim();
  const improve  = feedbackLines.find(l => l.startsWith('Improve:'))?.replace('Improve:', '').trim();
  const notes    = feedbackLines.find(l => l.startsWith('Notes:'))?.replace('Notes:', '').trim();

  const overall = parseFloat(
    (COMPOSITES.reduce((sum, c) => sum + (latest.metrics[c.key] || 0), 0) / COMPOSITES.length).toFixed(1)
  );

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6">📋 Coach Feedback</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label={`Coach: ${coachName}`} size="small" color="primary" variant="outlined" />
          <Chip
            label={`Overall: ${overall}%`}
            size="small"
            color={overall >= 70 ? 'success' : overall >= 50 ? 'warning' : 'error'}
          />
          <Chip
            label={format(new Date(latest.performanceDate), 'dd MMM yyyy')}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Composite score bars */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Performance Scores
          </Typography>
          {COMPOSITES.map(({ key, label, colour }) => (
            <Box key={key} mb={1.5}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight={600}>{label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {latest.metrics[key]?.toFixed(0) || 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={latest.metrics[key] || 0}
                sx={{
                  height: 8, borderRadius: 4, bgcolor: '#f0f0f0',
                  '& .MuiLinearProgress-bar': { bgcolor: colour, borderRadius: 4 }
                }}
              />
            </Box>
          ))}
        </Grid>

        {/* Coach notes */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Coach Notes
          </Typography>

          {standout && (
            <Box mb={2}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <Star fontSize="small" sx={{ color: '#fdd835' }} />
                <Typography variant="body2" fontWeight={600}>Standout Moment</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{standout}</Typography>
            </Box>
          )}

          {improve && (
            <Box mb={2}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <TrendingUp fontSize="small" sx={{ color: '#1976d2' }} />
                <Typography variant="body2" fontWeight={600}>Areas to Improve</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{improve}</Typography>
            </Box>
          )}

          {notes && (
            <Box mb={2}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <SportsScore fontSize="small" sx={{ color: '#43a047' }} />
                <Typography variant="body2" fontWeight={600}>Additional Notes</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{notes}</Typography>
            </Box>
          )}

          {!standout && !improve && !notes && (
            <Typography variant="body2" color="text.secondary">No written notes for this assessment.</Typography>
          )}
        </Grid>
      </Grid>

      {/* Assessment history count */}
      {assessments.length > 1 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            {assessments.length} assessments on record — showing most recent. Your coach has been tracking your progress since{' '}
            {format(new Date(assessments[assessments.length - 1].performanceDate), 'dd MMM yyyy')}.
          </Typography>
        </>
      )}
    </Paper>
  );
}