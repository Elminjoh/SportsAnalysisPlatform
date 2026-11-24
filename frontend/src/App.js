import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PerformanceList from './components/performance/PerformanceList';
import AddPerformance from './components/performance/AddPerformance';
import EditPerformance from './components/performance/EditPerformance';
import AthleteProfile from './components/athlete/AthleteProfile';
import Analytics from './components/dashboard/Analytics';
import Benchmarking from './components/dashboard/Benchmarking';
import RAEAnalysis from './components/dashboard/RAEAnalysis';
import CoachDashboard from './components/coach/CoachDashboard';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Inner component so useAuth() can be called inside AuthProvider
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
        } />
        <Route path="/performances" element={
          <PrivateRoute><Layout><PerformanceList /></Layout></PrivateRoute>
        } />
        <Route path="/performances/add" element={
          <PrivateRoute><Layout><AddPerformance /></Layout></PrivateRoute>
        } />
        <Route path="/performances/edit/:id" element={
          <PrivateRoute><Layout><EditPerformance /></Layout></PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute><Layout><Analytics /></Layout></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><Layout><AthleteProfile /></Layout></PrivateRoute>
        } />
        <Route path="/benchmarking" element={
          <PrivateRoute><Layout><Benchmarking /></Layout></PrivateRoute>
        } />
        <Route path="/rae" element={
          <PrivateRoute><Layout><RAEAnalysis /></Layout></PrivateRoute>
        } />
        <Route path="/coach" element={
          <PrivateRoute>
            <Layout>
              <CoachDashboard user={user} />
            </Layout>
          </PrivateRoute>
        } />

        {/* Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;