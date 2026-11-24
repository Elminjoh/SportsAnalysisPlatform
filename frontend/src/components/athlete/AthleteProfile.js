import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  Divider,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import { Edit, Save, Cancel, GroupAdd, CheckCircle } from '@mui/icons-material';
import Loading from '../common/Loading';
import athleteService from '../../services/athleteService';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AthleteProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasProfile, setHasProfile] = useState(true);

  // Join Team state
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await athleteService.getMyProfile();
      setProfile(response.data);
      setFormData(response.data);
      setHasProfile(true);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setHasProfile(false);
        setEditMode(true);
        setFormData({
          primarySport: '',
          secondarySports: '',
          position: '',
          height: '',
          weight: '',
          dateOfBirth: '',
          gender: '',
          dominantHand: '',
          dominantFoot: '',
          teamName: '',
          coachName: '',
          yearsExperience: '',
          fitnessLevel: '',
        });
      } else {
        setError('Failed to load profile');
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData(profile || {});
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const profileData = {
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        primarySport: formData.primarySport,
        secondarySports: formData.secondarySports || null,
        position: formData.position || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        skillLevel: formData.fitnessLevel || null,
        dominantHand: formData.dominantHand || null,
        dominantFoot: formData.dominantFoot || null,
        teamName: formData.teamName || null,
        coachName: formData.coachName || null,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
      };

      let response;
      if (hasProfile) {
        response = await athleteService.updateMyProfile(profileData);
        setSuccess('Profile updated successfully!');
      } else {
        response = await athleteService.createProfile(profileData);
        setSuccess('Profile created successfully!');
        setHasProfile(true);
      }

      setProfile(response.data);
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Join Team handlers ──────────────────────────────────────────────────────

  const handleOpenJoinDialog = () => {
    setTeamCode('');
    setJoinError('');
    setJoinSuccess('');
    setJoinDialogOpen(true);
  };

  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
  };

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      setJoinError('Please enter a team code');
      return;
    }

    setJoiningTeam(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/join-team`,
        { teamCode: teamCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setJoinSuccess(response.data.message || 'Successfully joined the team!');
      // Refresh profile so teamName updates
      await fetchProfile();
    } catch (err) {
      setJoinError(
        err.response?.data?.message || 'Invalid team code. Please check and try again.'
      );
    } finally {
      setJoiningTeam(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────

  if (loading) return <Loading message="Loading profile..." />;

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            {hasProfile ? 'My Profile' : 'Create Your Profile'}
          </Typography>
          <Box display="flex" gap={1}>
            {hasProfile && !editMode && (
              <>
                <Button variant="outlined" startIcon={<GroupAdd />} onClick={handleOpenJoinDialog}>
                  Join Team
                </Button>
                <Button variant="contained" startIcon={<Edit />} onClick={handleEdit}>
                  Edit Profile
                </Button>
              </>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Team Badge — shown when athlete is already on a team */}
        {profile?.teamName && (
          <Box mb={2}>
            <Chip
              icon={<CheckCircle />}
              label={`Team: ${profile.teamName}`}
              color="success"
              variant="outlined"
            />
          </Box>
        )}

        {/* Account Information */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Account Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Name</Typography>
              <Typography variant="body1">{user?.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Email</Typography>
              <Typography variant="body1">{user?.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Role</Typography>
              <Typography variant="body1" textTransform="capitalize">{user?.role}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Athletic Information Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>Athletic Information</Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Primary Sport" name="primarySport"
                value={formData.primarySport || ''} onChange={handleChange} disabled={!editMode}
                placeholder="e.g., Football, Basketball" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Secondary Sports" name="secondarySports"
                value={formData.secondarySports || ''} onChange={handleChange} disabled={!editMode}
                placeholder="e.g., Tennis, Swimming" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Position" name="position"
                value={formData.position || ''} onChange={handleChange} disabled={!editMode}
                placeholder="e.g., Forward, Midfielder" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Team Name" name="teamName"
                value={formData.teamName || ''} onChange={handleChange} disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Coach Name" name="coachName"
                value={formData.coachName || ''} onChange={handleChange} disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Years of Experience" name="yearsExperience" type="number"
                value={formData.yearsExperience || ''} onChange={handleChange} disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Skill Level" name="fitnessLevel"
                value={formData.fitnessLevel || ''} onChange={handleChange} disabled={!editMode}>
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Date of Birth" name="dateOfBirth" type="date"
                value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                onChange={handleChange} disabled={!editMode}
                InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth select label="Gender" name="gender"
                value={formData.gender || ''} onChange={handleChange} disabled={!editMode}>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Physical Attributes</Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Height (cm)" name="height" type="number"
                value={formData.height || ''} onChange={handleChange} disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Weight (kg)" name="weight" type="number"
                value={formData.weight || ''} onChange={handleChange} disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Dominant Hand" name="dominantHand"
                value={formData.dominantHand || ''} onChange={handleChange} disabled={!editMode}>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="right">Right</MenuItem>
                <MenuItem value="ambidextrous">Ambidextrous</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Dominant Foot" name="dominantFoot"
                value={formData.dominantFoot || ''} onChange={handleChange} disabled={!editMode}>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="right">Right</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {editMode && (
            <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
              {hasProfile && (
                <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving}>
                {saving ? 'Saving...' : hasProfile ? 'Save Changes' : 'Create Profile'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Join Team Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={joinDialogOpen} onClose={handleCloseJoinDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Join a Team</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter the team code provided by your coach to join their roster.
          </Typography>

          {joinError && <Alert severity="error" sx={{ mb: 2 }}>{joinError}</Alert>}
          {joinSuccess && <Alert severity="success" sx={{ mb: 2 }}>{joinSuccess}</Alert>}

          {!joinSuccess && (
            <TextField
              fullWidth
              label="Team Code"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              placeholder="e.g., 48ENEYQ4"
              inputProps={{ maxLength: 10, style: { letterSpacing: '0.15em', fontFamily: 'monospace' } }}
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinDialog}>
            {joinSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!joinSuccess && (
            <Button variant="contained" onClick={handleJoinTeam} disabled={joiningTeam}>
              {joiningTeam ? 'Joining...' : 'Join Team'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AthleteProfile;