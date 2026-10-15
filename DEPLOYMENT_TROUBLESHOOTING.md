# Render Deployment Troubleshooting & Architecture Reference

**Project:** Enterprise Delegation of Authority (DOA) Governance Workflow Platform  
**Live Frontend:** `https://doa-frontend.onrender.com`  
**Live Backend API:** `https://doa-backend-y5mq.onrender.com`  
**API Documentation (Swagger):** `https://doa-backend-y5mq.onrender.com/docs`  

---

## 1. Overview of Deployed Architecture

The project is deployed on Render as two decoupled cloud services:

```text
┌───────────────────────────────────────┐
│        DOA-Frontend (Render)          │
│   Type: Static Site (React 19 + Vite) │
│   URL: https://doa-frontend.onrender.com
└──────────────────┬────────────────────┘
                   │
                   │ HTTPS API Requests (Bearer Token / JSON)
                   ▼
┌───────────────────────────────────────┐
│         DOA-Backend (Render)          │
│   Type: Web Service (FastAPI + Python)│
│   URL: https://doa-backend-y5mq.onrender.com
│   Database: SQLite (Auto-Seeded)      │
└───────────────────────────────────────┘
```

---

## 2. Comprehensive List of Issues Faced & How They Were Resolved

### Issue 1: Monorepo Root Directory Misconfiguration
* **Symptom:** Build failed immediately with:
  ```text
  ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
  ```
* **Root Cause:** Render defaults its build directory to the repository root (`./`). In this repository, the files are organized into subdirectories (`backend/` and `frontend/`). Render looked for `requirements.txt` at the root where it didn't exist.
* **Fix Applied:** In Render Web Service settings, set **Root Directory** to `backend`.

---

### Issue 2: Incompatible Start Command Template
* **Symptom:** Render pre-filled a default WSGI template:
  ```bash
  gunicorn your_application.wsgi
  ```
* **Root Cause:** FastAPI is a modern asynchronous ASGI framework (not a legacy synchronous WSGI framework like Django/Flask).
* **Fix Applied:** Changed the Start Command to:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
  * `0.0.0.0`: Required so Render's cloud router can forward public requests into the container.
  * `$PORT`: Binds to Render's dynamically assigned external port.

---

### Issue 3: Single Page Application (SPA) Routing 404 ("Not Found" on direct URL / Refresh)
* **Symptom:** Directly navigating to `https://doa-frontend.onrender.com/login` or refreshing the page displayed plain text `Not Found`.
* **Root Cause:** React Router handles routing on the client side inside the browser. When a user requests `/login` directly from the server, Render looks for a physical file named `/login` or `/login.html` in the build output (`dist/`). Since only `index.html` exists, the web server returns a 404 Not Found.
* **Fix Applied:** Configured Render Static Site **Redirects/Rewrites**:
  * **Source:** `/*`
  * **Destination:** `/index.html`
  * **Action:** `Rewrite`
  This instructs the web server to always serve `index.html` for any subpath, allowing React Router to render the appropriate view.

---

### Issue 4: Empty SQLite Database on Container Spin-up (401 Unauthorized)
* **Symptom:** Attempting to log in with test personas (e.g., `user@doa.local` or `dept.owner@doa.local`) returned:
  ```json
  401 {"detail": "Incorrect email or password"}
  ```
* **Root Cause:** When Render initializes a new container, it creates a fresh, empty SQLite database (`doa.db`). Because database seeding (`seed.py`) had not run inside the runtime environment, the `users` and `doa_records` tables contained zero records.
* **Fix Applied:** Implemented resilient **Startup Auto-Seeding** in `backend/app/main.py`:
  ```python
  # Auto-seed if database is empty (ensures test users and DOA records exist on deployment)
  try:
      from app.database.database import SessionLocal
      from app.database.models import User
      from app.seed import seed_database
      with SessionLocal() as db:
          if not db.query(User).first():
              print("Database has no users. Auto-seeding initial data...")
              seed_database()
  except Exception as e:
      print(f"Startup seed check warning: {e}")
  ```

---

### Issue 5: Cross-Origin Resource Sharing (CORS) Block ("Failed to fetch")
* **Symptom:** Clicking any persona login card resulted in a red error:
  ```text
  Failed to fetch
  ```
  The browser console showed that the preflight `OPTIONS` request returned HTTP 400 with no `Access-Control-Allow-Origin` header.
* **Root Cause:** The backend's `CORS_ORIGINS` setting only allowed `localhost` ports (`5173`, `3000`). Requests originating from the cloud frontend domain (`https://doa-frontend.onrender.com`) were rejected by the browser security sandbox.
* **Fix Applied:** 
  1. Updated `backend/app/main.py` with dynamic regex pattern matching for Render subdomains:
     ```python
     app.add_middleware(
         CORSMiddleware,
         allow_origins=settings.cors_origins_list,
         allow_origin_regex=r"https://.*\.onrender\.com",
         allow_credentials=True,
         allow_methods=["*"],
         allow_headers=["*"],
     )
     ```
  2. Updated default origins in `backend/app/core/config.py` to explicitly include `https://doa-frontend.onrender.com`.

---

### Issue 6: Git Branch Name Case-Sensitivity Discrepancy
* **Symptom:** Fixes pushed to GitHub were not being reflected on Render, and manual deployments continued using the old commit (`f8cda8b`).
* **Root Cause:** Git branch names on Linux/GitHub are case-sensitive. The repository had two separate branches:
  * `UserRouting` (Uppercase 'U') — where local changes were originally committed.
  * `userRouting` (Lowercase 'u') — the actual branch Render was connected to and tracking.
* **Fix Applied:** Synchronized and pushed the latest commits to both branches simultaneously:
  ```powershell
  git push origin UserRouting:userRouting
  ```

---

### Issue 7: Full Endpoint Path Accidental Inclusion in `VITE_API_URL`
* **Symptom:** After resolving CORS, the login card displayed:
  ```text
  Not Found
  ```
* **Root Cause:** The environment variable `VITE_API_URL` was configured with a specific endpoint path:
  `https://doa-backend-y5mq.onrender.com/api/auth/login`
  When the frontend client made calls like `request('/auth/login')`, the combined URL became:
  `https://doa-backend-y5mq.onrender.com/api/auth/login/auth/login` (HTTP 404).
* **Fix Applied:** Hardened `frontend/src/services/api.js` to automatically sanitize and normalize the base URL:
  ```javascript
  let rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim().replace(/\/+$/, '');
  if (rawBase.includes('/api')) {
    rawBase = rawBase.substring(0, rawBase.indexOf('/api') + 4);
  } else {
    rawBase += '/api';
  }
  const BASE_URL = rawBase;
  ```
  This guarantees that regardless of trailing slashes or subpaths entered in environment variables, the base URL reliably resolves to `.../api`.

---

## 3. Cloud Lifecycle & "15-Minute Rule" Clarification

| Question | Explanation |
| :--- | :--- |
| **Do I need to leave my local computer on?** | **No.** The application is running in the cloud on Render's data centers. You can turn off your computer and close all local terminals. |
| **What does the 15-minute limit mean?** | It is an **idle inactivity timer**, NOT a runtime limit. As long as users are sending requests, the backend runs indefinitely. If no requests are received for 15 consecutive minutes, the free-tier backend spins down to sleep. |
| **What happens when someone visits after it sleeps?** | Render detects the incoming request and automatically wakes up the container (Cold Start). The first request takes **30–45 seconds**, after which all subsequent requests respond immediately. |
| **Does the Frontend sleep?** | **No.** The Frontend is a Static Site hosted on Render's global CDN and is available 24/7 with zero cold start. |

---

## 4. Pre-Demo / Interview Tip

Before showcasing this project to an interviewer or recruiter:
1. Open `https://doa-backend-y5mq.onrender.com/health` in your browser 1–2 minutes beforehand.
2. This ensures the backend container is fully awake and "warmed up," providing instantaneous responses during your live demonstration.
