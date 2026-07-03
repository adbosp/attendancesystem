import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../api/api.js';
import {
  clearRememberedLogin,
  getRememberedLogin,
  saveRememberedLogin,
  storeUser,
} from '../auth/auth.js';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const rememberedLogin = getRememberedLogin();
  const [formData, setFormData] = useState({
    account: rememberedLogin?.account || '',
    password: rememberedLogin?.password || '',
  });
  const [rememberPassword, setRememberPassword] = useState(Boolean(rememberedLogin?.password));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginAdmin(formData);
      storeUser(data.user);

      if (rememberPassword) {
        saveRememberedLogin(formData);
      } else {
        clearRememberedLogin();
      }

      navigate(redirectPath, { replace: true });
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Cannot login. Please check the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                mx: 'auto',
                mb: 2,
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'rgba(37, 99, 235, 0.1)',
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Admin Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to access the admin dashboard.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              label="Account"
              name="account"
              value={formData.account}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberPassword}
                  onChange={(event) => setRememberPassword(event.target.checked)}
                />
              }
              label="Remember account and password"
            />
            <Button variant="contained" size="large" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

export default Login;
