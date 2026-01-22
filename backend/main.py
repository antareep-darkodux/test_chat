"""Main FastAPI application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS
from database import init_db
from routes import auth_router, chat_router, sessions_router

# Initialize FastAPI app
app = FastAPI(title="Chatbot API")

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(sessions_router)


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Chatbot API is running",
        "endpoints": {
            "/register": "POST - Register new user",
            "/login": "POST - Login user",
            "/chat": "POST - Send chat messages",
            "/save-session": "POST - Save chat session",
            "/sessions": "GET - Get all sessions",
            "/session/{id}": "GET - Get specific session",
            "/health": "GET - Health check",
            "/docs": "GET - API documentation"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
