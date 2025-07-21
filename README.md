# 📝 ToDo List Backend API

A secure, scalable, and fully-tested RESTful backend API for a ToDo List application. Built with Node.js, Express, PostgreSQL (via Supabase), Redis (via Upstash), and Docker, this backend supports JWT authentication, file uploads, pagination, email notifications, and role-based access control.

---

## 🚀 Features

* 🔐 **Authentication & Authorization**

  * JWT-based login/signup system
  * Role-based access: `user` and `admin`
  * Email confirmation after signup

* 🧾 **Task Management**

  * Create/update/delete tasks with optional image/audio upload
  * Paginated task fetching with cursor-based pagination
  * Admin can fetch or delete any user’s tasks

* 🧑‍💼 **User Management**

  * Users can update their profile (name/email/password)
  * Admins can fetch, update, or delete any user

* 💬 **Email Notifications** via [Resend](https://resend.com/):

  * Confirmation email on signup
  * Email change notification
  * Password change notification

* ⚡ **Optimizations**

  * Redis caching (Upstash) for paginated endpoints
  * PostgreSQL indexing on commonly queried columns

* 📂 **File Upload Support**

  * Images and voice notes uploaded using Supabase Storage

* 🧪 **Testing**

  * Full Jest + Supertest coverage for all major endpoints

* 🐳 **Dockerized**

  * Ready to deploy using Docker on services like Render

---

## 📁 Project Structure
```
ToDoList/
├── app.js
├── server.js
├── Dockerfile
├── jest.config.js
├── package.json
├── package-lock.json
├── config/
│   └── db.js
├── controllers/
│   ├── taskController.js
│   └── userController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── uploadMiddleware.js
├── routes/
│   ├── taskRouter.js
│   └── userRoutes.js
├── tests/
│   ├── task.test.js
│   ├── user.test.js
│   ├── test_assets
├── utils/
│   ├── generateToken.js
│   ├── logger.js
│   ├── notify.js
│   ├── queryBuilders.js
│   ├── redisClient.js
│   ├── sendEmail.js
│   ├── supabaseClient.js
│   └── uploadToSupabase.js
```


---

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/tesla77coded/ToDoList.git
cd ToDoList
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file based on `.env.example` and fill in the required values:

```
PORT=8080
DATABASE_URL=your_postgres_connection_url
REDIS_URL=your_upstash_redis_url
RESEND_API_KEY=your_resend_key
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role
```

### 4. Run locally

```bash
npm run dev
```

### 5. Run tests

```bash
npm test
```

---

## 📤 Deployment (via Docker + Render)

### 1. Build Docker image locally

```bash
docker build -t todolist-backend .
```

### 2. Run the Docker container

```bash
docker run -p 8080:8080 todolist-backend
```

### 3. Deploy to Render

* Push to GitHub
* Create a new Web Service on [Render](https://render.com/)
* Use Docker as the environment
* Set up environment variables in the Render dashboard

Live API (example): [https://todolist-backend-7j07.onrender.com](https://todolist-backend-7j07.onrender.com)

---

## 📬 API Endpoints

### 🧑 User Routes

| Method | Endpoint                              | Description                     |
|--------|---------------------------------------|---------------------------------|
| POST   | `/api/v1/users/`                      | Register a new user             |
| POST   | `/api/v1/users/login`                 | Log in a user                   |
| GET    | `/api/v1/users/confirm-email`         | Confirm user email              |
| POST   | `/api/v1/users/forgot-password`       | Send password reset email       |
| POST   | `/api/v1/users/reset-password`        | Reset password                  |
| GET    | `/api/v1/users/user-notifications`    | Get user notifications (auth)   |
| PUT    | `/api/v1/users/update-profile`        | Update user profile (auth)      |
| GET    | `/api/v1/users/profile`               | Get user profile (auth)         |
| GET    | `/api/v1/users/allUserProfiles`       | Get all users (admin only)      |
| PUT    | `/api/v1/users/:id`                   | Update user by admin            |
| DELETE | `/api/v1/users/:id`                   | Delete user by admin            |

### ✅ Task Routes

| Method | Endpoint                                | Description                         |
|--------|-----------------------------------------|-------------------------------------|
| POST   | `/api/v1/tasks/create-task`             | Create a task (with optional media) |
| GET    | `/api/v1/tasks/`                        | Get tasks by user (paginated)       |
| GET    | `/api/v1/tasks/search`                  | Search tasks by user                |
| PUT    | `/api/v1/tasks/:id`                     | Update task by user                 |
| DELETE | `/api/v1/tasks/:id`                     | Delete task by user                 |
| GET    | `/api/v1/tasks/admin/getalltasks`       | Get all tasks (admin, paginated)    |
| DELETE | `/api/v1/tasks/admin/delete-task/:id`   | Delete any task (admin only)        |


---

## 🙌 Acknowledgements

* [Supabase](https://supabase.com/) - PostgreSQL DB + Storage
* [Upstash](https://upstash.com/) - Redis Caching
* [Resend](https://resend.com/) - Email Delivery
* [Render](https://render.com/) - Hosting

---

## 👨‍💻 Author

**Jaydeep Kadam**
GitHub: [@tesla77coded](https://github.com/tesla77coded)

If you like this project, feel free to ⭐ the repo and share your feedback!
