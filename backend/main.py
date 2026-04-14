# backend/main.py

from fastapi import FastAPI
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from loaders.load_models import load_models
from services.prediction import ensemble_predict
import db_models as models
from database import engine, SessionLocal, get_db
from passlib.context import CryptContext
import os
import json

# Create tables
models.Base.metadata.create_all(bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 🔐 CORS (Angular)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 load models once
ml_models = load_models()

class Transaction(BaseModel):
    features: list

@app.post("/predict")
def predict(transaction: Transaction):
    result = ensemble_predict(ml_models, transaction.features)
    return result

# 🔐 Authentication Endpoints
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if user.role != request.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incompatible role"
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "createdAt": user.created_at
    }

@app.get("/admin/model-metrics")
def get_model_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "data", "model_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding='utf-8') as f:
            return json.load(f)
    return {
        "last_update": "Never",
        "models": [
            {"name": "Transformer", "auc": 0, "accuracy": 0, "precision": 0, "recall": 0, "status": "pending"},
            {"name": "Autoencoder", "auc": 0, "accuracy": 0, "precision": 0, "recall": 0, "status": "pending"},
            {"name": "Attention", "auc": 0, "accuracy": 0, "precision": 0, "recall": 0, "status": "pending"}
        ]
    }

# Seed DB (Optional for testing)
@app.on_event("startup")
def seed_db():
    db = SessionLocal()
    # Check if admin exists
    admin = db.query(models.User).filter(models.User.email == "admin@fraudexia.com").first()
    if not admin:
        new_admin = models.User(
            full_name="Admin User",
            email="admin@fraudexia.com",
            hashed_password=get_password_hash("123456"),
            role="admin"
        )
        db.add(new_admin)
        db.commit()
        print("Admin user seeded")

    # Check if client exists
    client = db.query(models.User).filter(models.User.email == "client@fraudexia.com").first()
    if not client:
        new_client = models.User(
            full_name="Client User",
            email="client@fraudexia.com",
            hashed_password=get_password_hash("123456"),
            role="client"
        )
        db.add(new_client)
        db.commit()
        print("Client user seeded")
    db.close()