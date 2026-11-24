import React from 'react';
import { Card, CardContent, Typography, Box, Chip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat, Warning } from '@mui/icons-material';

const PredictionCard = ({ prediction, injuryRisk }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
      case 'slightly_improving':
        return <TrendingUp sx={{ color: '#2e7d32' }} />;
      case 'declining':
      case 'slightly_declining':
        return <TrendingDown sx={{ color: '#d32f2f' }} />;
      case 'stable':
        return <TrendingFlat sx={{ color: '#1976d2' }} />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
      case 'slightly_improving':
        return 'success';
      case 'declining':
      case 'slightly_declining':
        return 'error';
      case 'stable':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return '#d32f2f';
      case 'moderate':
        return '#ed6c02';
      case 'low':
        return '#fbc02d';
      case 'minimal':
        return '#2e7d32';
      default:
        return '#9e9e9e';
    }
  };

  const getRiskLabel = (level) => {
    return level?.charAt(0).toUpperCase() + level?.slice(1) || 'Unknown';
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {/* Performance Prediction Card */}
      <Card sx={{ flex: 1, minWidth: 300 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6">Performance Prediction</Typography>
            {prediction && getTrendIcon(prediction.trend)}
          </Box>

          {prediction ? (
            <>
              <Box display="flex" alignItems="baseline" gap={1} mb={2}>
                <Typography variant="h3" color="primary">
                  {prediction.predictedRating}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  / 10
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Confidence: {(prediction.confidence * 100).toFixed(0)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={prediction.confidence * 100} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              <Chip 
                label={prediction.trend.replace(/_/g, ' ')} 
                color={getTrendColor(prediction.trend)}
                size="small"
                sx={{ mb: 2, textTransform: 'capitalize' }}
              />

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Recommendations:
              </Typography>
              {prediction.recommendations?.map((rec, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ mb: 0.5, pl: 2 }}
                >
                  • {rec}
                </Typography>
              ))}
            </>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Add more performance records for predictions
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Injury Risk Card */}
      <Card sx={{ flex: 1, minWidth: 300 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Warning sx={{ color: getRiskColor(injuryRisk?.riskLevel) }} />
            <Typography variant="h6">Injury Risk Assessment</Typography>
          </Box>

          {injuryRisk ? (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Typography 
                  variant="h4" 
                  sx={{ color: getRiskColor(injuryRisk.riskLevel) }}
                >
                  {getRiskLabel(injuryRisk.riskLevel)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Score: {(injuryRisk.riskScore * 100).toFixed(0)}%
                </Typography>
              </Box>

              <Box mb={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={injuryRisk.riskScore * 100}
                  sx={{ 
                    height: 8, 
                    borderRadius: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getRiskColor(injuryRisk.riskLevel)
                    }
                  }}
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Risk Factors:
              </Typography>
              {injuryRisk.factors?.map((factor, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ mb: 0.5, pl: 2 }}
                >
                  • {factor}
                </Typography>
              ))}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Recommendations:
              </Typography>
              {injuryRisk.recommendations?.map((rec, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ mb: 0.5, pl: 2 }}
                >
                  • {rec}
                </Typography>
              ))}
            </>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Record more sessions for injury risk analysis
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PredictionCard;