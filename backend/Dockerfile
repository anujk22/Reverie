FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir sqlite-vec || \
    echo "sqlite-vec install failed; Reverie will use brute-force vector search at demo scale"

COPY app ./app
COPY migrations ./migrations
COPY scripts ./scripts

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
