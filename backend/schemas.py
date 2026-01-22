"""Pydantic models for request/response validation"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    user_id: int
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0
    max_tokens: Optional[int] = 300


class ChatResponse(BaseModel):
    response: str
    usage: Optional[dict] = None


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user_id: int
    message: str = "Login successful"


class SaveSessionRequest(BaseModel):
    messages: List[Message]
    user_id: int
    generate_summary: bool = True  # Only generate summary on logout


class UpdateSessionRequest(BaseModel):
    messages: List[Message]