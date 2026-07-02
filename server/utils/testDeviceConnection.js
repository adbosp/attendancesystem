import net from 'net';

const testDeviceConnection = ({ ipAddress, port, timeout = 5000 }) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeout);

    socket.once('connect', () => {
      finish({
        connected: true,
        message: `Connected to ${ipAddress}:${port}`,
      });
    });

    socket.once('timeout', () => {
      finish({
        connected: false,
        message: `Connection timeout to ${ipAddress}:${port}`,
      });
    });

    socket.once('error', (error) => {
      finish({
        connected: false,
        message: error.message,
      });
    });

    socket.connect(port, ipAddress);
  });

export default testDeviceConnection;
