# Personalized Tutor System

The application is developed using a modern full-stack architecture. The frontend is built using **React.js**, while the backend is developed using **Node.js with Express.js** to provide high-performance RESTful APIs.

The platform implements a custom authentication system where users register using their **Full Name, Username, Email Address, Password, and Profile Picture**. Passwords are securely encrypted using **bcrypt**, and authentication is handled using **JWT (JSON Web Tokens)**.

Application data is stored in an **SQLite** database, providing a lightweight, efficient, and portable storage solution.

Artificial Intelligence capabilities are powered by the **Google Gemini 1.5 Flash API**, which provides personalized learning recommendations, adaptive quizzes, intelligent tutoring, study plan generation, content summarization, and real-time doubt clarification through an AI chatbot.

The complete application is containerized using **Docker**, enabling consistent development, testing, deployment, and scalability across different environments.

As students continue learning, the AI continuously evaluates their progress, identifies learning gaps, and dynamically updates personalized learning paths to improve knowledge retention and academic performance.

---

## Student Module

- Student Registration
- Profile Picture Upload
- Full Name
- Username
- Email Registration
- Password
- JWT Secure Login
- Subject Selection
- Diagnostic Assessment
- Personalized Dashboard
- AI Study Recommendations
- Notes & Video Learning
- Adaptive Quizzes
- Assignment Submission
- AI Tutor Chatbot (Google Gemini 1.5 Flash)
- Progress Analytics
- Study Reminder Notifications
- Learning History
- Personalized Revision Schedule

---

## System Architecture

```
                     +-----------------------+
                     |      React.js UI      |
                     +-----------+-----------+
                                 |
                         REST API (HTTPS)
                                 |
                   +-------------+--------------+
                   |      Node.js (Express)     |
                   +-------------+--------------+
                                 |
      +-------------+------------+------------+-------------+
      |             |                         |             |
      |             |                         |             |
 SQLite DB     Gemini 1.5 Flash API     File Upload     JWT Auth
      |             |                         |             |
      +-------------+------------+------------+-------------+
                                 |
                     Adaptive Quiz Engine
                                 |
               Personalized Recommendation Engine
                                 |
                    Progress Analytics Dashboard
                                 |
                        Docker Container
```

---

## Technology Stack

| Layer            | Technology                            |
| ---------------- | ------------------------------------- |
| Frontend         | React.js                              |
| Backend          | Node.js (Express.js)                  |
| Database         | SQLite                                |
| Authentication   | JWT + bcrypt                          |
| AI Model         | Google Gemini 1.5 Flash API           |
| Charts           | Chart.js / Recharts                   |
| State Management | React Context API                     |
| File Upload      | Multer                                |
| Containerization | Docker                                |
| API Testing      | Postman                               |
| Hosting          | Docker / Render / Railway / AWS / VPS |

---

## Users

- user_id
- full_name
- username
- email
- password_hash
- profile_image
- role
- created_at

---

## User Registration

Users create an account by providing:

- Full Name
- Username
- Email Address
- Password
- Profile Picture

The Node.js backend validates all input fields and securely hashes the user's password using **bcrypt** before storing it in the SQLite database.

Profile images are uploaded using **Multer** and stored locally or in cloud storage.

After successful login, the server generates a **JSON Web Token (JWT)** that authenticates subsequent API requests.

The authentication system includes:

- Email Registration
- Secure Login
- JWT Authentication
- Password Encryption
- Profile Management
- Protected API Routes
- Logout

---

## Google Gemini 1.5 Flash AI Engine

Google Gemini 1.5 Flash provides the intelligent functionality of the Personalized Tutor System.

Its responsibilities include:

- Analyze student performance
- Identify weak concepts
- Recommend personalized study materials
- Generate adaptive quizzes
- Answer academic questions
- Explain complex concepts
- Summarize chapters
- Generate revision notes
- Suggest personalized study plans
- Recommend revision schedules
- Provide instant doubt clarification
- Monitor learning progress
- Generate intelligent feedback

---

## Keywords

- Personalized Learning
- Artificial Intelligence
- Machine Learning
- Adaptive Learning
- Google Gemini 1.5 Flash
- AI Tutor
- Node.js
- Express.js
- React.js
- SQLite
- JWT Authentication
- Docker

---

# Docker Deployment

The Personalized Tutor System is fully containerized using Docker, ensuring portability, consistency, and simplified deployment across development, testing, and production environments.

## Docker Components

- React.js Frontend Container
- Node.js Express Backend Container
- SQLite Persistent Volume
- Docker Network
- Docker Compose

## Benefits

- Easy Deployment
- Cross-platform Compatibility
- Environment Isolation
- Scalable Infrastructure
- Simplified Dependency Management
- Continuous Integration Support
- Production-ready Deployment

## Deployment Workflow

Developer
     │
     ▼
Docker Build
     │
     ▼
Docker Image
     │
     ▼
Docker Compose
     │
     ▼
Frontend Container (React)
Backend Container (Express)
SQLite Database
Gemini API Integration

---

## Conclusion

The Personalized Tutor System combines modern web technologies with Artificial Intelligence to deliver an adaptive and personalized learning experience.

The platform is built using **React.js** for the frontend, **Node.js with Express.js** for the backend, **SQLite** as the database, **JWT** for secure authentication, and **Google Gemini 1.5 Flash API** for AI-powered tutoring and intelligent recommendations. User authentication is implemented through a custom email-based system supporting profile image uploads, secure password hashing, and token-based authorization.

The entire application is containerized using **Docker**, providing a scalable, portable, and production-ready deployment architecture. The AI engine continuously evaluates student performance, generates adaptive quizzes, recommends personalized learning resources, and offers real-time tutoring assistance. This intelligent, data-driven approach enhances learning efficiency, improves academic performance, and equips educators with actionable insights to effectively support student development.
