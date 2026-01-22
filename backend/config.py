"""Configuration settings for the application"""
import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://apple@localhost:5432/zia_db")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "DL7en6VZbBPBXwZYK0w53nsjxXi0BbVVsXqlT5A4CzP7K6oEkJxqJQQJ99BDAC77bzfXJ3w3AAABACOGdo4Z")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://voiceclub-openai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2025-01-01-preview")

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
