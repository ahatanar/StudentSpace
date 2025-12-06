# StudentSpace

A full-stack web application for university club management, event coordination, and campus schedule visualization. Built with **Next.js** (React) frontend and **FastAPI** (Python) backend, with **Docker** containerization.

## Teammates

- **Zain Syed** - 100830989
- **G. Anthony Gutierrez Ricard** - 100815169
- **Taha Rana** - 100831067

## Live Deployment

The application is deployed on Render:

- **Frontend**: https://studentspace-frontend.onrender.com

## Features

### User Management
- Firebase Authentication with JWT tokens
- Role-based access control (Admin, President, Executive, Member)
- Google Calendar OAuth 2.0 integration

### Club Management
- Create, update, and delete clubs
- Club approval workflow (pending → active → suspended)
- Member management with role assignment
- Club search and filtering by type

### Event Management
- Create and manage club events
- Full calendar view with FullCalendar integration
- Automatic Google Calendar sync for members
- Event filtering by date range and club

### Campus Heatmap
- Visualize campus schedule occupancy
- Time slot analysis for optimal event scheduling
- Premium feature for club executives

### Admin Dashboard
- Club approval/rejection workflow
- Platform-wide user management
- Club deletion and suspension controls

---

## Architecture

StudentSpace follows a **layered monolithic architecture** with clear separation of concerns:

```
+------------------------------------------------------------------+
|                         PRESENTATION LAYER                        |
|  +--------------------------------------------------------------+ |
|  |                    Next.js Frontend                          | |
|  |  +----------+  +----------+  +----------+  +--------------+  | |
|  |  |  Pages   |  |Components|  |   Lib    |  | AuthProvider |  | |
|  |  |  (App    |  |  (UI     |  |  (API    |  |  (Firebase   |  | |
|  |  |  Router) |  |  Parts)  |  |  Client) |  |   Context)   |  | |
|  |  +----------+  +----------+  +----------+  +--------------+  | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
                              | HTTPS
                              v
+------------------------------------------------------------------+
|                         APPLICATION LAYER                         |
|  +--------------------------------------------------------------+ |
|  |                    FastAPI Backend                           | |
|  |  +----------+  +----------+  +----------+  +--------------+  | |
|  |  |  api.py  |  | services |  |  models  |  |   calendar   |  | |
|  |  | (Routes  |  |   .py    |  |   .py    |  |   _service   |  | |
|  |  |  Layer)  |  | (Logic)  |  | (Schema) |  |     .py      |  | |
|  |  +----------+  +----------+  +----------+  +--------------+  | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                           DATA LAYER                              |
|  +------------------------+    +-----------------------------+   |
|  |   Firebase Firestore   |    |     Firebase Auth           |   |
|  |   (NoSQL Database)     |    |   (User Authentication)     |   |
|  +------------------------+    +-----------------------------+   |
+------------------------------------------------------------------+
```

---

### External API Integration

**Google Calendar API** is integrated for:
- OAuth 2.0 authentication flow
- Pushing club events to members' calendars
- Syncing event updates and deletions

---

## Authentication & Security

### Implementation

1. **Firebase Authentication**: Handles user registration, login, and session management
2. **JWT Token Verification**: Backend validates Firebase ID tokens on protected routes
3. **Role-Based Access Control (RBAC)**:
   - **Admin**: Platform management, club approval
   - **President**: Club management, executive assignment
   - **Executive**: Event creation, club editing
   - **Member**: View and join clubs, sync calendar


## Getting Started

#### 1. Clone the Repository
```bash
git clone https://github.com/ahatanar/StudentSpace.git
cd StudentSpace
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Firebase and Google Calendar credentials

# Add Firebase service account key
# Download from Firebase Console > Project Settings > Service Accounts
# Save as backend/serviceAccountKey.json

# Run development server
uvicorn api:app --reload --port 8000
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Firebase config

# Run development server
npm run dev
```

#### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

### Docker Deployment

#### Build and Run with Docker Compose
```bash
# From project root
docker-compose up --build

# Run
docker-compose up

# Stop services
docker-compose down
```