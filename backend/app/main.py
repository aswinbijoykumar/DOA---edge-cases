from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import engine, Base
from app.api import (
    auth, 
    doa, 
    change_requests, 
    audit, 
    dashboard, 
    taxonomy,
    normal_user,
    governance_team,
    doa_admin,
    system_admin,
    roles_workflows,
    chatbot,
    supplementary_governance
)
from app.database import supplementary_models  # Ensure supplementary tables are registered

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend REST API for the Delegation of Authority (DOA) Governance Workflow Tool Prototype",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Core API Routers under /api prefix
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(doa.router, prefix=settings.API_V1_STR)
app.include_router(change_requests.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(taxonomy.router, prefix=settings.API_V1_STR)

# Include Role-Dedicated RBAC Routers under /api prefix
app.include_router(normal_user.router, prefix=settings.API_V1_STR)
app.include_router(roles_workflows.router, prefix=settings.API_V1_STR)
app.include_router(governance_team.router, prefix=settings.API_V1_STR)
app.include_router(doa_admin.router, prefix=settings.API_V1_STR)
app.include_router(system_admin.router, prefix=settings.API_V1_STR)
app.include_router(chatbot.router, prefix=settings.API_V1_STR)
app.include_router(supplementary_governance.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "DOA Workflow Tool Backend API is operational",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
@app.on_event("startup")
def startup_event():
    # Automatically seed users, DOAs, and change requests if the database is empty
    from app.database.database import SessionLocal
    from app.database.models import User
    from app.seed import seed_database
    from app.seed_supplementary import seed_supplementary_data

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("[RENDER STARTUP] Database is empty. Seeding initial users and DOA master records...")
            seed_database()
            seed_supplementary_data()
            print("[RENDER STARTUP] Seeding completed successfully.")
    except Exception as e:
        print(f"[RENDER STARTUP] Seeding check error: {e}")
    finally:
        db.close()