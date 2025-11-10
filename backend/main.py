from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "File Management API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": settings.environment}
