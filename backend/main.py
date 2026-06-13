from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.core.database import close_pool
from backend.routers import pesquisadores, producoes, metricas, busca, areas
from backend.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_pool()


app = FastAPI(
    title="Lattes Integration API",
    description="API para consulta e busca semântica de produções acadêmicas (Lattes + OpenAlex)",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",
    "https://frontend-lattes-production.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pesquisadores.router)
app.include_router(producoes.router)
app.include_router(metricas.router)
app.include_router(busca.router)
app.include_router(areas.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug-db")
async def debug_db():
    return {
        "host": settings.postgres_host,
        "port": settings.postgres_port,
        "db": settings.postgres_db,
        "user": settings.postgres_user,
    }