// Stand-in for socket.io-client in tests: records handlers, never opens a connection.
export const sockets = [];

export function io(url, options) {
  const handlers = {};
  const socket = {
    url,
    options,
    on: (event, fn) => {
      handlers[event] = fn;
      return socket;
    },
    emitFromServer: (event, payload) => handlers[event] && handlers[event](payload),
    connect: () => socket,
    disconnect: () => socket,
    removeAllListeners: () => socket,
  };
  sockets.push(socket);
  return socket;
}
