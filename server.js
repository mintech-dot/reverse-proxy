import net from 'net';

const SERVER_PORT = 3000;

const server = net.createServer((socket) => {
  socket.once('data', (data) => {
    // SOCKS5 Version Identifier/Method Selection
    if (data[0] !== 0x05) {
      console.error('Unsupported SOCKS version:', data[0]);
      socket.end();
      return;
    }

    // We only support No Authentication (0x00)
    // Server selection message: VER (1) | METHOD (1)
    socket.write(Buffer.from([0x05, 0x00]));

    socket.once('data', (data) => {
      // SOCKS5 Request Details
      if (data[0] !== 0x05 || data[2] !== 0x00) {
        console.error('Invalid SOCKS5 request');
        socket.end();
        return;
      }

      const command = data[1];
      if (command !== 0x01) { // CONNECT
        console.error('Unsupported command:', command);
        socket.end();
        return;
      }

      const addressType = data[3];
      let targetAddress;
      let targetPort;
      let offset = 4;

      if (addressType === 0x01) { // IPv4
        targetAddress = data.slice(offset, offset + 4).join('.');
        offset += 4;
      } else if (addressType === 0x03) { // Domain name
        const addrLen = data[offset];
        offset += 1;
        targetAddress = data.toString('utf8', offset, offset + addrLen);
        offset += addrLen;
      } else if (addressType === 0x04) { // IPv6
        // IPv6 not fully implemented in this simple example, but structure is here
        // targetAddress = ...
        console.error('IPv6 not supported');
        socket.end();
        return;
      } else {
        console.error('Unsupported address type:', addressType);
        socket.end();
        return;
      }

      targetPort = data.readUInt16BE(offset);

      console.log(`Connecting to ${targetAddress}:${targetPort}`);

      const targetSocket = net.createConnection(targetPort, targetAddress, () => {
        // SOCKS5 Reply: VER | REP | RSV | ATYP | BND.ADDR | BND.PORT
        // REP: 0x00 succeeded
        const response = Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
        socket.write(response);

        socket.pipe(targetSocket);
        targetSocket.pipe(socket);
      });

      targetSocket.on('error', (err) => {
        console.error('Target connection error:', err.message);
        socket.end();
      });

      socket.on('error', (err) => {
        console.error('Client socket error:', err.message);
        targetSocket.end();
      });
    });
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`SOCKS5 proxy server listening on port ${SERVER_PORT}`);
});
