# 🗳️ Team Polls – Real-Time Voting System

---

## 🚀 Features

| ID  | Feature                                                                 |
|-----|-------------------------------------------------------------------------|
| F1  | REST & WebSocket APIs using **Express** and **Socket.IO**              |
| F2  | `POST /poll` – Create polls with question, options[], and expiresAt    |
| F3  | `POST /poll/:id/vote` – Vote on polls (JWT-authenticated + idempotent) |
| F4  | `GET /poll/:id` – Fetch current tally and poll metadata                |
| F5  | WebSocket `poll/:id` – Broadcast live updates to subscribers           |
| F6  | `POST /auth/anon` – Returns anonymous short-lived JWT token            |
| F7  | Rate-limited to **5 votes/sec per user**, burst-safe via Redis         |
| F8  | Polls auto-close at `expiresAt`; final tally remains queryable         |

---

## 📦 Tech Stack

- **Backend:** Node.js, Express, WebSocket (Socket.IO)  
- **Database:** MySQL with raw queries + schema migrations  
- **Cache/Rate Limiting:** Redis  
- **Authentication:** JWT (anonymous token issuance)  
- **Observability:** Prometheus metrics, request logging, error tracking  
- **Frontend (Bonus):** React + Vite (real-time poll results UI)  
- **Testing:** Jest + Supertest (80%+ coverage)  
- **CI/CD:** GitHub Actions  
- **Security:** Helmet, OWASP headers, ENV-based secrets  

---

## 🐳 Getting Started (Docker-First)

> ⚠️ Prerequisites: Docker and Docker Compose installed.

```bash
# Clone the repo
git clone https://github.com/yourusername/team-polls
cd team-polls

# Build and run everything
docker-compose up --build
curl -X POST http://localhost:3000/init ---This sets up the necessary database schema.


📲 API Overview
🛂 Auth
    POST /auth/anon
        Returns a short-lived JWT token for anonymous access. Use this token in headers:Authorization: Bearer <token>


📋 Create Poll
    POST /poll
        Content-Type: application/json

        {
        "question": "What's your favorite programming language?",
        "options": ["JavaScript", "Python", "Go"],
        "expiresAt": "2025-05-20T15:00:00Z"
        }

🗳️ Vote on Poll        
    POST /poll/:id/vote
    Authorization: Bearer <token>
    Content-Type: application/json

    {
    "optionId": 2
    }
    Votes are idempotent per user per poll.

📊 Get Poll Data
    GET /poll/:id

🔌 WebSocket (Live Results)
    Connect to:ws://localhost:3000/poll/:id
    You’ll receive real-time tally updates as votes come in.


🔐 Security Highlights
    All secrets managed via .env and docker-compose.override.yml
    HTTP headers hardened via helmet
    Voting restricted to one vote per user per poll

🧑‍💻 Developer Notes
    Each client receives a unique JWT (anonymous).
    Voting is blocked after expiresAt.    

🌐 Testing Multiple Tabs
    To simulate live voting:
    Start the app: docker-compose up
    Open 3 browser windows (or Incognito tabs).
    Visit the frontend (or use curl/Postman).
    Connect to the same poll via WebSocket.
    Watch live vote tally updates across all tabs.    
