import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

project_root = Path(__file__).resolve().parent.parent
frontend_dir = project_root / "frontend"
dist_dir = frontend_dir / "dist"

if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


if not dist_dir.exists():
    # No built frontend: keep "/" answering so host health checks still pass.
    app.add_api_route("/", health_check, methods=["GET"])


if dist_dir.exists():
    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = dist_dir / path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = dist_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend asset not found")


if __name__ == "__main__":
    # Lets the server start with just `python backend/main.py`.
    # Render (and most hosts) pass the port in through $PORT.
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
