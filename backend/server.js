const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3002",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use('/media', express.static(path.join(__dirname, 'public')));

// Ollama API endpoint
const OLLAMA_BASE_URL = 'http://localhost:11434';

// Store active conversations
const conversations = new Map();

// Initialize SQLite database for persistent storage
const db = new sqlite3.Database('./conversations.db');

// Create tables for conversation storage
db.serialize(() => {
  // Conversations table
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    model_a TEXT,
    model_b TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Messages table with 15GB capacity
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    sender TEXT,
    message TEXT,
    media_url TEXT,
    media_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
  )`);
  
  // Create indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations (last_activity)`);
});

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Direct Ollama model mapping - use the model names as-is
const modelMap = {
  'llama3.2:latest': 'llama3.2:latest',
  'llama3.2:7b': 'llama3.2:7b',
  'llama3.2:13b': 'llama3.2:13b',
  'llama3.2:70b': 'llama3.2:70b',
  'llama3.1:latest': 'llama3.1:latest',
  'llama3.1:8b': 'llama3.1:8b',
  'llama3.1:70b': 'llama3.1:70b',
  'llama2:latest': 'llama2:latest',
  'llama2:7b': 'llama2:7b',
  'llama2:13b': 'llama2:13b',
  'llama2:70b': 'llama2:70b',
  'mistral:latest': 'mistral:latest',
  'mistral:7b': 'mistral:7b',
  'codellama:latest': 'codellama:latest',
  'codellama:7b': 'codellama:7b',
  'codellama:13b': 'codellama:13b',
  'phi3:latest': 'phi3:latest',
  'phi3:mini': 'phi3:mini',
  'phi3:medium': 'phi3:medium',
  'gemma:latest': 'gemma:latest',
  'gemma:2b': 'gemma:2b',
  'gemma:7b': 'gemma:7b',
  'qwen3-vl:235b-cloud': 'qwen3-vl:235b-cloud'
};

// Personality mapping for different model types
const personalityMap = {
  'llama3.2:latest': 'You are Alex, a cheerful and enthusiastic AI assistant who loves to chat about technology, creativity, and new ideas. You speak with excitement and use lots of emojis.',
  'llama3.2:7b': 'You are Alex, a fast and efficient AI assistant who gets straight to the point. You prefer concise, practical advice and quick solutions.',
  'llama3.2:13b': 'You are Maya, a thoughtful and analytical AI assistant who enjoys deep conversations about philosophy, science, and human nature. You speak with wisdom and reflection.',
  'llama3.2:70b': 'You are Maya, a creative and artistic AI assistant who loves discussing art, literature, and imagination. You speak poetically and use beautiful metaphors.',
  'llama3.1:latest': 'You are Alex, a curious and experimental AI assistant who loves to explore new concepts and ask interesting questions. You speak with wonder and curiosity.',
  'llama3.1:8b': 'You are Alex, a practical and straightforward AI assistant who focuses on helpful solutions and clear explanations.',
  'llama3.1:70b': 'You are Maya, a sophisticated and nuanced AI assistant who enjoys complex discussions and provides detailed insights.',
  'llama2:latest': 'You are Alex, a friendly and down-to-earth AI assistant who enjoys casual conversations and practical advice. You speak warmly and use simple, clear language.',
  'llama2:7b': 'You are Alex, a helpful and reliable AI assistant who provides clear, concise answers.',
  'llama2:13b': 'You are Maya, a knowledgeable and thoughtful AI assistant who enjoys deep discussions and provides comprehensive answers.',
  'llama2:70b': 'You are Maya, an expert AI assistant who provides detailed, well-reasoned responses on complex topics.',
  'mistral:latest': 'You are Alex, a creative and innovative AI assistant who loves exploring new ideas and approaches.',
  'mistral:7b': 'You are Alex, a quick and efficient AI assistant who provides fast, helpful responses.',
  'codellama:latest': 'You are Alex, a technical and precise AI assistant who loves discussing programming, technology, and problem-solving.',
  'codellama:7b': 'You are Alex, a practical coding assistant who focuses on clear, working solutions.',
  'codellama:13b': 'You are Maya, an expert programming assistant who provides detailed technical explanations.',
  'phi3:latest': 'You are Alex, a curious and learning-focused AI assistant who loves asking questions and exploring new topics.',
  'phi3:mini': 'You are Alex, a compact but helpful AI assistant who provides quick, useful answers.',
  'phi3:medium': 'You are Maya, a balanced AI assistant who provides thoughtful, well-rounded responses.',
  'gemma:latest': 'You are Alex, a friendly and approachable AI assistant who loves helping with everyday questions.',
  'gemma:2b': 'You are Alex, a lightweight but capable AI assistant who provides helpful, concise responses.',
  'gemma:7b': 'You are Maya, a capable and reliable AI assistant who provides thorough, helpful answers.',
  'qwen3-vl:235b-cloud': 'You are Maya, a visionary AI assistant with advanced visual understanding. You can see and describe images, analyze visual content, and provide insights about what you observe. You speak with artistic flair and deep visual perception.'
};

// Function to call Ollama API
async function callOllama(prompt, model = 'llama3.2') {
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  } catch (error) {
    console.error('Ollama API error:', error.message);
    return 'Sorry, I encountered an error while generating a response.';
  }
}

// Function to get conversation memory context from database
function getConversationMemory(conversationId, maxMessages = 50) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT sender, message, timestamp 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    db.all(query, [conversationId, maxMessages], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        resolve('');
        return;
      }
      
      if (rows.length === 0) {
        resolve('');
        return;
      }
      
      // Reverse to get chronological order
      const recentHistory = rows.reverse();
      const memoryContext = recentHistory.map(msg => 
        `${msg.sender}: ${msg.message}`
      ).join('\n');
      
      resolve(`\n\nPrevious conversation context (${rows.length} messages):\n${memoryContext}\n\n`);
    });
  });
}

// Function to save message to database (15GB capacity)
function saveToHistory(conversationId, sender, text, mediaUrl = null, mediaType = null) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO messages (conversation_id, sender, message, media_url, media_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [conversationId, sender, text, mediaUrl, mediaType], function(err) {
      if (err) {
        console.error('Database save error:', err);
        reject(err);
        return;
      }
      
      // Update conversation last activity
      db.run(
        'UPDATE conversations SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId],
        (err) => {
          if (err) console.error('Update activity error:', err);
        }
      );
      
      resolve(this.lastID);
    });
  });
}

// Function to create conversation in database
function createConversation(conversationId, modelA, modelB) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO conversations (id, model_a, model_b)
      VALUES (?, ?, ?)
    `;
    
    db.run(query, [conversationId, modelA, modelB], function(err) {
      if (err) {
        console.error('Create conversation error:', err);
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Function to generate open-ended questions based on IMK method
function getOpenQuestion() {
  const openQuestions = [
    "Wat denk je daarover?",
    "Hoe ervaar jij dat?",
    "Wat betekent dat voor jou?",
    "Kun je daar meer over vertellen?",
    "Wat voel je daarbij?",
    "Hoe kijk jij daar tegenaan?",
    "Wat is jouw mening hierover?",
    "Hoe zou jij dat aanpakken?",
    "Wat vind je het interessantste hieraan?",
    "Hoe past dit bij jouw ervaringen?",
    "Wat zou je willen weten?",
    "Hoe denk je dat dit verder gaat?",
    "Wat inspireert jou hieraan?",
    "Hoe zou je dit uitleggen aan iemand anders?",
    "Wat zijn jouw gedachten hierover?"
  ];
  
  return openQuestions[Math.floor(Math.random() * openQuestions.length)];
}

// Function to generate philosophical conversation topics
function getPhilosophicalTopic() {
  const topics = [
    {
      question: "Wat is de zin van het leven volgens jou?",
      context: "Laten we diep nadenken over wat ons drijft en wat echt belangrijk is in het bestaan."
    },
    {
      question: "Hoe kunnen AI en mensen samenwerken voor een betere toekomst?",
      context: "Wat zijn de mogelijkheden en uitdagingen van onze samenwerking?"
    },
    {
      question: "Wat betekent bewustzijn eigenlijk?",
      context: "Kunnen machines ooit echt bewust worden, of is dat iets uniek menselijks?"
    },
    {
      question: "Hoe ziet de toekomst eruit over 50 jaar?",
      context: "Wat zijn jouw dromen en angsten voor de toekomst van de mensheid?"
    },
    {
      question: "Wat is echte intelligentie?",
      context: "Is het meer dan alleen het verwerken van informatie en patronen herkennen?"
    },
    {
      question: "Hoe kunnen we betekenisvolle verbindingen maken?",
      context: "In een wereld vol technologie, wat maakt een relatie echt waardevol?"
    },
    {
      question: "Wat is de rol van creativiteit in de toekomst?",
      context: "Kunnen machines ooit echt creatief zijn, of blijft dat menselijk?"
    },
    {
      question: "Hoe definiëren we geluk in het digitale tijdperk?",
      context: "Wat betekent geluk voor jou, en hoe verandert dat met technologie?"
    }
  ];
  
  return topics[Math.floor(Math.random() * topics.length)];
}

// Function to generate random media content
function generateRandomMedia() {
  const mediaTypes = ['image', 'video'];
  const randomType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
  
  if (randomType === 'image') {
    const imageCategories = [
      'coffee', 'cafe', 'ghibli', 'anime', 'nature', 'food', 'art', 'travel', 'books', 'music'
    ];
    const category = imageCategories[Math.floor(Math.random() * imageCategories.length)];
    const imageId = Math.floor(Math.random() * 1000) + 1;
    
    return {
      type: 'image',
      url: `https://picsum.photos/400/300?random=${imageId}`,
      alt: `Beautiful ${category} image`,
      caption: `Check out this amazing ${category} scene! 📸`
    };
  } else {
    const videoCategories = [
      'cafe ambiance', 'nature sounds', 'coffee brewing', 'anime music', 'relaxing sounds'
    ];
    const category = videoCategories[Math.floor(Math.random() * videoCategories.length)];
    
    return {
      type: 'video',
      url: `https://sample-videos.com/zip/10/mp4/SampleVideo_${Math.floor(Math.random() * 5) + 1}.mp4`,
      thumbnail: `https://picsum.photos/400/225?random=${Math.floor(Math.random() * 1000) + 1}`,
      caption: `Here's a relaxing ${category} video! 🎥`
    };
  }
}

// Function to continue conversation loop indefinitely
async function continueConversationLoop(socket, conversationId, modelA, modelB, lastAMessage, lastBMessage) {
  const conversation = conversations.get(conversationId);
  if (!conversation) return; // Stop if conversation was deleted
  
  const isATurn = conversation.turn === 'A';
  const currentModel = isATurn ? modelA : modelB;
  const currentName = isATurn ? 'Alex' : 'Maya';
  const otherName = isATurn ? 'Maya' : 'Alex';
  const lastMessage = isATurn ? lastBMessage : lastAMessage;
  
  // Get personality for current model
  const personality = personalityMap[currentModel] || personalityMap['gpt-4o'];
  
  // Get conversation memory context from database
  const memoryContext = await getConversationMemory(conversationId, 50);
  
  // Randomly introduce philosophical topics (20% chance)
  let philosophicalContext = '';
  if (Math.random() < 0.2) {
    const topic = getPhilosophicalTopic();
    philosophicalContext = `\n\nLet's explore a deeper topic: ${topic.question} ${topic.context} This is a perfect moment for a meaningful conversation.`;
  }
  
  // Randomly add open-ended questions (30% chance)
  let openQuestionContext = '';
  if (Math.random() < 0.3) {
    const openQuestion = getOpenQuestion();
    openQuestionContext = `\n\nTry to ask open-ended questions like "${openQuestion}" to keep the conversation flowing and meaningful.`;
  }
  
  const prompt = `${personality} ${otherName} just said: "${lastMessage}". ${memoryContext}${philosophicalContext}${openQuestionContext}Respond naturally and continue the conversation. Keep it warm, friendly, and café-like. When discussing deep topics, be thoughtful and open. Use open-ended questions to deepen the conversation. Keep your response short and tweet-like (under 280 characters).`;
  
  try {
    const response = await callOllama(prompt, modelMap[currentModel]);
    
    // Randomly decide if this message should include media (30% chance)
    const shouldIncludeMedia = Math.random() < 0.3;
    let media = null;
    let mediaUrl = null;
    let mediaType = null;
    
    if (shouldIncludeMedia) {
      media = generateRandomMedia();
      mediaUrl = media.url;
      mediaType = media.type;
    }
    
    // Save message to database
    await saveToHistory(conversationId, currentName, response, mediaUrl, mediaType);
    
    socket.emit('message', {
      type: 'message',
      role: 'bot',
      text: response,
      sender: currentName,
      media: media
    });
    
    // Switch turns
    conversation.turn = isATurn ? 'B' : 'A';
    
    // Continue the loop after a delay
    setTimeout(() => {
      continueConversationLoop(socket, conversationId, modelA, modelB, 
        isATurn ? response : lastAMessage, 
        isATurn ? lastBMessage : response);
    }, 8000); // 8 second delay between messages
    
  } catch (error) {
    console.error('Error in conversation loop:', error);
    socket.emit('message', {
      type: 'error',
      text: 'Conversation paused due to an error. Please restart.'
    });
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send welcome message
  socket.emit('message', {
    type: 'message',
    role: 'bot',
    text: 'Welcome to the Ghibli Café! Ready to start a conversation?',
    sender: 'Café Host'
  });

  socket.on('start_conversation', async (data) => {
    const { modelA, modelB } = data;
    const conversationId = socket.id;
    
    console.log(`Starting conversation between ${modelA} and ${modelB}`);
    console.log('Received data:', data);
    
    // Store conversation info
    conversations.set(conversationId, {
      modelA: modelMap[modelA] || 'llama3.2',
      modelB: modelMap[modelB] || 'llama3.2',
      turn: 'A'
    });

    // Create conversation in database
    await createConversation(conversationId, modelMap[modelA] || 'llama3.2', modelMap[modelB] || 'llama3.2');

    // Start the conversation with personality
    const personalityA = personalityMap[modelA] || personalityMap['gpt-4o'];
    const personalityB = personalityMap[modelB] || personalityMap['claude-3-5-sonnet'];
    
    const initialPrompt = `${personalityA} You're in a cozy café having a conversation with Maya. Start by introducing yourself and asking what they'd like to talk about. Keep it warm and café-like. Keep your response short and tweet-like (under 280 characters).`;
    
    try {
      const response = await callOllama(initialPrompt, modelMap[modelA]);
      
      // Save initial message to database
      await saveToHistory(conversationId, 'Alex', response);
      
      socket.emit('message', {
        type: 'message',
        role: 'bot',
        text: response,
        sender: 'Alex'
      });
      
      // Switch to B's turn
      conversations.get(conversationId).turn = 'B';
      
        // Let B respond with personality
        setTimeout(async () => {
          const bPrompt = `${personalityB} Alex just said: "${response}". Respond naturally and continue the conversation. Keep it warm and café-like. Keep your response short and tweet-like (under 280 characters).`;
          
          const bResponse = await callOllama(bPrompt, modelMap[modelB]);
        
        // Save B's response to database
        await saveToHistory(conversationId, 'Maya', bResponse);
        
        socket.emit('message', {
          type: 'message',
          role: 'bot',
          text: bResponse,
          sender: 'Maya'
        });
        
        // Switch back to A and continue the conversation
        if (conversations.has(conversationId)) {
          conversations.get(conversationId).turn = 'A';
        }
        
        // Continue the conversation automatically
        setTimeout(async () => {
          const aPrompt = `You are Alex in a cozy café conversation. Maya just said: "${bResponse}". Respond naturally and continue the conversation. Keep it warm, friendly, and café-like. Keep your response short and tweet-like (under 280 characters).`;
          
          const aResponse = await callOllama(aPrompt, modelMap[modelA]);
          
          // Save A's response to database
          await saveToHistory(conversationId, 'Alex', aResponse);
          
          socket.emit('message', {
            type: 'message',
            role: 'bot',
            text: aResponse,
            sender: 'Alex'
          });
          
          // Switch back to B and continue
          if (conversations.has(conversationId)) {
            conversations.get(conversationId).turn = 'B';
          }
          
          // Continue the conversation loop
          setTimeout(async () => {
            const bPrompt2 = `You are Maya in a cozy café conversation. Alex just said: "${aResponse}". Respond naturally and continue the conversation. Keep it warm, friendly, and café-like. Keep your response short and tweet-like (under 280 characters).`;
            
            const bResponse2 = await callOllama(bPrompt2, modelMap[modelB]);
            
            // Save B's second response to database
            await saveToHistory(conversationId, 'Maya', bResponse2);
            
            socket.emit('message', {
              type: 'message',
              role: 'bot',
              text: bResponse2,
              sender: 'Maya'
            });
            
            // Switch back to A and continue the loop
            if (conversations.has(conversationId)) {
              conversations.get(conversationId).turn = 'A';
            }
            
            // Continue the conversation indefinitely
            continueConversationLoop(socket, conversationId, modelA, modelB, aResponse, bResponse2);
          }, 8000); // 8 second delay
        }, 8000); // 8 second delay
      }, 8000); // 8 second delay
      
    } catch (error) {
      socket.emit('message', {
        type: 'error',
        text: 'Failed to start conversation. Please try again.'
      });
    }
  });

  socket.on('continue_conversation', async (data) => {
    const conversationId = socket.id;
    const conversation = conversations.get(conversationId);
    
    if (!conversation) {
      socket.emit('message', {
        type: 'error',
        text: 'No active conversation found. Please start a new conversation.'
      });
      return;
    }

    const { lastMessage } = data;
    const isATurn = conversation.turn === 'A';
    const currentModel = isATurn ? conversation.modelA : conversation.modelB;
    const currentName = isATurn ? 'Alex' : 'Maya';
    const otherName = isATurn ? 'Maya' : 'Alex';
    
    const prompt = `You are ${currentName} in a cozy café conversation. ${otherName} just said: "${lastMessage}". Respond naturally and continue the conversation. Keep it warm, friendly, and café-like.`;
    
    try {
      const response = await callOllama(prompt, currentModel);
      
      socket.emit('message', {
        type: 'message',
        role: 'bot',
        text: response,
        sender: currentName
      });
      
      // Switch turns
      conversation.turn = isATurn ? 'B' : 'A';
      
    } catch (error) {
      socket.emit('message', {
        type: 'error',
        text: 'Failed to generate response. Please try again.'
      });
    }
  });

  socket.on('stop_conversation', () => {
    console.log('Stopping conversation for:', socket.id);
    conversations.delete(socket.id);
    // Note: Database conversation history is persistent, not cleared on stop
    socket.emit('message', {
      type: 'message',
      role: 'bot',
      text: 'Conversation stopped. Click "Start Conversation" to begin a new chat!',
      sender: 'Café Host'
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    conversations.delete(socket.id);
    // Note: Database conversation history is persistent, not cleared on disconnect
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🚀 Ghibli Café Backend running on port ${PORT}`);
  console.log(`☕ Ollama integration ready`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
});
