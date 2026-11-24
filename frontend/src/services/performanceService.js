import api from './api';

const performanceService = {
  // Create performance record
  createPerformance: async (performanceData) => {
    const response = await api.post('/performance', performanceData);
    return response.data;
  },

  // Get all my performances
  getMyPerformances: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/performance?${params}`);
    return response.data;
  },

  // Get performance by ID
  getPerformanceById: async (id) => {
    const response = await api.get(`/performance/${id}`);
    return response.data;
  },

  // Update performance
  updatePerformance: async (id, performanceData) => {
    const response = await api.put(`/performance/${id}`, performanceData);
    return response.data;
  },

  // Delete performance
  deletePerformance: async (id) => {
    const response = await api.delete(`/performance/${id}`);
    return response.data;
  },

  // Get performance statistics
  getStatistics: async (sport = null) => {
    const params = sport ? `?sport=${sport}` : '';
    const response = await api.get(`/performance/stats/summary${params}`);
    return response.data;
  },

  // Get performance trends for a metric
  getTrends: async (metric, sport = null) => {
    const params = sport ? `?sport=${sport}` : '';
    const response = await api.get(`/performance/trends/${metric}${params}`);
    return response.data;
  },

  getBenchmark: async () => {
  const response = await api.get('/performance/benchmark');
  return response.data;
},

};

export default performanceService;