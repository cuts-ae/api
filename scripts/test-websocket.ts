import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:45000';

console.log('Testing WebSocket Connection...\n');
console.log('='.repeat(60));

const socket: Socket = io(SOCKET_URL, {
  auth: {
    token: 'test-token-will-fail'
  },
  reconnectionAttempts: 3,
  timeout: 5000,
});

socket.on('connect', () => {
  console.log('SUCCESS: Connected to Socket.io server');
  console.log('Socket ID:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
  console.log('='.repeat(60));
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  if (error.message.includes('authentication') || error.message.includes('Authentication') || error.message.includes('token')) {
    console.log('SUCCESS: Socket.io server is running and requiring authentication');
    console.log('Error (Expected):', error.message);
    console.log('='.repeat(60));
    console.log('\nWebSocket endpoint is accessible and protected!');
    socket.disconnect();
    process.exit(0);
  } else {
    console.error('FAILED: Connection error:', error.message);
    console.log('='.repeat(60));
    socket.disconnect();
    process.exit(1);
  }
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

setTimeout(() => {
  console.error('\nTIMEOUT: Could not connect to WebSocket server');
  console.log('='.repeat(60));
  socket.disconnect();
  process.exit(1);
}, 10000);
