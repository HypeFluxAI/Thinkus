FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate
COPY ../proto /app/proto
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./src/proto \
    --grpc_python_out=./src/proto \
    ./proto/*.proto

# Copy source code
COPY src/ ./src/

# Create __init__.py for proto package
RUN touch ./src/proto/__init__.py

ENV PYTHONPATH=/app
ENV GRPC_PORT=50051

EXPOSE 50051

CMD ["python", "-m", "src.main"]
