import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

if not __package__:
    backend_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(backend_dir)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    import backend  # noqa: F401
    from backend.routers import stock, portfolio
else:
    from .routers import stock, portfolio

load_dotenv()

app = FastAPI(title="Oracle's Edge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router)
app.include_router(portfolio.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
