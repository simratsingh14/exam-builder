from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os


def get_data_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_dir = get_data_dir()
    for sub in ("papers", "templates", "uploads"):
        (data_dir / sub).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Exam Builder", lifespan=lifespan)

from .routers import uploads, papers  # noqa: E402
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(papers.router, prefix="/api/papers", tags=["papers"])


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Serve React SPA in production (after frontend build)
STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")
