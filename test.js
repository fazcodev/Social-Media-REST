const net = require('net');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);
const socket = net.createConnection({
  host: 'cluster0.9g0jzcz.mongodb.net',
  port: 27017,
});

socket.on('connect', () => {
  console.log('✅ Port 27017 is reachable!');
  socket.end();
});

socket.on('error', (err) => {
  console.error('❌ Cannot reach port 27017:', err.message);
});

socket.on('timeout', () => {
  console.error('❌ Connection timeout');
  socket.destroy();
});

socket.setTimeout(5000);
