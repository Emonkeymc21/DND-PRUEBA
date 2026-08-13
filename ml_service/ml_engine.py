"""
Motor de clasificación y navegación del árbol narrativo.

Carga data/role_tree_dataset.json y, para cada texto libre del jugador:
  1. Compara contra las palabras clave y el label de cada opción del nodo
     actual usando TF-IDF + similitud coseno (scikit-learn).
  2. Elige la opción más parecida (o ninguna, si nada supera el umbral).
  3. Devuelve el siguiente nodo, la consecuencia narrada y el acumulado de
     pesos de arquetipo.

Este motor es LOCAL Y DETERMINISTA: no llama a ningún LLM externo. Es el
"clasificador de texto y recomendación por similitud" pedido en la
especificación, corriendo con scikit-learn en vez de embeddings pesados.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "role_tree_dataset.json"

# Palabras vacías del español. No usamos el paquete de NLTK para no sumar una
# descarga de corpus en el primer arranque; esta lista cubre el dominio.
STOPWORDS_ES = {
    "a", "al", "algo", "ante", "antes", "aqui", "asi", "aun", "aunque", "cada",
    "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
    "dos", "el", "ella", "ellos", "en", "entre", "era", "eso", "esta", "este",
    "esto", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me",
    "mi", "mientras", "muy", "nada", "ni", "no", "nos", "o", "para", "pero",
    "por", "porque", "que", "se", "ser", "si", "sin", "sobre", "solo", "son",
    "su", "sus", "tan", "te", "todo", "un", "una", "uno", "y", "ya", "yo",
}

# Umbral mínimo de similitud para aceptar una opción como "esto es lo que
# quiso decir". Debajo de esto, devolvemos None y el llamador decide qué
# hacer (pedir aclaración, usar la opción por defecto, etc).
MIN_SIMILARITY = 0.12


def normalize(text: str) -> str:
    """Minúsculas, sin tildes, sin puntuación."""
    text = text.lower()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )
    text = re.sub(r"[^a-z0-9ñ\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


class RoleTreeEngine:
    """Carga el árbol una sola vez y resuelve turnos contra él."""

    def __init__(self, dataset_path: Path = DATASET_PATH) -> None:
        self.dataset_path = dataset_path
        self._load()

    def _load(self) -> None:
        with open(self.dataset_path, encoding="utf-8") as f:
            data = json.load(f)

        self.root_node: str = data["root_node"]
        self.nodes: dict = data["nodes"]
        self.archetypes: dict = data["archetypes"]

        # Vectorizador por nodo: el vocabulario de "forzar la puerta" no tiene
        # por qué compartir espacio con el de "agradecer antes de entrar". Un
        # solo TF-IDF global diluiría la señal entre nodos que no compiten
        # entre sí.
        self._vectorizers: dict[str, TfidfVectorizer] = {}
        self._option_matrices: dict[str, object] = {}
        self._option_order: dict[str, list[str]] = {}

        for node_id, node in self.nodes.items():
            options = node.get("options") or []
            if not options:
                continue

            corpus = []
            order = []
            for opt in options:
                # El documento de cada opción es su label + sus keywords,
                # repetidas: así laten con más peso en el TF-IDF que una
                # palabra suelta del label.
                doc = " ".join(
                    [normalize(opt["label"])] + [normalize(k) for k in opt.get("keywords", [])] * 2
                )
                corpus.append(doc)
                order.append(opt["id"])

            vectorizer = TfidfVectorizer(stop_words=list(STOPWORDS_ES))
            matrix = vectorizer.fit_transform(corpus)

            self._vectorizers[node_id] = vectorizer
            self._option_matrices[node_id] = matrix
            self._option_order[node_id] = order

    def get_node(self, node_id: str) -> Optional[dict]:
        return self.nodes.get(node_id)

    def match_option(self, node_id: str, player_text: str) -> tuple[Optional[dict], float]:
        """
        Devuelve (opción_elegida_o_None, similitud).

        Si el texto no supera MIN_SIMILARITY contra ninguna opción, devuelve
        (None, mejor_similitud_encontrada) para que el llamador decida (por
        ejemplo, quedarse en el mismo nodo y pedir que lo intente de nuevo).
        """
        node = self.get_node(node_id)
        if not node or node_id not in self._vectorizers:
            return None, 0.0

        vectorizer = self._vectorizers[node_id]
        matrix = self._option_matrices[node_id]
        order = self._option_order[node_id]

        query_vec = vectorizer.transform([normalize(player_text)])
        sims = cosine_similarity(query_vec, matrix)[0]

        best_idx = int(sims.argmax())
        best_sim = float(sims[best_idx])

        if best_sim < MIN_SIMILARITY:
            return None, best_sim

        options_by_id = {o["id"]: o for o in node["options"]}
        return options_by_id[order[best_idx]], best_sim

    def resolve_turn(self, node_id: str, player_text: str) -> dict:
        """
        Resuelve un turno completo: matchea la opción, arma la respuesta con
        el siguiente nodo y la consecuencia narrada.
        """
        node = self.get_node(node_id)
        if not node:
            return {
                "ok": False,
                "error": f"Nodo '{node_id}' no existe en el árbol.",
            }

        option, similarity = self.match_option(node_id, player_text)

        if option is None:
            return {
                "ok": True,
                "matched": False,
                "similarity": round(similarity, 4),
                "current_node": node_id,
                "message": "No reconocí bien esa acción. Probá describirla con otras palabras.",
                "available_options": [o["label"] for o in node.get("options", [])],
            }

        next_node_id = option["next"]
        next_node = self.get_node(next_node_id)

        return {
            "ok": True,
            "matched": True,
            "similarity": round(similarity, 4),
            "chosen_option": option["id"],
            "consequence": option["consequence"],
            "archetype_weight": option.get("archetype_weight", {}),
            "next_node": {
                "id": next_node_id,
                "title": next_node["title"] if next_node else None,
                "text": next_node["text"] if next_node else None,
                "end": bool(next_node.get("end")) if next_node else False,
                "archetype_result": next_node.get("archetype_result") if next_node else None,
                "options": [
                    {"id": o["id"], "label": o["label"]} for o in (next_node.get("options") or [])
                ]
                if next_node
                else [],
            }
            if next_node
            else None,
        }

    def classify_archetype(self, accumulated: dict[str, float]) -> dict:
        """
        Dado un acumulado de pesos por arquetipo (sumados turno a turno por
        quien llama), devuelve el arquetipo dominante con su info completa.
        """
        if not accumulated:
            return {"id": None, "info": None, "scores": {}}

        total = sum(accumulated.values()) or 1.0
        normalized = {k: v / total for k, v in accumulated.items()}
        top_id = max(normalized, key=lambda k: normalized[k])

        return {
            "id": top_id,
            "info": self.archetypes.get(top_id),
            "scores": {k: round(v, 4) for k, v in normalized.items()},
        }


# Instancia única a nivel de módulo: FastAPI la importa y la reutiliza en
# cada request en vez de releer el JSON y refittear TF-IDF cada vez.
engine = RoleTreeEngine()
