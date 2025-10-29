# OpenMemory Integration Guide

## Overview

This project now includes OpenMemory integration for advanced AI conversation memory capabilities. OpenMemory provides semantic memory storage, retrieval, and cognitive structure for AI conversations.

## Features

- **Semantic Memory Storage**: Store conversations with semantic embeddings
- **Memory-Enhanced AI Prompts**: AI agents use relevant past context
- **Cross-Session Continuity**: Conversations persist across restarts
- **Semantic Search**: Find past conversations by meaning, not keywords
- **Memory Reinforcement**: Important topics are reinforced automatically
- **Fallback Support**: Falls back to SQLite if OpenMemory is unavailable

## Architecture

```
Frontend (Next.js) ←→ Backend (Node.js/Socket.io) ←→ Ollama (Local LLM)
                                    ↓
                            OpenMemory Service
                                    ↓
                            PostgreSQL + pgvector
```

## Setup Instructions

### 1. Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Ollama (for embeddings and LLM)

### 2. Environment Variables

Create a `.env` file in the backend directory:

```bash
# OpenMemory Configuration
OPENMEMORY_URL=http://localhost:8080
OLLAMA_URL=http://localhost:11434

# Database Configuration
DATABASE_URL=postgresql://openmemory:openmemory@localhost:5432/openmemory

# Server Configuration
PORT=3003
NODE_ENV=development
```

### 3. Start Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or start services individually
docker-compose up -d postgres ollama openmemory
npm install
npm start
```

### 4. Verify Installation

```bash
# Check OpenMemory health
curl http://localhost:8080/health

# Check backend health
curl http://localhost:3003/health

# Check memory status
curl http://localhost:3003/memory/status
```

## API Endpoints

### Health Check
- `GET /health` - Overall system health including OpenMemory status
- `GET /memory/status` - OpenMemory specific status and memory count

### Memory Search
- `POST /memory/search` - Search through conversation memories
  ```json
  {
    "query": "conversations about AI",
    "k": 5
  }
  ```

## Configuration

### OpenMemory Service
- **Port**: 8080
- **Database**: PostgreSQL with pgvector
- **Embedding Model**: Uses Ollama for local embeddings
- **MCP Endpoint**: `/mcp` for Model Context Protocol

### Memory Storage
- **Primary**: OpenMemory for semantic storage
- **Backup**: SQLite for compatibility
- **Capacity**: 15GB+ for conversation history
- **Retention**: Persistent across restarts

## Usage

### Automatic Integration
The system automatically:
1. Stores all AI responses in OpenMemory
2. Retrieves relevant context for new conversations
3. Enhances AI prompts with memory context
4. Falls back to SQLite if OpenMemory is unavailable

### Manual Memory Operations
```javascript
// Store a memory
await openMemory.storeMemory(content, metadata);

// Query memories
const memories = await openMemory.queryMemories(query, options);

// Reinforce important memories
await openMemory.reinforceMemory(memoryId, importance);
```

## Troubleshooting

### OpenMemory Not Available
- Check if OpenMemory service is running: `docker ps | grep openmemory`
- Verify database connection: `docker logs ghibli-postgres`
- Check logs: `docker logs ghibli-openmemory`

### Memory Not Persisting
- Verify OpenMemory health: `curl http://localhost:8080/health`
- Check database connectivity
- Review backend logs for errors

### Performance Issues
- Monitor memory usage: `docker stats`
- Check database performance
- Verify embedding model is working

## Development

### Adding New Memory Features
1. Update `OpenMemoryService.js` with new methods
2. Add corresponding API endpoints
3. Update conversation flow to use new features
4. Test with fallback to SQLite

### Testing Memory Integration
```bash
# Test memory storage
curl -X POST http://localhost:3003/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test memory", "k": 5}'
```

## Production Deployment

### Docker Compose
The included `docker-compose.yml` provides:
- OpenMemory service with PostgreSQL
- Ollama for embeddings and LLM
- Backend with OpenMemory integration
- Frontend with memory-enhanced UI

### Environment Variables
Set production environment variables:
- `OPENMEMORY_URL`: Production OpenMemory service URL
- `DATABASE_URL`: Production PostgreSQL connection
- `NODE_ENV=production`

### Monitoring
- Health checks: `/health` and `/memory/status`
- Memory metrics: Available via OpenMemory dashboard
- Performance monitoring: Docker stats and logs

## Benefits

1. **Enhanced AI Responses**: AI agents remember past conversations
2. **Semantic Search**: Find conversations by meaning, not keywords
3. **Cross-Session Learning**: Conversations continue across restarts
4. **Cost Efficiency**: 10-15× cheaper than cloud alternatives
5. **Privacy**: All data remains self-hosted
6. **Scalability**: Handles 100k+ conversation memories efficiently

## Support

For issues with OpenMemory integration:
1. Check the logs: `docker logs ghibli-openmemory`
2. Verify service health: `curl http://localhost:8080/health`
3. Review this documentation
4. Check the OpenMemory repository: https://github.com/CaviraOSS/OpenMemory
