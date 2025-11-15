const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Users and rooms storage
const users = new Map(); // socketId -> { username, room }
const rooms = new Map(); // room -> { messages: [], members: Set() }

// Helper: update online users to all clients
function updateOnlineUsers() {
  const onlineUsernames = Array.from(users.values()).map(u => u.username);
  io.emit('presence:update', onlineUsernames);
}

io.on('connection', (socket) => {
  const username = socket.handshake.query.username || 'Anonymous';
  users.set(socket.id, { username, room: 'global' });

  // Join default room
  socket.join('global');
  if (!rooms.has('global')) rooms.set('global', { messages: [], members: new Set() });
  rooms.get('global').members.add(username);

  // Initial online users
  updateOnlineUsers();
  io.to('global').emit('notification', { type: 'join', username });

  // Join room
  socket.on('room:join', ({ room }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const prevRoom = u.room;
    socket.leave(prevRoom);
    u.room = room;
    socket.join(room);

    if (!rooms.has(room)) rooms.set(room, { messages: [], members: new Set() });
    rooms.get(room).members.add(u.username);

    socket.emit('room:history', { room, messages: rooms.get(room).messages });
    io.to(room).emit('notification', { type: 'join', username: u.username });

    updateOnlineUsers();
  });

  // Room text messages
  socket.on('room:message', ({ room, text }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const msg = {
      id: Math.random().toString(36).slice(2, 9),
      from: u.username,
      text,
      room,
      timestamp: new Date().toISOString(),
      readBy: [u.username]
    };
    if (!rooms.has(room)) rooms.set(room, { messages: [], members: new Set() });
    rooms.get(room).messages.push(msg);
    io.to(room).emit('room:message', msg);
  });

  // Room file messages
  socket.on('room:file', ({ room, fileName, fileData }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const msg = {
      id: Math.random().toString(36).slice(2, 9),
      from: u.username,
      fileName,
      fileData,
      room,
      timestamp: new Date().toISOString(),
      readBy: [u.username]
    };
    if (!rooms.has(room)) rooms.set(room, { messages: [], members: new Set() });
    rooms.get(room).messages.push(msg);
    io.to(room).emit('room:file', msg);
  });

  // Typing indicator
  socket.on('room:typing', ({ room, typing }) => {
    const u = users.get(socket.id);
    if (!u) return;
    socket.to(room).emit('room:typing', { username: u.username, typing });
  });

  // Reactions
  socket.on('room:reaction', ({ room, messageId, reaction }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const roomData = rooms.get(room);
    if (!roomData) return;
    const msg = roomData.messages.find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
    if (!msg.reactions[reaction].includes(u.username)) msg.reactions[reaction].push(u.username);
    io.to(room).emit('room:update', roomData.messages);
  });

  // Read receipts
  socket.on('room:read', ({ room }) => {
    const u = users.get(socket.id);
    if (!u || !rooms.has(room)) return;
    rooms.get(room).messages.forEach(msg => {
      if (!msg.readBy.includes(u.username)) msg.readBy.push(u.username);
    });
    io.to(room).emit('room:update', rooms.get(room).messages);
  });

  // Private messages
  socket.on('private:message', ({ toUsername, text, fileName, fileData }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const targetSocketId = Array.from(users.entries()).find(([id, user]) => user.username === toUsername)?.[0];
    if (!targetSocketId) return;

    const msg = {
      id: Math.random().toString(36).slice(2, 9),
      from: u.username,
      text: text || null,
      fileName: fileName || null,
      fileData: fileData || null,
      room: null,
      timestamp: new Date().toISOString()
    };

    io.to(targetSocketId).emit('private:message', msg);
    socket.emit('private:message', msg);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const u = users.get(socket.id);
    if (!u) return;
    io.to(u.room).emit('notification', { type: 'leave', username: u.username });
    users.delete(socket.id);
    updateOnlineUsers();
  });
});

server.listen(4000, () => console.log('Server running on port 4000'));
