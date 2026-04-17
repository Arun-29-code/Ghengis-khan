FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code and data
COPY server.py .
COPY data/ ./data/

# Expose port
EXPOSE 8000

# DATA_DIR points to the bundled data folder inside the container
ENV DATA_DIR=/app/data

# Run the server
CMD ["python", "server.py"]
