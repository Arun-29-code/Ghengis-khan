# GP Practice Explorer — MCP Server

A secure Model Context Protocol (MCP) server that exposes GP practice sales intelligence data to Claude AI.

## Features

- 12 tools covering practice search, PCN/ICB analysis, GP partner lookup, web enrichment, and lead scoring
- API key authentication via `Authorization: Bearer <key>` header
- Bundles all data files inside the container — no external database required

## Environment Variables

| Variable | Description |
|---|---|
| `MCP_API_KEY` | Secret key required to authenticate all requests |
| `DATA_DIR` | Path to the directory containing the four data files (default: `./data`) |

## Running Locally

```bash
pip install -r requirements.txt
MCP_API_KEY=your-key python server.py
```

## Deploying with Docker

```bash
docker build -t gp-mcp-server .
docker run -p 8000:8000 -e MCP_API_KEY=your-key gp-mcp-server
```

## MCP Endpoint

```
https://<your-domain>/mcp
```

## Health Check

```
GET https://<your-domain>/health
```
