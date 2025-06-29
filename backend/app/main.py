from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.api.endpoints import auth

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Converza API")

# Configure CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Converza API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}