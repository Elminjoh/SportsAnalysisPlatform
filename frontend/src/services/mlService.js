const ML_API_URL = process.env.REACT_APP_ML_URL || 'http://localhost:5001/api';

const mlService = {
  // Predict performance
  predictPerformance: async (athleteId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ML_API_URL}/predict/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ athleteId })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('ML prediction error:', error);
      throw error;
    }
  },

  // Assess injury risk
  assessInjuryRisk: async (athleteId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${ML_API_URL}/predict/injury-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ athleteId })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('ML risk assessment error:', error);
      throw error;
    }
  }
};

export default mlService;