import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.database import Base, get_db
from app.database.models import User, DOARecord, DOAVersion
from app.core.security import get_password_hash
from app.services.version_service import create_published_version_snapshot

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_doa.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test users
    admin = User(
        email="admin@doa.local",
        hashed_password=get_password_hash("Admin@123"),
        full_name="Admin User",
        role="ADMIN",
        is_active=True
    )
    normal_user = User(
        email="user@doa.local",
        hashed_password=get_password_hash("User@123"),
        full_name="Normal User",
        role="NORMAL_USER",
        is_active=True
    )
    db.add(admin)
    db.add(normal_user)
    db.commit()

    # Create sample DOA record
    rec = DOARecord(
        id="DOA-TEST-101",
        parent_function="Finance",
        function="Finance",
        business_line="Bank Capital and Capital Management",
        category="Bank Capital and Capital Management",
        key_non_key="Key",
        decision_area="Approve increase or reduction of share capital",
        composite_authority="Shareholders (A) -> BoD (E2)",
        comments="Initial test rule",
        regulatory="N",
        current_version=1,
        status="PUBLISHED",
        effective_date="2026-01-01",
        review_date="2027-01-01",
        created_by="admin@doa.local"
    )
    db.add(rec)
    db.commit()
    create_published_version_snapshot(db, rec, "admin@doa.local")
    db.commit()
    db.close()
    
    yield
    
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={"email": "admin@doa.local", "password": "Admin@123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def user_token(client):
    res = client.post("/api/auth/login", json={"email": "user@doa.local", "password": "User@123"})
    assert res.status_code == 200
    return res.json()["access_token"]
