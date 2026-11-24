import React from 'react';
import { Alert, Box } from '@mui/material';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Alert 
        severity="error"
        action={
          onRetry && (
            <button onClick={onRetry}>Retry</button>
          )
        }
      >
        {message || 'An error occurred. Please try again.'}
      </Alert>
    </Box>
  );
};

export default ErrorMessage;