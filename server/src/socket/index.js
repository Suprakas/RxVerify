const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccessToken } = require('../services/tokens');
const { ROLES } = require('../constants');

let io = null;

/**
 * Real-time layer. Each socket proves who it is with the same access token the
 * REST API uses, then joins:
 *   user:<id>        - updates about the user's own prescriptions
 *   role:pharmacist  - queue changes
 *   role:admin       - dashboard changes
 * The server only pushes "something changed" events; clients refetch through the
 * REST API, so authorization rules live in one place.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    if (role === ROLES.PHARMACIST || role === ROLES.ADMIN) socket.join(`role:${role}`);
  });

  return io;
}

function emitPrescriptionUpdated(prescription, extra = {}) {
  if (!io) return;
  const payload = {
    id: prescription._id.toString(),
    status: prescription.status,
    ...extra,
  };
  io.to(`user:${prescription.customer.toString()}`)
    .to(`role:${ROLES.PHARMACIST}`)
    .to(`role:${ROLES.ADMIN}`)
    .emit('prescription:updated', payload);
}

function closeSocket() {
  if (io) {
    io.close();
    io = null;
  }
}

module.exports = { initSocket, emitPrescriptionUpdated, closeSocket };
