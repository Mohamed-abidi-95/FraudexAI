# backend/models.py
from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # 'client' or 'admin'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
