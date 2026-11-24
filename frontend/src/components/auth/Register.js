import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Link,
  Alert, Paper, MenuItem, Collapse
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', role: 'athlete',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        password:  formData.password,
        role:      formData.role,
      });

      // Redirect based on role
      if (data.user.role === 'coach') {
        navigate('/coach');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            🏃 Sports Analytics
          </Typography>
          <Typography component="h2" variant="h5" align="center" gutterBottom>
            Create Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal" required fullWidth
              label="First Name" name="firstName" autoFocus
              value={formData.firstName} onChange={handleChange}
            />
            <TextField
              margin="normal" required fullWidth
              label="Last Name" name="lastName"
              value={formData.lastName} onChange={handleChange}
            />
            <TextField
              margin="normal" required fullWidth
              label="Email Address" name="email"
              value={formData.email} onChange={handleChange}
            />
            <TextField
              margin="normal" required fullWidth
              label="Password" type="password" name="password"
              value={formData.password} onChange={handleChange}
            />
            <TextField
              margin="normal" required fullWidth
              label="Confirm Password" type="password" name="confirmPassword"
              value={formData.confirmPassword} onChange={handleChange}
            />

            {/* Role selector */}
            <TextField
              margin="normal" fullWidth select
              label="I am registering as..." name="role"
              value={formData.role} onChange={handleChange}
            >
              <MenuItem value="athlete">Athlete — track my own performance</MenuItem>
              <MenuItem value="coach">Coach — assess and manage my players</MenuItem>
            </TextField>

            {/* Info box for coaches */}
            <Collapse in={formData.role === 'coach'}>
              <Alert severity="info" sx={{ mt: 1 }}>
                A unique team code will be generated for you after registration.
                Share it with your players so they can join your roster.
              </Alert>
            </Collapse>

            <Button
              type="submit" fullWidth variant="contained"
              sx={{ mt: 3, mb: 2 }} disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign In
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;