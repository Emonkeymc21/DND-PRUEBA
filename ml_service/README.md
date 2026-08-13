# ML Service — La Mesa Perdida (opcional, sólo desarrollo local)

Motor en Python que clasifica el texto libre del jugador contra las palabras
clave del árbol narrativo (`data/role_tree_dataset.json`) usando TF-IDF y
similitud coseno de scikit-learn.

## Cuándo usarlo

**Nunca hace falta para que el sitio funcione.** `app/api/simulate/route.ts`
intenta este servicio con un timeout de 1.5 segundos y, si no responde, usa un
motor equivalente escrito en TypeScript. El jugador nunca ve la diferencia.

Tiene sentido levantarlo si estás iterando sobre el árbol narrativo o el
algoritmo de clasificación y querés el ciclo rápido de scikit-learn en vez de
reescribir la lógica en TS cada vez.

## Levantarlo

```bash
cd ml_service
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload
```

Documentación interactiva en http://localhost:8000/docs

## Por qué no se despliega junto al sitio

Vercel y Netlify son serverless: no hay un proceso persistente escuchando en
un puerto en producción. Desplegar esto en paralelo requeriría un host aparte
(Railway, Render, Fly.io) y mantener dos servicios sincronizados, lo cual es
una complejidad real que este proyecto no necesita — el motor TypeScript hace
el mismo trabajo y ya vive dentro del mismo deploy serverless que el resto del
sitio.

Si en algún momento el árbol narrativo crece mucho y el TF-IDF empieza a
justificar correr en un proceso dedicado, ahí sí tiene sentido separar esto en
su propio servicio con URL pública y `ML_SERVICE_URL` apuntándole.
