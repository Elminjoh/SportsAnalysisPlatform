import api from './api';

const athleteService = {
  // Create athlete profile
  createProfile: async (profileData) => {
    const response = await api.post('/athletes', profileData);
    return response.data;
  },

  // Get my profile
  getMyProfile: async () => {
    const response = await api.get('/athletes/me');
    return response.data;
  },

  // Update my profile
  updateMyProfile: async (profileData) => {
    const response = await api.put('/athletes/me', profileData);
    return response.data;
  },

  // Delete my profile
  deleteMyProfile: async () => {
    const response = await api.delete('/athletes/me');
    return response.data;
  },

  // Get all athletes (admin/coach view)
  getAllAthletes: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/athletes?${params}`);
    return response.data;
  },

  // Get athlete by ID
  getAthleteById: async (id) => {
    const response = await api.get(`/athletes/${id}`);
    return response.data;
  },
};

export default athleteService;