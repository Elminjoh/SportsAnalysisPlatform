import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Box,
} from '@mui/material';
import performanceService from '../../services/performanceService';

const AddPerformance = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    sport: '',
    performanceDate: new Date().toISOString().slice(0, 16),
    sessionType: 'training',
    duration: '',
    intensity: 'medium',
    location: '',
    notes: '',
    personalRating: '',
  });
  const [metrics, setMetrics] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMetricChange = (metricName, value) => {
    setMetrics({
      ...metrics,
      [metricName]: parseFloat(value) || value,
    });
  };

  const addMetricField = () => {
    const metricName = prompt('Enter metric name (e.g., sprint_speed_100m):');
    if (metricName && !metrics[metricName]) {
      setMetrics({
        ...metrics,
        [metricName]: '',
      });
    }
  };

  const removeMetric = (metricName) => {
    const newMetrics = { ...metrics };
    delete newMetrics[metricName];
    setMetrics(newMetrics);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // Format data to match backend expectations
    const performanceData = {
      sport: formData.sport,
      performanceDate: formData.performanceDate, // ← Don't convert, send as-is
      sessionType: formData.sessionType,
      duration: parseInt(formData.duration),
      intensity: formData.intensity,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
      personalRating: parseInt(formData.personalRating),
      metrics: Object.keys(metrics).length > 0 ? metrics : {},
    };

    console.log('Sending performance data:', performanceData);

    await performanceService.createPerformance(performanceData);
    navigate('/performances');
  } catch (err) {
    console.error('Performance error:', err.response);
    const errorMsg = err.response?.data?.errors 
      ? err.response.data.errors.map(e => e.msg).join(', ')
      : err.response?.data?.message || 'Failed to add performance';
    setError(errorMsg);
  } finally {
    setLoading(false);
  }
};

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Add New Performance
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Sport"
                name="sport"
                value={formData.sport}
                onChange={handleChange}
                placeholder="e.g., Football, Basketball"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Performance Date"
                name="performanceDate"
                type="datetime-local"
                value={formData.performanceDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Session Type"
                name="sessionType"
                value={formData.sessionType}
                onChange={handleChange}
              >
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="competition">Competition</MenuItem>
                <MenuItem value="assessment">Assessment</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Duration (minutes)"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Intensity"
                name="intensity"
                value={formData.intensity}
                onChange={handleChange}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="maximum">Maximum</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Personal Rating (1-10)"
                name="personalRating"
                type="number"
                inputProps={{ min: 1, max: 10 }}
                value={formData.personalRating}
                onChange={handleChange}
              />
            </Grid>

            {/* Metrics Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Performance Metrics
              </Typography>
              <Button
                variant="outlined"
                onClick={addMetricField}
                sx={{ mb: 2 }}
              >
                + Add Metric
              </Button>
            </Grid>

            {Object.entries(metrics).map(([metricName, value]) => (
              <Grid item xs={12} sm={6} key={metricName}>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    label={metricName.replace(/_/g, ' ')}
                    type="number"
                    value={value}
                    onChange={(e) => handleMetricChange(metricName, e.target.value)}
                  />
                  <Button
                    color="error"
                    onClick={() => removeMetric(metricName)}
                  >
                    Remove
                  </Button>
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/performances')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Performance'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddPerformance;