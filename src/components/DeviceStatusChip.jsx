import { Chip } from '@mui/material';

const statusConfig = {
  connected: {
    color: 'success',
    label: 'Connected',
  },
  failed: {
    color: 'error',
    label: 'Failed',
  },
  not_tested: {
    color: 'default',
    label: 'Not tested',
  },
};

function DeviceStatusChip({ status = 'not_tested', size = 'small' }) {
  const config = statusConfig[status] || statusConfig.not_tested;

  return <Chip label={config.label} color={config.color} size={size} />;
}

export default DeviceStatusChip;
