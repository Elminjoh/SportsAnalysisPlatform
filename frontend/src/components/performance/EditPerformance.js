import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import Loading from '../common/Loading';
import performanceService from '../../services/performanceService';

const EditPerformance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await performanceService.getPerformanceById(id);
        const performance = response.data;
        
        setFormData({
          sport: performance.sport,
          performanceDate: new Date(performance.performancedate).toISOString().slice(0, 16),
          sessionType: performance.sessiontype,
          duration: performance.duration,
          intensity: performance.intensity,
          location: performance.location || '',
          notes: performance.notes || '',
          personalRating: performance.personalrating,
        });
        setMetrics(performance.metrics || {});
        setLoading(false);
      } catch (err) {
        setError('Failed to load performance');
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [id]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const performanceData = {
        ...formData,
        duration: parseInt(formData.duration),
        personalRating: parseInt(formData.personalRating),
        metrics,
      };

      await performanceService.updatePerformance(id, performanceData);
      navigate('/performances');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update performance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading message="Loading performance..." />;
  }

  if (!formData) {
    return (
      <Container>
        <Alert severity="error">Performance not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Edit Performance
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
                <MenuItem value="moderate">Moderate</MenuItem>
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
            </Grid>

            {Object.entries(metrics).map(([metricName, value]) => (
              <Grid item xs={12} sm={6} key={metricName}>
                <TextField
                  fullWidth
                  label={metricName.replace(/_/g, ' ')}
                  type="number"
                  value={value}
                  onChange={(e) => handleMetricChange(metricName, e.target.value)}
                />
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
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditPerformance;