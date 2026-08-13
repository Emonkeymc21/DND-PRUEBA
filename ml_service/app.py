"""
Servicio FastAPI del motor de simulación.

USO: sólo desarrollo local. Se levanta con:

    cd ml_service
    pip install -r requirements.txt
    uvicorn app:app --port 8000 --reload

Next.js (app/api/simulate/route.ts) intenta este servicio primero y, si no
responde en 1.5s o no está corriendo, usa el motor TypeScript equivalente
(lib/ai/heuristic.ts + lib/ml/*) sin que el usuario final note la diferencia.

IMPORTANTE PARA DEPLOY: Vercel y Netlify son serverless — no hay un proceso
Python persistente escuchando en un puerto en producción. Este servicio NO se
despliega junto al sitio; es un acelerador opcional para cuando estás
desarrollando en tu máquina. El motor TypeScript es el que corre siempre en
producción.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml_engine import engine

app = FastAPI(
    title="La Mesa Perdida — ML Service",
    version="7.0.0",
    description="Motor de clasificación de texto libre y navegación del árbol narrativo. Sólo para desarrollo local.",
)

# CORS abierto a localhost: este servicio nunca se expone públicamente, así
# que no hay superficie de ataque real en restringir más que esto.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class TurnRequest(BaseModel):
    node_id: str = Field(default="root", description="ID del nodo actual del árbol.")
    text: str = Field(min_length=1, max_length=400, description="Texto libre del jugador.")
    accumulated_weights: dict[str, float] = Field(
        default_factory=dict, description="Pesos de arquetipo acumulados en turnos anteriores."
    )


class TurnResponse(BaseModel):
    ok: bool
    matched: bool = False
    similarity: float = 0.0
    chosen_option: str | None = None
    consequence: str | None = None
    next_node: dict | None = None
    accumulated_weights: dict[str, float] = Field(default_factory=dict)
    archetype: dict | None = None
    message: str | None = None
    available_options: list[str] = Field(default_factory=list)
    error: str | None = None


@app.get("/health")
def health() -> dict:
    """Next.js pega acá primero, con timeout corto, para decidir si usa este
    servicio o cae al motor TypeScript."""
    return {"status": "ok", "engine": "python", "nodes_loaded": len(engine.nodes)}


@app.get("/tree/{node_id}")
def get_node(node_id: str) -> dict:
    node = engine.get_node(node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Nodo '{node_id}' no encontrado.")
    return node


@app.post("/simulate", response_model=TurnResponse)
def simulate(req: TurnRequest) -> TurnResponse:
    result = engine.resolve_turn(req.node_id, req.text)

    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=result.get("error", "Error desconocido."))

    if not result.get("matched"):
        return TurnResponse(
            ok=True,
            matched=False,
            similarity=result["similarity"],
            current_node=result.get("current_node"),  # type: ignore[call-arg]
            message=result["message"],
            available_options=result["available_options"],
            accumulated_weights=req.accumulated_weights,
        )

    # Acumulamos los pesos de arquetipo de esta opción sobre los que ya
    # traía el cliente.
    new_weights = dict(req.accumulated_weights)
    for archetype_id, weight in (result.get("archetype_weight") or {}).items():
        new_weights[archetype_id] = new_weights.get(archetype_id, 0.0) + weight

    archetype_result = engine.classify_archetype(new_weights)

    return TurnResponse(
        ok=True,
        matched=True,
        similarity=result["similarity"],
        chosen_option=result["chosen_option"],
        consequence=result["consequence"],
        next_node=result["next_node"],
        accumulated_weights=new_weights,
        archetype=archetype_result,
    )


@app.get("/")
def root() -> dict:
    return {
        "service": "La Mesa Perdida ML Service",
        "docs": "/docs",
        "note": "Servicio de desarrollo local. El sitio en producción no depende de esto.",
    }
