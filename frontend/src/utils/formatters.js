import { format, parseISO } from 'date-fns';

export const formatDate = (dateString) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateTime = (dateString) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDuration = (minutes) => {
  if (!minutes) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  }
  
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
};

export const formatMetricName = (metricKey) => {
  return metricKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi.toFixed(1);
};

export const getSessionTypeLabel = (sessionType) => {
  const labels = {
    training: 'Training',
    competition: 'Competition',
    assessment: 'Assessment',
  };
  return labels[sessionType] || sessionType;
};

export const getIntensityLabel = (intensity) => {
  const labels = {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    maximum: 'Maximum',
  };
  return labels[intensity] || intensity;
};
