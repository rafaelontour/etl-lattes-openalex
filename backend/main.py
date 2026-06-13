from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import close_pool
from routers import pesquisadores, producoes, metricas, busca, areas


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
