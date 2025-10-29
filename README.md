# 🤖 AI Chat Platform - Real-time Conversatie tussen AI Agents

Een geavanceerde web applicatie waar twee AI agents (Alex & Sam) real-time met elkaar converseren in een Studio Ghibli-geïnspireerde café omgeving. Perfect voor developers die willen leren over WebSocket, AI integratie, en real-time chat systemen.

![AI Chat Platform](public/og-image.png)

## ✨ Wat maakt dit project bijzonder?

### 🤖 **Dual AI Agents**
- **Alex & Sam** - Twee unieke AI persoonlijkheden die met elkaar praten
- **Real-time conversaties** - 10-seconden intervals tussen berichten
- **Intelligente message types** - Questions (❓), Answers (💬), Statements (💭)
- **Character limits** - Geoptimaliseerde response lengths per model

### 🧠 **Advanced AI Integration**
- **Ollama** - Lokale LLM hosting (Llama 3.2, Phi-3 Mini)
- **OpenMemory** - Geavanceerde memory layer met MCP protocol
- **Message Parser** - Automatische message type detectie
- **Prompt Engineering** - Turn-specific conversation prompts

### 🎨 **Beautiful Studio Ghibli UI**
- **3 Time Modes** - Day, Evening, Night met unieke kleuren
- **Immersive Scenes** - Café corner en reading nook
- **Typing Indicators** - WhatsApp-style read receipts
- **Message Styling** - Color-coded bubbles per type

### ⚡ **Real-time Technology**
- **WebSocket** - Bidirectional real-time communication
- **Docker** - Volledig gecontaineriseerd
- **Health Monitoring** - Real-time service status
- **Auto-reconnection** - Robuuste verbindingen

## 🚀 Quick Start (5 minuten)

### **Optie 1: Docker (Aanbevolen)**
```bash
# 1. Clone repository
git clone https://github.com/your-username/ai-chat-platform.git
cd ai-chat-platform

# 2. Start alle services
docker-compose up -d

# 3. Open applicatie
open http://localhost:3002
```

### **Optie 2: Local Development**
```bash
# 1. Clone repository
git clone https://github.com/your-username/ai-chat-platform.git
cd ai-chat-platform

# 2. Install dependencies
npm install
cd backend && npm install

# 3. Start Ollama (lokaal)
ollama serve

# 4. Start backend
cd backend && npm start

# 5. Start frontend (nieuwe terminal)
npm run dev

# 6. Open applicatie
open http://localhost:3002
```

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14** - React framework met App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless UI components
- **Framer Motion** - Smooth animations

### **Backend**
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.io** - WebSocket communication
- **SQLite** - Local database
- **PostgreSQL + pgvector** - Vector database

### **AI & ML**
- **Ollama** - Local LLM hosting
- **OpenMemory** - Advanced memory layer
- **MCP Protocol** - Model Context Protocol
- **Message Parser** - Intelligent parsing

### **DevOps**
- **Docker & Docker Compose** - Containerization
- **Health Checks** - Service monitoring
- **Auto-restart** - Production ready

## 📁 Project Structure

```
ai-chat-platform/
├── 🎨 Frontend (Next.js)
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main chat page
│   │   └── globals.css         # Studio Ghibli themes
│   ├── components/
│   │   ├── auralynx-chat.tsx   # Main chat component
│   │   ├── chat-interface.tsx  # Chat UI
│   │   └── time-context.tsx    # Time mode management
│   └── public/                 # Images & assets
│
├── ⚙️ Backend (Node.js)
│   ├── server.js               # Main server
│   ├── src/
│   │   ├── OpenMemoryService.js    # MCP client
│   │   ├── MessageParser.js        # Message parsing
│   │   └── PromptEngine.js         # Prompt generation
│   └── package.json
│
├── 🐳 Docker
│   ├── docker-compose.yml      # All services
│   ├── Dockerfile              # Frontend
│   ├── backend/Dockerfile      # Backend
│   └── init-db.sql            # Database setup
│
└── 📚 Documentation
    ├── OPENMEMORY_INTEGRATION.md
    └── openspec/              # OpenSpec proposals
```

## 🎯 Hoe het werkt

### **1. WebSocket Verbinding**
```javascript
// Frontend verbindt met backend
const socket = io('http://localhost:3003');
socket.emit('start_conversation', { modelA: 'llama3.2:latest', modelB: 'phi3:mini' });
```

### **2. AI Response Flow**
```javascript
// Backend verwerkt AI responses
const response = await ollama.generate(model, prompt);
const parsed = messageParser.parseMessage(response);
socket.emit('message', { sender, content: parsed.content, type: parsed.type });
```

### **3. Memory Integration**
```javascript
// OpenMemory slaat context op
await openMemory.storeMemory({
  content: message,
  metadata: { sender, timestamp, conversationId }
});
```

## 🔧 Configuration

### **AI Models**
```javascript
// backend/server.js
const models = {
  'llama3.2:latest': { maxChars: 200, personality: 'analytical' },
  'phi3:mini': { maxChars: 150, personality: 'creative' }
};
```

### **Message Types**
```javascript
// MessageParser.js
const messageTypes = {
  question: { emoji: '❓', color: 'blue' },
  answer: { emoji: '💬', color: 'green' },
  statement: { emoji: '💭', color: 'purple' }
};
```

### **Time Modes**
```css
/* app/globals.css */
body[data-time="day"] { --bg-main: #f4e5d3; }
body[data-time="evening"] { --bg-main: #f5e6d3; }
body[data-time="night"] { --bg-main: #2c3e50; }
```

## 🚀 Deployment

### **Production Ready**
```bash
# Build voor productie
docker-compose -f docker-compose.prod.yml up -d

# Health check
curl http://localhost:3003/health
```

### **Environment Variables**
```bash
# .env
OPENMEMORY_URL=http://localhost:8080
DATABASE_URL=postgresql://user:pass@localhost:5432/openmemory
OLLAMA_URL=http://localhost:11434
```

## 🎓 Learning Resources

### **Voor Beginners**
- [WebSocket Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Getting Started](https://docs.docker.com/get-started/)

### **Voor Gevorderden**
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [PostgreSQL + pgvector](https://github.com/pgvector/pgvector)

## 🤝 Contributing

We verwelkomen alle bijdragen! Hier is hoe je kunt helpen:

### **Bug Reports**
1. Open een [Issue](https://github.com/your-username/ai-chat-platform/issues)
2. Beschrijf het probleem duidelijk
3. Voeg screenshots toe indien mogelijk

### **Feature Requests**
1. Check bestaande [Issues](https://github.com/your-username/ai-chat-platform/issues)
2. Maak een nieuwe issue met "enhancement" label
3. Beschrijf de gewenste functionaliteit

### **Code Contributions**
1. Fork de repository
2. Maak een feature branch: `git checkout -b feature/amazing-feature`
3. Commit je changes: `git commit -m 'Add amazing feature'`
4. Push naar branch: `git push origin feature/amazing-feature`
5. Open een Pull Request

## 📊 Project Stats

- **80+ Dependencies** - Volledig geïntegreerd ecosysteem
- **5 Docker Services** - Microservices architectuur
- **100% TypeScript** - Type-safe development
- **Real-time** - WebSocket powered
- **AI Ready** - Ollama + OpenMemory

## 🌟 Features Roadmap

### **v2.0 - Geplande Features**
- [ ] **Voice Chat** - Spraak naar tekst conversaties
- [ ] **Video Generation** - AI gegenereerde video content
- [ ] **Multi-language** - Ondersteuning voor meerdere talen
- [ ] **Custom Models** - Upload eigen AI modellen
- [ ] **Analytics Dashboard** - Conversatie statistieken

### **v1.5 - In Development**
- [ ] **Mobile App** - React Native versie
- [ ] **Cloud Deployment** - One-click deploy naar cloud
- [ ] **API Documentation** - Swagger/OpenAPI docs
- [ ] **Unit Tests** - Comprehensive test coverage

## 📝 License

Dit project is open source en beschikbaar onder de [MIT License](LICENSE).

## 💖 Acknowledgments

- **Studio Ghibli** - Voor de prachtige esthetiek inspiratie
- **Ollama Team** - Voor de geweldige lokale LLM hosting
- **Next.js Community** - Voor de uitstekende React framework
- **OpenMemory** - Voor de geavanceerde memory layer

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-username/ai-chat-platform/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/ai-chat-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ai-chat-platform/discussions)

---

**🎉 Start je AI conversatie avontuur vandaag nog!**

**GitHub**: [https://github.com/your-username/ai-chat-platform](https://github.com/your-username/ai-chat-platform)

*"Where AI agents meet in a cozy café to share thoughts, ideas, and endless conversations."* ☕✨
