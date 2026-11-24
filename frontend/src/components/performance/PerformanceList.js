import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Box,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import Loading from '../common/Loading';
import performanceService from '../../services/performanceService';
import { format } from 'date-fns';

const PerformanceList = () => {
  const navigate = useNavigate();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    fetchPerformances();
  }, []);

 const fetchPerformances = async () => {
  try {
    setLoading(true);
    const response = await performanceService.getMyPerformances();
    setPerformances(response.data || []);
    setLoading(false);
  } catch (err) {
    if (err.response?.status === 404) {
      // No performances yet - that's okay
      setPerformances([]);
      setLoading(false);
    } else {
      setError('Failed to load performances');
      setLoading(false);
    }
  }
};

  const handleDelete = async () => {
    try {
      await performanceService.deletePerformance(deleteDialog.id);
      setPerformances(performances.filter((p) => p.id !== deleteDialog.id));
      setDeleteDialog({ open: false, id: null });
    } catch (err) {
      setError('Failed to delete performance');
    }
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'training':
        return 'primary';
      case 'competition':
        return 'success';
      case 'assessment':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <Loading message="Loading performances..." />;
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Performances</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/performances/add')}
        >
          Add Performance
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {performances.length === 0 ? (
        <Alert severity="info">
          No performances recorded yet. Start by adding your first performance!
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Sport</TableCell>
                <TableCell>Session Type</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Intensity</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performances.map((performance) => (
                <TableRow key={performance.id} hover>
                 <TableCell>
                    {performance.performancedate ? 
                      (() => {
                        try {
                          return format(new Date(performance.performancedate), 'MMM dd, yyyy');
                        } catch (e) {
                          return 'Invalid date';
                        }
                      })() : 
                      'No date'
                    }
                  </TableCell>
                  <TableCell>{performance.sport}</TableCell>
                  <TableCell>
                    <Chip
                      label={performance.sessiontype}
                      color={getSessionTypeColor(performance.sessiontype)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{performance.duration} min</TableCell>
                  <TableCell>
                    <Chip
                      label={performance.intensity}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>⭐ {performance.personalrating}/10</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/performances/edit/${performance.id}`)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, id: performance.id })}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
      >
        <DialogTitle>Delete Performance</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this performance record? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PerformanceList;
