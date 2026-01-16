FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY py-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate
COPY proto /app/proto
RUN mkdir -p ./src/proto && \
    python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./src/proto \
    --grpc_python_out=./src/proto \
    ./proto/*.proto && \
    touch ./src/proto/__init__.py

# Copy source code
COPY py-service/src/ ./src/

ENV PYTHONPATH=/app
ENV GRPC_PORT=50051

EXPOSE 50051 8000

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
