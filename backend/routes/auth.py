"""Authentication routes"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, User
from schemas import UserRegister, UserLogin, LoginResponse
from auth import verify_password

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user - save password as plain text
    db_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=user_data.password  # Store plain password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return LoginResponse(user_id=db_user.id, message="Registration successful")


@router.post("/login", response_model=LoginResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Verify password - simple comparison
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    return LoginResponse(user_id=user.id, message="Login successful")
