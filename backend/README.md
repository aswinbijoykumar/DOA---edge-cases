# Delegation of Authority (DOA) Workflow Tool – Backend API

FastAPI backend with SQLite database powering the prototype DOA Governance Workflow Tool.

## Features
- **Authentication**: JWT token-based auth (`/api/auth/login`, `/api/auth/me`).
- **RBAC**: Enforces permissions between `ADMIN` and `NORMAL_USER`.
- **DOA Master Repository**: Controlled retrieval, search, parent/child taxonomy filtering, and full version history snapshots.
- **Change Requests**: Proposal creation for `ADD`, `MODIFY`, `DELETE` operations.
- **Diff Engine**: Field-by-field difference calculation (`ADDED`, `MODIFIED`, `REMOVED`, `UNCHANGED`).
- **Version Management & Publishing**: Controlled promotion where publishing bumps the active version to `v(n+1)` and archives `v(n)` as `HISTORICAL`.
- **Optimistic Concurrency Protection**: Returns `409 Conflict` if publishing a change request created against an outdated version.
- **Audit Trail**: Every change submission, review, approval, and publication writes a tamper-evident audit record.
- **Dashboard KPIs**: Aggregate metrics on master records, key decisions, regulatory items, and change queues.

---

## Demo Credentials
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@doa.local` | `Admin@123` | View all, approve, reject, publish, view audit logs |
| **Normal User** | `user@doa.local` | `User@123` | Search, filter, view DOA, submit change requests |

---

## Setup & Running Locally

### 1. Virtual Environment
```powershell
cd c:\Works\DOA\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```
*(If PowerShell execution policy prevents script activation, run commands directly with `.venv\Scripts\python.exe`)*

### 2. Install Dependencies
```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Seed Database
Seeds default users and 53 published DOA master records:
```powershell
.venv\Scripts\python.exe -m app.seed
```

### 4. Run Development Server
```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Running Automated Tests
```powershell
.venv\Scripts\python.exe -m pytest tests -v
```
All 12 tests validate authentication, RBAC authorization, diff engine, version bumping, conflict detection, and audit trail.
