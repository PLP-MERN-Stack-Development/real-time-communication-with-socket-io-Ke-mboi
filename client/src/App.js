import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const username = 'User' + Math.floor(Math.random() * 1000);
const socket = io('http://localhost:4000', { query: { username } });

function App() {
  const [rooms, setRooms] = useState(['global', 'room1', 'room2']);
  const [currentRoom, setCurrentRoom] = useState('global');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission !== 'granted') Notification.requestPermission();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateMessages]);

  // Socket listeners
  useEffect(() => {
    // Room messages
    socket.on('room:message', (msg) => {
      if (msg.room === currentRoom) setMessages(prev => [...prev, msg]);
      notify(msg.from, msg.text);
    });

    // File messages
    socket.on('room:file', (msg) => {
      if (msg.room === currentRoom) setMessages(prev => [...prev, msg]);
      notify(msg.from, msg.fileName);
    });

    // Private messages
    socket.on('private:message', (msg) => {
      setPrivateMessages(prev => [...prev, msg]);
      if (msg.from !== username) notify(msg.from, msg.text || msg.fileName);
    });

    // Online users
    socket.on('presence:update', (users) => setOnlineUsers(users.filter(u => u !== username)));

    // Typing indicators
    socket.on('room:typing', ({ username: user, typing }) => {
      setTypingUsers(prev => {
        if (typing) return [...new Set([...prev, user])];
        else return prev.filter(u => u !== user);
      });
    });

    // Room history
    socket.on('room:history', ({ room, messages }) => {
      if (room === currentRoom) setMessages(messages);
    });

    // Message updates (reactions, read)
    socket.on('room:update', (msgs) => setMessages(msgs.filter(m => m.room === currentRoom)));

    // Notifications
    socket.on('notification', ({ type, username: u }) => {
      setMessages(prev => [...prev, { from: 'System', text: `${u} has ${type}ed the room.`, room: currentRoom }]);
    });

    return () => {
      socket.off('room:message');
      socket.off('room:file');
      socket.off('private:message');
      socket.off('presence:update');
      socket.off('room:typing');
      socket.off('room:history');
      socket.off('room:update');
      socket.off('notification');
    };
  }, [currentRoom]);

  // Browser notification + sound
  const notify = (from, message) => {
    if (Notification.permission === 'granted') new Notification(`${from}:`, { body: message });
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
  };

  // Send message
  const sendMessage = () => {
    if (!text.trim()) return;
    if (privateChatUser) {
      socket.emit('private:message', { toUsername: privateChatUser, text });
      setPrivateMessages(prev => [...prev, { from: username, text, room: null }]);
    } else {
      socket.emit('room:message', { room: currentRoom, text });
    }
    setText('');
    socket.emit('room:typing', { room: currentRoom, typing: false });
  };

  // Typing indicator
  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit('room:typing', { room: currentRoom, typing: e.target.value.length > 0 });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('room:typing', { room: currentRoom, typing: false });
    }, 1000);
  };

  // File upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (privateChatUser) {
        socket.emit('private:message', { toUsername: privateChatUser, fileName: file.name, fileData: reader.result });
      } else {
        socket.emit('room:file', { room: currentRoom, fileName: file.name, fileData: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Switch room
  const switchRoom = (room) => {
    setCurrentRoom(room);
    setPrivateChatUser(null);
    setMessages([]);
    socket.emit('room:join', { room });
  };

  // Reactions
  const reactToMessage = (messageId, reaction) => {
    socket.emit('room:reaction', { room: currentRoom, messageId, reaction });
  };

  // Mark messages as read
  useEffect(() => {
    socket.emit('room:read', { room: currentRoom });
  }, [messages, currentRoom]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Real-Time Chat</h2>

      {/* Rooms */}
      <div>
        <strong>Rooms:</strong>
        {rooms.map(room => {
          const unreadCount = messages.filter(m => !m.readBy?.includes(username)).length;
          return (
            <button
              key={room}
              onClick={() => switchRoom(room)}
              style={{ marginRight: '5px', backgroundColor: room === currentRoom ? '#ccc' : '#fff' }}
            >
              {room} {unreadCount > 0 && `(${unreadCount})`}
            </button>
          );
        })}
      </div>

      {/* Online users */}
      <div style={{ margin: '10px 0' }}>
        <strong>Online Users:</strong>
        <ul>
          {onlineUsers.map(u => (
            <li key={u}>
              {u} <button onClick={() => { setPrivateChatUser(u); setPrivateMessages([]); }}>Chat privately</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Messages */}
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll', marginBottom: '10px' }}>
        {(privateChatUser ? privateMessages : messages).map((m, idx) => (
          <div key={idx}>
            <b>{m.from}:</b> {m.text}
            {m.fileData && (
              m.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <div><img src={m.fileData} alt={m.fileName} style={{ maxWidth: '200px', marginTop: '5px' }} /></div>
              ) : (
                <div><a href={m.fileData} download={m.fileName}>{m.fileName}</a></div>
              )
            )}
            {m.reactions && Object.entries(m.reactions).map(([r, users]) => (
              <span key={r} style={{ marginLeft: '5px' }}>{r} ({users.length})</span>
            ))}
            {m.readBy && <span style={{ fontSize: '0.7em', color: 'gray' }}> (Read by: {m.readBy.join(', ')})</span>}
            {/* Reaction buttons */}
            {!privateChatUser && m.id && (
              <div>
                {['👍', '❤️', '😂'].map(r => (
                  <button key={r} onClick={() => reactToMessage(m.id, r)}>{r}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && <p>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</p>}

      {/* Input and file */}
      <input
        value={text}
        onChange={handleTyping}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type a message..."
        style={{ width: '60%', padding: '5px', marginRight: '5px' }}
      />
      <button onClick={sendMessage}>Send</button>
      <input type="file" onChange={handleFileUpload} style={{ marginLeft: '10px' }} />
    </div>
  );
}

export default App;
