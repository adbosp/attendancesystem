import { Box, Paper, Stack, Typography } from '@mui/material';

function PageShell({ title, description, icon }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          minHeight: 280,
          p: { xs: 3, md: 4 },
          border: '1px solid',
          borderColor: 'divider',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: 'rgba(37, 99, 235, 0.1)',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6">{title} Module</Typography>
            <Typography color="text.secondary">
              Frontend route is ready. Business logic can be added later.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default PageShell;
