import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Slider, Button,
  TextField, MenuItem, Alert, Divider, Chip, CircularProgress
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RATING_LABELS = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const RATING_COLOURS = { 1: '#ef5350', 2: '#ff9800', 3: '#fdd835', 4: '#66bb6a', 5: '#1976d2' };

const RatingSlider = ({ label, description, value, onChange }) => (
  <Box mb={2}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
      <Box>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{description}</Typography>
      </Box>
      <Chip
        label={RATING_LABELS[value]}
        size="small"
        sx={{ bgcolor: RATING_COLOURS[value], color: '#fff', minWidth: 100, fontWeight: 600 }}
      />
    </Box>
    <Slider
      value={value}
      onChange={(_, v) => onChange(v)}
      min={1} max={5} step={1}
      marks={[1,2,3,4,5].map(v => ({ value: v, label: v }))}
      sx={{ color: RATING_COLOURS[value] }}
    />
  </Box>
);

const defaultRatings = {
  firstTouchSuccess: 3, progressivePassCompletion: 3,
  duelWinRate: 3, offBallMovement: 3,
  decisionSpeed: 3, patternRecognition: 3, adaptability: 3,
  acceleration: 3, repeatedSprintAbility: 3, changeOfDirection: 3,
  consistency: 3, resilience: 3, performanceUnderPressure: 3,
};

export default function CoachAssessmentForm({ roster, selectedAthlete, onBack, onSuccess }) {
  const [athleteId, setAthleteId]   = useState(selectedAthlete?.id || '');
  const [sessionDate, setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setType]      = useState('assessment');
  const [duration, setDuration]     = useState('');
  const [ratings, setRatings]       = useState(defaultRatings);
  const [coachNotes, setNotes]      = useState('');
  const [standout, setStandout]     = useState('');
  const [improve, setImprove]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const setRating = (key, val) => setRatings(r => ({ ...r, [key]: val }));

  const handleSubmit = async () => {
    if (!athleteId) { setError('Please select a player'); return; }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/performance/coach-assessment`, {
        athleteId,
        sessionDate,
        sessionType,
        duration: duration ? parseInt(duration) : null,
        ...ratings,
        coachNotes,
        standoutMoment:      standout,
        areasForImprovement: improve,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={onBack}>Back</Button>
        <Typography variant="h5" fontWeight={700}>📋 Player Assessment</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Session info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Session Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth label="Player" value={athleteId}
                onChange={e => setAthleteId(e.target.value)}
                disabled={!!selectedAthlete}
              >
                {roster.map(a => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.user?.firstName} {a.user?.lastName} — {a.position || 'Unknown'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Session Date" type="date" value={sessionDate}
                onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Duration (mins)" type="number"
                value={duration} onChange={e => setDuration(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Session Type" value={sessionType}
                onChange={e => setType(e.target.value)}>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="competition">Competition</MenuItem>
                <MenuItem value="assessment">Assessment</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Technical */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} color="#1976d2" mb={2}>⚽ Technical</Typography>
              <RatingSlider label="First Touch Success" description="Control under pressure"
                value={ratings.firstTouchSuccess} onChange={v => setRating('firstTouchSuccess', v)} />
              <RatingSlider label="Progressive Passing" description="Forward pass completion rate"
                value={ratings.progressivePassCompletion} onChange={v => setRating('progressivePassCompletion', v)} />
              <RatingSlider label="Duel Win Rate" description="1v1 success in challenges"
                value={ratings.duelWinRate} onChange={v => setRating('duelWinRate', v)} />
              <RatingSlider label="Off-Ball Movement" description="Positioning without the ball"
                value={ratings.offBallMovement} onChange={v => setRating('offBallMovement', v)} />
            </CardContent>
          </Card>
        </Grid>

        {/* Tactical */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} color="#7b1fa2" mb={2}>🧠 Tactical</Typography>
              <RatingSlider label="Decision Speed" description="How quickly correct decisions are made"
                value={ratings.decisionSpeed} onChange={v => setRating('decisionSpeed', v)} />
              <RatingSlider label="Pattern Recognition" description="Reading the game and anticipating play"
                value={ratings.patternRecognition} onChange={v => setRating('patternRecognition', v)} />
              <RatingSlider label="Adaptability" description="Adjusting to changing game situations"
                value={ratings.adaptability} onChange={v => setRating('adaptability', v)} />
            </CardContent>
          </Card>
        </Grid>

        {/* Physical */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} color="#2e7d32" mb={2}>💪 Physical</Typography>
              <RatingSlider label="Acceleration" description="Initial burst of speed"
                value={ratings.acceleration} onChange={v => setRating('acceleration', v)} />
              <RatingSlider label="Repeated Sprint Ability" description="Maintaining speed over multiple sprints"
                value={ratings.repeatedSprintAbility} onChange={v => setRating('repeatedSprintAbility', v)} />
              <RatingSlider label="Change of Direction" description="Agility and directional change speed"
                value={ratings.changeOfDirection} onChange={v => setRating('changeOfDirection', v)} />
            </CardContent>
          </Card>
        </Grid>

        {/* Psychological */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} color="#c62828" mb={2}>🧘 Psychological</Typography>
              <RatingSlider label="Consistency" description="Performing at a similar level each session"
                value={ratings.consistency} onChange={v => setRating('consistency', v)} />
              <RatingSlider label="Resilience" description="Bouncing back from mistakes or setbacks"
                value={ratings.resilience} onChange={v => setRating('resilience', v)} />
              <RatingSlider label="Performance Under Pressure" description="Maintaining quality in high-pressure moments"
                value={ratings.performanceUnderPressure} onChange={v => setRating('performanceUnderPressure', v)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Coach notes */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>📝 Coach Notes</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth multiline rows={3} label="Standout Moment"
                placeholder="What did this player do exceptionally well?"
                value={standout} onChange={e => setStandout(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth multiline rows={3} label="Areas for Improvement"
                placeholder="What should this player focus on next session?"
                value={improve} onChange={e => setImprove(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Additional Notes"
                placeholder="Any other observations..."
                value={coachNotes} onChange={e => setNotes(e.target.value)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button variant="outlined" onClick={onBack} sx={{ mr: 2 }}>Cancel</Button>
        <Button
          variant="contained" size="large" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
          onClick={handleSubmit} disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </Button>
      </Box>
    </Box>
  );
}