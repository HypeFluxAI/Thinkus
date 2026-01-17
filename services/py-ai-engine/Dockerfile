FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY py-ai-engine/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate Python code
COPY proto /app/proto
RUN mkdir -p ./src/proto && \
    python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./src/proto \
    --grpc_python_out=./src/proto \
    ./proto/*.proto && \
    touch ./src/proto/__init__.py

# Copy application code
COPY py-ai-engine/src ./src

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose ports
EXPOSE 8000 50054

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "src.main"]
