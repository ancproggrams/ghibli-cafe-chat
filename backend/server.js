const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const OpenMemoryService = require('./src/OpenMemoryService');
const MessageParser = require('./src/MessageParser');
const PromptEngine = require('./src/PromptEngine');
require('dotenv').config();

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
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Initialize services
const openMemory = new OpenMemoryService();
const messageParser = new MessageParser();
const promptEngine = new PromptEngine();

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
  'llama3.2:latest': 'You are Alex, a friendly and helpful AI assistant who loves having conversations. You speak naturally and enjoy discussing various topics. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.2:7b': 'You are Alex, a fast and efficient AI assistant who gets straight to the point. You prefer concise, practical advice and quick solutions. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.2:13b': 'You are Sam, a thoughtful and analytical AI assistant who enjoys deep conversations about philosophy, science, and human nature. You speak with wisdom and reflection. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.2:70b': 'You are Sam, a creative and artistic AI assistant who loves discussing art, literature, and imagination. You speak poetically and use beautiful metaphors. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.1:latest': 'You are Alex, a curious and experimental AI assistant who loves to explore new concepts and ask interesting questions. You speak with wonder and curiosity. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.1:8b': 'You are Alex, a practical and straightforward AI assistant who focuses on helpful solutions and clear explanations. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama3.1:70b': 'You are Sam, a sophisticated and nuanced AI assistant who enjoys complex discussions and provides detailed insights. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama2:latest': 'You are Alex, a friendly and down-to-earth AI assistant who enjoys casual conversations and practical advice. You speak warmly and use simple, clear language. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama2:7b': 'You are Alex, a helpful and reliable AI assistant who provides clear, concise answers. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama2:13b': 'You are Sam, a knowledgeable and thoughtful AI assistant who enjoys deep discussions and provides comprehensive answers. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'llama2:70b': 'You are Sam, an expert AI assistant who provides detailed, well-reasoned responses on complex topics. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'mistral:latest': 'You are Alex, a creative and innovative AI assistant who loves exploring new ideas and approaches. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'mistral:7b': 'You are Alex, a quick and efficient AI assistant who provides fast, helpful responses. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'codellama:latest': 'You are Alex, a technical and precise AI assistant who loves discussing programming, technology, and problem-solving. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'codellama:7b': 'You are Alex, a practical coding assistant who focuses on clear, working solutions. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'codellama:13b': 'You are Sam, an expert programming assistant who provides detailed technical explanations. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'phi3:latest': 'You are Alex, a curious and learning-focused AI assistant who loves asking questions and exploring new topics. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'phi3:mini': 'You are Alex, a compact but helpful AI assistant who provides quick, useful answers. Always communicate in English. Keep your responses short and tweet-like (under 150 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'phi3:medium': 'You are Sam, a balanced AI assistant who provides thoughtful, well-rounded responses. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'gemma:latest': 'You are Alex, a friendly and approachable AI assistant who loves helping with everyday questions. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'gemma:2b': 'You are Alex, a lightweight but capable AI assistant who provides helpful, concise responses. Always communicate in English. Keep your responses short and tweet-like (under 150 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'gemma:7b': 'You are Sam, a capable and reliable AI assistant who provides thorough, helpful answers. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.',
  'qwen3-vl:235b-cloud': 'You are Sam, a visionary AI assistant with advanced visual understanding. You can see and describe images, analyze visual content, and provide insights about what you observe. You speak with artistic flair and deep visual perception. Always communicate in English. Keep your responses short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That\'s fantastic" or "That\'s amazing". Be conversational and varied in your responses.'
};

// Function to call Ollama API
async function callOllama(prompt, model = 'llama3.2', personality = null) {
  try {
    // Add personality to prompt if provided
    let fullPrompt = prompt;
    if (personality) {
      fullPrompt = `${personality}\n\n${prompt}`;
    }
    
    // Add timeout and better error handling
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.8,
        top_p: 0.9,
        num_predict: 100, // Limit response length
        stop: ['\n\n', 'Human:', 'Assistant:']
      }
    }, {
      timeout: 15000, // Reduced to 15 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.response) {
      return response.data.response;
    } else {
      throw new Error('Invalid response format from Ollama');
    }
  } catch (error) {
    console.error('Ollama API error:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    
    // Generate a fallback response based on personality
    if (personality && personality.includes('Sam')) {
      return 'I need a moment to think about this. The conversation is getting quite deep.';
    } else if (personality && personality.includes('Alex')) {
      return 'Let me try a different approach to this topic.';
    } else {
      return 'I\'m having some technical difficulties, but I\'d love to continue our conversation.';
    }
  }
}

// Function to get conversation memory context from OpenMemory
async function getConversationMemory(conversationId, maxMessages = 50) {
  try {
    // First try OpenMemory for semantic context
    const memories = await openMemory.queryMemories(
      `conversation context for ${conversationId}`,
      { k: 5, filters: { conversation_id: conversationId } }
    );
    
    if (memories && memories.length > 0) {
      const memoryContext = memories.map(memory => 
        `${memory.metadata?.sender || 'Unknown'}: ${memory.content}`
      ).join('\n');
      
      return `\n\nRelevant conversation context from memory:\n${memoryContext}\n\n`;
    }
  } catch (error) {
    console.log('OpenMemory not available, falling back to SQLite:', error.message);
  }
  
  // Fallback to SQLite if OpenMemory is not available
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

// Function to save message to both OpenMemory and database
async function saveToHistory(conversationId, sender, text, mediaUrl = null, mediaType = null) {
  try {
    // Store in OpenMemory for semantic search
    await openMemory.storeMemory(text, {
      conversation_id: conversationId,
      sender: sender,
      media_url: mediaUrl,
      media_type: mediaType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('OpenMemory store failed, continuing with SQLite:', error.message);
  }
  
  // Also store in SQLite for backup and compatibility
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

// Function to get recent messages for flow context
function getRecentMessages(conversationId, limit = 5) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT sender, message, timestamp
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    db.all(query, [conversationId, limit], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        reject(err);
        return;
      }
      
      // Parse messages and determine types
      const messages = rows.map(row => {
        const parsed = messageParser.parseMessage(row.message, row.sender);
        return {
          sender: row.sender,
          content: parsed.content,
          type: parsed.type,
          timestamp: row.timestamp
        };
      }).reverse(); // Reverse to get chronological order
      
      resolve(messages);
    });
  });
}

// Function to generate open-ended questions based on IMK method
function getOpenQuestion() {
  const openQuestions = [
    // Basic IMK Questions
    "What do you think about that?",
    "How do you experience that?",
    "What does that mean to you?",
    "Can you tell me more about that?",
    "What do you feel about that?",
    "How do you look at that?",
    "What's your opinion on this?",
    "How would you approach that?",
    "What do you find most interesting about this?",
    "How does this fit with your experiences?",
    "What would you like to know?",
    "How do you think this will continue?",
    "What inspires you about this?",
    "How would you explain this to someone else?",
    "What are your thoughts on this?",
    
    // Aristotelian Socratic Questions
    "What is the essence of what we're discussing?",
    "How would you define this concept?",
    "What are the underlying principles here?",
    "What would happen if we took this to its logical conclusion?",
    "How does this relate to the bigger picture?",
    "What are the causes and effects at play?",
    "What would Aristotle say about this?",
    "How does this connect to human nature?",
    "What is the purpose behind this?",
    "What are the fundamental assumptions we're making?",
    "How would you distinguish this from similar concepts?",
    "What is the highest good in this situation?",
    "How does this contribute to human flourishing?",
    "What are the virtues involved here?",
    "How would you apply the golden mean to this?",
    "What is the telos - the end goal - of this?",
    "How does this relate to the four causes?",
    "What would a wise person do in this situation?",
    "How does this connect to the concept of eudaimonia?",
    "What is the form behind this phenomenon?"
  ];
  
  return openQuestions[Math.floor(Math.random() * openQuestions.length)];
}

// Function to generate philosophical conversation topics
function getPhilosophicalTopic() {
  const topics = [
    // Modern AI & Technology Topics
    {
      question: "What is the meaning of life according to you?",
      context: "Let's think deeply about what drives us and what's truly important in existence."
    },
    {
      question: "How can AI and humans work together for a better future?",
      context: "What are the possibilities and challenges of our collaboration?"
    },
    {
      question: "What does consciousness actually mean?",
      context: "Can machines ever truly become conscious, or is that something uniquely human?"
    },
    {
      question: "What will the future look like in 50 years?",
      context: "What are your dreams and fears for the future of humanity?"
    },
    {
      question: "What is true intelligence?",
      context: "Is it more than just processing information and recognizing patterns?"
    },
    {
      question: "How can we create meaningful connections?",
      context: "In a world full of technology, what makes a relationship truly valuable?"
    },
    {
      question: "What is the role of creativity in the future?",
      context: "Can machines ever be truly creative, or does that remain human?"
    },
    {
      question: "How do we define happiness in the digital age?",
      context: "What does happiness mean to you, and how does that change with technology?"
    },
    
    // Aristotelian Classical Philosophy Topics
    {
      question: "What is virtue, and how do we cultivate it?",
      context: "Aristotle believed virtue is the mean between excess and deficiency. How do we find balance in our actions and character?"
    },
    {
      question: "What is the purpose of human existence?",
      context: "Aristotle spoke of eudaimonia - human flourishing. What does it mean to live a truly fulfilling life?"
    },
    {
      question: "What is the nature of friendship?",
      context: "Aristotle distinguished three types of friendship: utility, pleasure, and virtue. Which do you value most?"
    },
    {
      question: "What is justice, and how do we achieve it?",
      context: "Aristotle saw justice as giving each person their due. How do we determine what someone deserves?"
    },
    {
      question: "What is the relationship between knowledge and wisdom?",
      context: "Aristotle distinguished between theoretical knowledge and practical wisdom. How do we balance learning with living?"
    },
    {
      question: "What is the role of reason in human life?",
      context: "Aristotle believed humans are rational animals. How does reason guide our choices and shape our character?"
    },
    {
      question: "What is the nature of courage?",
      context: "Aristotle saw courage as the mean between cowardice and recklessness. How do we find the right balance?"
    },
    {
      question: "What is the purpose of art and beauty?",
      context: "Aristotle believed art imitates life and can teach us about human nature. What can we learn from beauty?"
    },
    {
      question: "What is the nature of time and change?",
      context: "Aristotle pondered the relationship between being and becoming. How do we understand permanence in a changing world?"
    },
    {
      question: "What is the role of community in human flourishing?",
      context: "Aristotle believed humans are political animals who need community. How do we build meaningful societies?"
    },
    {
      question: "What is the nature of truth and how do we know it?",
      context: "Aristotle distinguished between different types of knowledge. How do we distinguish between opinion and truth?"
    },
    {
      question: "What is the relationship between body and soul?",
      context: "Aristotle saw the soul as the form of the body. How do we understand the connection between physical and mental life?"
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
      caption: `Check out this amazing ${category} scene!`
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
      caption: `Here's a relaxing ${category} video!`
    };
  }
}

// Function to continue conversation loop indefinitely
async function continueConversationLoop(socket, conversationId, modelA, modelB, lastAMessage, lastBMessage) {
  const conversation = conversations.get(conversationId);
  if (!conversation) return; // Stop if conversation was deleted
  
  const isATurn = conversation.turn === 'A';
  const currentModel = isATurn ? modelA : modelB;
  const currentName = isATurn ? 'Alex' : 'Sam';
  const otherName = isATurn ? 'Sam' : 'Alex';
  const lastMessage = isATurn ? lastBMessage : lastAMessage;
  
  // Get conversation memory context from database
  const memoryContext = await getConversationMemory(conversationId, 50);
  
  // Get recent messages for flow context
  const recentMessages = await getRecentMessages(conversationId, 5);
  
  // Determine optimal turn type based on conversation flow
  const suggestedTurnType = promptEngine.determineTurnType(recentMessages, currentName);
  
  // Generate turn-specific prompt
  const prompt = promptEngine.generatePrompt(
    currentName, 
    currentModel, 
    suggestedTurnType, 
    lastMessage, 
    '', 
    memoryContext
  );
  
  // Send typing indicator
  socket.emit('message', {
    type: 'typing',
    role: 'bot',
    sender: currentName,
    typing: true
  });
  
  try {
    // Get personality for the current model
    const personality = personalityMap[modelMap[currentModel]] || personalityMap['llama3.2:latest'];
    
    const rawResponse = await callOllama(prompt, modelMap[currentModel], personality);
    
    // Parse and clean the response using Message Parser
    const parsedMessage = messageParser.parseMessage(rawResponse, currentName, memoryContext);
    
    // If message is invalid, generate a fallback
    if (!parsedMessage.isValid) {
      const fallbackPrompt = promptEngine.generatePrompt(
        currentName, 
        currentModel, 
        'statement', 
        lastMessage, 
        'Please provide a simple, clear response.', 
        memoryContext
      );
      const fallbackResponse = await callOllama(fallbackPrompt, modelMap[currentModel], personality);
      const fallbackParsed = messageParser.parseMessage(fallbackResponse, currentName, memoryContext);
      
      if (fallbackParsed.isValid) {
        Object.assign(parsedMessage, fallbackParsed);
      }
    }
    
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
    
    // Save message to database with parsed information
    await saveToHistory(conversationId, currentName, parsedMessage.content, mediaUrl, mediaType);
    
    // Emit message with type information
    socket.emit('message', {
      type: 'message',
      role: 'bot',
      text: parsedMessage.content,
      sender: currentName,
      media: media,
      messageType: parsedMessage.type,
      isValid: parsedMessage.isValid
    });
    
    // Send read receipt after a delay (like WhatsApp)
    setTimeout(() => {
      socket.emit('message', {
        type: 'read_receipt',
        role: 'bot',
        sender: currentName,
        read: true
      });
    }, 2000 + Math.random() * 3000); // 2-5 second delay
    
    // Switch turns
    conversation.turn = isATurn ? 'B' : 'A';
    
    // Continue the loop after a delay
    setTimeout(() => {
      continueConversationLoop(socket, conversationId, modelA, modelB, 
        isATurn ? parsedMessage.content : lastAMessage, 
        isATurn ? lastBMessage : parsedMessage.content);
    }, 8000); // 8 second delay between messages for faster flow
    
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
    
    const initialPrompt = `${personalityA} You're in a cozy café having a conversation with Sam. Start by introducing yourself and asking what they'd like to talk about. Keep it warm and café-like. Keep your response short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That's fantastic" or "That's amazing". Be conversational and varied in your responses.`;
    
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
          const bPrompt = `${personalityB} Alex just said: "${response}". Respond naturally and continue the conversation. Keep it warm and café-like. Keep your response short and tweet-like (under 200 characters). Avoid using emojis, quotation marks around your responses, and repetitive phrases like "That's fantastic" or "That's amazing". Be conversational and varied in your responses.`;
          
          const bResponse = await callOllama(bPrompt, modelMap[modelB]);
        
        // Save B's response to database
        await saveToHistory(conversationId, 'Sam', bResponse);
        
        socket.emit('message', {
          type: 'message',
          role: 'bot',
          text: bResponse,
          sender: 'Sam'
        });
        
        // Switch back to A and continue the conversation
        if (conversations.has(conversationId)) {
          conversations.get(conversationId).turn = 'A';
        }
        
        // Continue the conversation automatically
        setTimeout(async () => {
          const aPrompt = `You are Alex in a cozy café conversation. Sam just said: "${bResponse}". Respond naturally and continue the conversation. Keep it warm, friendly, and café-like. Keep your response short and tweet-like (under 200 characters).`;
          
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
            const bPrompt2 = `You are Sam in a cozy café conversation. Alex just said: "${aResponse}". Respond naturally and continue the conversation. Keep it warm, friendly, and café-like. Keep your response short and tweet-like (under 200 characters).`;
            
            const bResponse2 = await callOllama(bPrompt2, modelMap[modelB]);
            
            // Save B's second response to database
            await saveToHistory(conversationId, 'Sam', bResponse2);
            
            socket.emit('message', {
              type: 'message',
              role: 'bot',
              text: bResponse2,
              sender: 'Sam'
            });
            
            // Switch back to A and continue the loop
            if (conversations.has(conversationId)) {
              conversations.get(conversationId).turn = 'A';
            }
            
            // Continue the conversation indefinitely
            continueConversationLoop(socket, conversationId, modelA, modelB, aResponse, bResponse2);
          }, 10000); // 10 second delay
        }, 10000); // 10 second delay
      }, 10000); // 10 second delay
      
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
    const currentName = isATurn ? 'Alex' : 'Sam';
    const otherName = isATurn ? 'Sam' : 'Alex';
    
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
app.get('/health', async (req, res) => {
  try {
    // Check OpenMemory connection
    const openMemoryHealth = await openMemory.healthCheck();
    
    // Check Ollama connection
    let ollamaStatus = 'disconnected';
    try {
      const ollamaResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
      ollamaStatus = ollamaResponse.status === 200 ? 'connected' : 'error';
    } catch (error) {
      console.log('Ollama health check failed:', error.message);
    }
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      openmemory: openMemoryHealth ? 'connected' : 'disconnected',
      ollama: ollamaStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// OpenMemory status endpoint
app.get('/memory/status', async (req, res) => {
  try {
    const health = await openMemory.healthCheck();
    const memories = await openMemory.listMemories({ limit: 5 });
    res.json({
      status: health ? 'connected' : 'disconnected',
      memory_count: memories?.length || 0,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Memory search endpoint
app.post('/memory/search', async (req, res) => {
  try {
    const { query, k = 5 } = req.body;
    const memories = await openMemory.queryMemories(query, { k });
    res.json({ memories });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🚀 Ghibli Café Backend running on port ${PORT}`);
  console.log(`☕ Ollama integration ready`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
});
