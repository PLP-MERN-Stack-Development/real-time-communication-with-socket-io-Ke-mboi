Real-Time Chat Application with Socket.io
📌 Overview

This project is a real-time chat application built with Node.js, Express, Socket.io, and React. It demonstrates bidirectional communication between clients and server, supporting live messaging, notifications, typing indicators, online/offline users, reactions, private messaging, and read receipts.

The app also implements advanced features such as message pagination, message search, file sharing, and reconnection handling, providing a smooth and responsive user experience across devices.

🛠️ Technologies Used

Backend: Node.js, Express, Socket.io

Frontend: React, Socket.io-client

Notifications: Browser notifications + sound alerts

Version Control: Git & GitHub

⚙️ Setup Instructions
1. Clone the Repository
git clone <your-repo-url>
cd real-time-communication-with-socket-io-Ke-mboi

2. Server Setup
cd server
npm install
npm run start   # Runs the server on port 4000

3. Client Setup
cd client
npm install
npm start       # Runs the React app on port 3000

4. Open the App

Open your browser at http://localhost:3000

Open multiple tabs or browsers to test real-time communication

📝 Features Implemented
Core Chat Features

Global chat room with live messaging

Typing indicators for active users

Online/offline user status

Messages display sender and timestamp

Advanced Features

Multiple chat rooms (Global, Room 1, Room 2)

Private messaging between users

File sharing (send text or files)

Reactions to messages (like 👍, ❤️, 😂)

Read receipts showing which users have read each message

Real-Time Notifications

Browser notifications for join/leave events

Sound notifications for new messages

Performance & UX

Message pagination for loading older messages

Message search by text content

Automatic reconnection handling

Message delivery acknowledgment

📸 Screenshots / Demo

(Optional: Add screenshots or GIFs of the app here)

📂 Folder Structure
root/
│
├─ server/         # Node.js + Socket.io server
│   └─ server.js
│
├─ client/         # React frontend
│   └─ src/
│       └─ App.js
│
├─ README.md

🚀 Submission Notes

The project meets the GitHub Classroom assignment requirements

Fully functional real-time chat app with bidirectional communication

Supports at least 3 advanced features: reactions, private messaging, file sharing

Responsive and works on desktop and mobile devices
