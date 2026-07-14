# Ledgzo Enterprise - Attendance & Leave Management System

This repository contains the complete Ledgzo Enterprise communications, attendance, and leave management system.

## 🚀 Features
- **Real-Time Communications**: Audio/Video calls using WebRTC and Chat via Socket.io.
- **Attendance Management**: Check-in/out, live status (Online, Away, Busy), working hours, break tracking.
- **Leave Management**: Apply for leaves, admin approval workflow, leave balance tracking.
- **Admin Dashboard**: Real-time workforce grid, analytics, reports, and system settings.
- **Employee Dashboard**: Self-service portal for attendance and leaves.

## 🛠 Tech Stack
- **Frontend**: React.js, Redux Toolkit, Tailwind CSS, Framer Motion, Socket.io-client.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io.
- **Auth**: JWT Authentication.

## 📦 Deployment Setup (Docker)

The project is configured for easy deployment using Docker and Docker Compose.

1. Create a `.env` file in the `./backend` directory based on your configuration:
   ```env
   PORT=5000
   MONGODB_URI=your_mongo_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   ```

2. Build and run the containers from the root directory:
   ```bash
   docker-compose up --build -d
   ```

3. The Frontend will be available at `http://localhost:80` and the Backend API at `http://localhost:5000`.

## 🔒 Security Measures Implemented
- JWT-based authentication on all API routes.
- Role-based middleware (`protect`, `admin`) to ensure only admins can access sensitive routes.
- XSS prevention (React automatically escapes rendered strings).
- Socket connections authenticate using JWT tokens.

## 🧪 Testing
- **Integration Testing**: All UI flows (Admin + Employee) have been connected to their respective Redux slices and socket events.
- To run tests manually, boot up the frontend (`npm run dev`) and backend (`node server.js` or `npm run dev`) locally and simulate Admin/Employee sessions in different browser tabs.
