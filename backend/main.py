import sys
import os
from contextlib import asynccontextmanager 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure local package imports (e.g., router) resolve when running from repo root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from router.chat import router 

# Load environment variables from backend/.env explicitly
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=ENV_PATH)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    
    # Validate required environment variables
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise ValueError("MONGO_URI environment variable not set!")
    
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set!")
    
    app.mongodb_client = AsyncIOMotorClient(mongo_uri)
    app.database = app.mongodb_client["homh04_db"]
    print("🚀 Successfully connected to the MongoDB database.")
    print("✅ GOOGLE_API_KEY validated successfully.")
    
    yield 
    
    print("Application shutdown...")
    app.mongodb_client.close()
    print("MongoDB connection closed.")


app = FastAPI(
    title="HOMH04 AI Chatbot API",
    lifespan=lifespan 
)


origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router, prefix="/api")


@app.get("/")
def read_root():
    """Root GET endpoint for health check."""
    return {"status": "ok", "message": "HOMH04 Backend is online and ready!"}