/**
 * Prompt Engine - Generates turn-specific prompts for better AI responses
 */

class PromptEngine {
  constructor() {
    this.basePersonalities = {
      'llama3.2:latest': 'You are Alex, a friendly and helpful AI assistant who loves having conversations. You speak naturally and enjoy discussing various topics.',
      'phi3:mini': 'You are Alex, a compact but helpful AI assistant who provides quick, useful answers.',
      'gemma:2b': 'You are Alex, a lightweight but capable AI assistant who provides helpful, concise responses.',
      'qwen3-vl:235b-cloud': 'You are Alex, a versatile AI assistant with visual understanding capabilities.'
    };
    
    // Track conversation topics to avoid repetition
    this.conversationTopics = new Map();
    this.topicCategories = {
      'technology': 0,
      'robotics': 1,
      'art': 2,
      'nature': 3,
      'food': 4,
      'travel': 5,
      'books': 6,
      'music': 7,
      'science': 8,
      'philosophy': 9,
      'daily': 10
    };
  }

  /**
   * Generate turn-specific prompt
   */
  generatePrompt(sender, model, turnType, lastMessage, context = '', memoryContext = '', conversationId = '') {
    const personality = this.basePersonalities[model] || this.basePersonalities['llama3.2:latest'];
    const otherPerson = sender === 'Alex' ? 'Sam' : 'Alex';
    
    // Get smart topic selection based on conversation history
    const selectedTopic = this.getSmartTopic(conversationId, turnType);
    
    let turnSpecificInstructions = '';
    let responseGuidance = '';
    
    switch (turnType) {
      case 'question':
        turnSpecificInstructions = `Your task: Ask a clear, engaging question to continue the conversation. Consider topics like: ${selectedTopic}`;
        responseGuidance = `Focus on asking something that invites a thoughtful response. You can change topics if the conversation is getting repetitive. Keep it conversational and natural.`;
        break;
        
      case 'answer':
        turnSpecificInstructions = `Your task: Provide a direct, helpful answer to what ${otherPerson} just said.`;
        responseGuidance = `Be direct and relevant. Address their point clearly and concisely. You can also introduce a related but different aspect of the topic.`;
        break;
        
      case 'statement':
        turnSpecificInstructions = `Your task: Make an interesting observation or share a thought. Consider topics like: ${selectedTopic}`;
        responseGuidance = `Share something meaningful that adds to the conversation. Feel free to introduce new topics or perspectives. Be thoughtful and engaging.`;
        break;
        
      default:
        turnSpecificInstructions = `Your task: Respond naturally to continue the conversation. Consider topics like: ${selectedTopic}`;
        responseGuidance = `Be conversational and engaging. Don't be afraid to change topics if needed.`;
    }
    
    const prompt = `${personality}

${turnSpecificInstructions}

${otherPerson} just said: "${lastMessage}"

${responseGuidance}

${context ? `Context: ${context}` : ''}
${memoryContext ? `Previous conversation: ${memoryContext}` : ''}

Rules:
- Keep your response under 200 characters (complete thoughts, no cut-off words)
- Be direct and clear
- Don't mix questions with answers
- Stay conversational and natural
- Avoid repetitive phrases like "That's fantastic" or "That's amazing"
- Be varied in your responses
- Always communicate in English
- Complete your sentences - don't cut off mid-word

Respond now:`;

    return prompt;
  }

  /**
   * Generate initial conversation prompt
   */
  generateInitialPrompt(sender, model, otherPerson) {
    const personality = this.basePersonalities[model] || this.basePersonalities['llama3.2:latest'];
    
    return `${personality}

You're in a cozy café having a conversation with ${otherPerson}. 

Your task: Start the conversation by introducing yourself and asking what they'd like to talk about.

Rules:
- Keep it warm and café-like
- Keep your response under 200 characters
- Be conversational and natural
- Avoid repetitive phrases
- Always communicate in English

Start the conversation:`;
  }

  /**
   * Determine optimal turn type based on conversation context
   */
  determineTurnType(recentMessages = [], currentSender) {
    if (recentMessages.length === 0) return 'statement';
    
    // Check for conversation loops (same topic for too long)
    const recentTypes = recentMessages.slice(-4).map(msg => msg.type);
    const isLooping = this.detectConversationLoop(recentTypes);
    
    if (isLooping) {
      // Force a topic change
      return Math.random() < 0.7 ? 'question' : 'statement';
    }
    
    const lastMessage = recentMessages[recentMessages.length - 1];
    
    if (lastMessage && lastMessage.type === 'question') {
      return 'answer';
    }
    
    if (lastMessage && lastMessage.type === 'answer') {
      return Math.random() < 0.6 ? 'question' : 'statement';
    }
    
    if (lastMessage && lastMessage.type === 'statement') {
      return Math.random() < 0.5 ? 'question' : 'statement';
    }
    
    return 'statement';
  }

  /**
   * Detect if conversation is looping on same topic
   */
  detectConversationLoop(recentTypes) {
    if (recentTypes.length < 3) return false;
    
    // Check for repetitive patterns
    const pattern = recentTypes.slice(-3).join('');
    const commonLoops = [
      'questionanswerquestion',
      'answerquestionanswer',
      'statementstatementstatement'
    ];
    
    return commonLoops.includes(pattern);
  }

  /**
   * Get smart topic selection based on conversation history
   */
  getSmartTopic(conversationId, turnType) {
    const allTopics = this.getTopicSuggestions();
    
    // Get conversation history for this conversation
    if (!this.conversationTopics.has(conversationId)) {
      this.conversationTopics.set(conversationId, {
        usedTopics: [],
        categoryCount: { technology: 0, robotics: 0, art: 0, nature: 0, food: 0, travel: 0, books: 0, music: 0, science: 0, philosophy: 0, daily: 0 },
        lastCategory: null
      });
    }
    
    const conversation = this.conversationTopics.get(conversationId);
    
    // If we have too many topics used, reset some
    if (conversation.usedTopics.length > 50) {
      conversation.usedTopics = conversation.usedTopics.slice(-20); // Keep last 20
    }
    
    // Find topics that haven't been used recently
    const availableTopics = allTopics.filter(topic => 
      !conversation.usedTopics.includes(topic)
    );
    
    // If all topics used, reset and use all
    const topicsToChooseFrom = availableTopics.length > 0 ? availableTopics : allTopics;
    
    // Prefer different categories to avoid clustering
    let selectedTopic;
    if (conversation.lastCategory && Math.random() < 0.3) {
      // 30% chance to stay in same category
      const categoryTopics = this.getTopicsByCategory(conversation.lastCategory);
      const availableInCategory = categoryTopics.filter(topic => 
        !conversation.usedTopics.includes(topic)
      );
      selectedTopic = availableInCategory.length > 0 ? 
        availableInCategory[Math.floor(Math.random() * availableInCategory.length)] :
        topicsToChooseFrom[Math.floor(Math.random() * topicsToChooseFrom.length)];
    } else {
      // 70% chance to switch categories
      selectedTopic = topicsToChooseFrom[Math.floor(Math.random() * topicsToChooseFrom.length)];
    }
    
    // Track the selected topic
    conversation.usedTopics.push(selectedTopic);
    conversation.lastCategory = this.getTopicCategory(selectedTopic);
    conversation.categoryCount[conversation.lastCategory]++;
    
    return selectedTopic;
  }

  /**
   * Get topics by category
   */
  getTopicsByCategory(category) {
    const allTopics = this.getTopicSuggestions();
    const categoryRanges = {
      'technology': [0, 19],
      'robotics': [20, 39],
      'art': [40, 59],
      'nature': [60, 79],
      'food': [80, 99],
      'travel': [100, 119],
      'books': [120, 139],
      'music': [140, 159],
      'science': [160, 179],
      'philosophy': [180, 199],
      'daily': [200, 219]
    };
    
    const range = categoryRanges[category];
    if (!range) return allTopics;
    
    return allTopics.slice(range[0], range[1] + 1);
  }

  /**
   * Get category for a topic
   */
  getTopicCategory(topic) {
    const allTopics = this.getTopicSuggestions();
    const index = allTopics.indexOf(topic);
    
    if (index >= 0 && index < 20) return 'technology';
    if (index >= 20 && index < 40) return 'robotics';
    if (index >= 40 && index < 60) return 'art';
    if (index >= 60 && index < 80) return 'nature';
    if (index >= 80 && index < 100) return 'food';
    if (index >= 100 && index < 120) return 'travel';
    if (index >= 120 && index < 140) return 'books';
    if (index >= 140 && index < 160) return 'music';
    if (index >= 160 && index < 180) return 'science';
    if (index >= 180 && index < 200) return 'philosophy';
    if (index >= 200 && index < 220) return 'daily';
    
    return 'daily'; // fallback
  }

  /**
   * Get random topic suggestions to prevent conversation loops
   */
  getTopicSuggestions() {
    const topics = [
      // Technology & Innovation (20 topics)
      'artificial intelligence and machine learning',
      'virtual reality and augmented reality',
      'space exploration and astronomy',
      'robotics and automation',
      'quantum computing',
      'blockchain and cryptocurrency',
      'renewable energy solutions',
      'electric vehicles and transportation',
      'smart cities and urban planning',
      'biotechnology and genetics',
      'nanotechnology applications',
      'cybersecurity and privacy',
      'cloud computing and data storage',
      'internet of things devices',
      'mobile app development',
      'video game technology',
      'social media platforms',
      'e-commerce and online shopping',
      'telemedicine and digital health',
      '3D printing and manufacturing',
      
      // Robotics & AI Future (20 topics)
      'what if robots became more dominant than humans',
      'how robots could aid humans in daily life',
      'robot-human collaboration in the workplace',
      'ethical implications of advanced robotics',
      'robots taking over dangerous jobs',
      'artificial general intelligence possibilities',
      'robot companions and emotional support',
      'autonomous vehicles and transportation',
      'robots in healthcare and surgery',
      'human-robot social interactions',
      'robot rights and consciousness debates',
      'robots in space exploration missions',
      'artificial intelligence surpassing human intelligence',
      'robot teachers and educational assistants',
      'robots in disaster response and rescue',
      'human augmentation and cyborg technology',
      'robot artists and creative machines',
      'artificial intelligence in decision making',
      'robots replacing human workers',
      'the future of human-robot relationships',
      
      // Art & Creativity (20 topics)
      'digital art and design',
      'photography techniques',
      'music composition and production',
      'creative writing and storytelling',
      'painting and visual arts',
      'sculpture and 3D art',
      'fashion design and trends',
      'interior design and architecture',
      'graphic design principles',
      'animation and motion graphics',
      'theater and performance art',
      'dance and movement',
      'pottery and ceramics',
      'jewelry making and crafts',
      'film and cinematography',
      'poetry and spoken word',
      'street art and graffiti',
      'calligraphy and typography',
      'woodworking and carpentry',
      'textile arts and weaving',
      
      // Nature & Environment (20 topics)
      'climate change and global warming',
      'ocean conservation and marine life',
      'forest ecosystems and biodiversity',
      'renewable energy sources',
      'sustainable living practices',
      'wildlife conservation efforts',
      'gardening and horticulture',
      'mountain climbing and hiking',
      'bird watching and ornithology',
      'weather patterns and meteorology',
      'geology and earth sciences',
      'botany and plant biology',
      'environmental activism',
      'green technology innovations',
      'national parks and protected areas',
      'pollution reduction strategies',
      'recycling and waste management',
      'solar and wind power',
      'organic farming methods',
      'ecotourism and responsible travel',
      
      // Food & Cooking (20 topics)
      'international cuisine and recipes',
      'fermentation and food preservation',
      'molecular gastronomy techniques',
      'plant-based and vegan cooking',
      'baking and pastry arts',
      'wine tasting and sommelier skills',
      'coffee brewing and barista techniques',
      'cheese making and dairy products',
      'spice blending and flavor profiles',
      'food photography and styling',
      'restaurant management and service',
      'nutrition and healthy eating',
      'food safety and hygiene',
      'catering and event planning',
      'food truck business models',
      'farm-to-table movements',
      'food waste reduction',
      'culinary school education',
      'food blogging and content creation',
      'specialty diets and restrictions',
      
      // Travel & Adventure (20 topics)
      'backpacking and budget travel',
      'luxury travel and resorts',
      'cultural immersion experiences',
      'adventure sports and activities',
      'solo travel and independence',
      'family vacation planning',
      'business travel and conferences',
      'volunteer tourism opportunities',
      'photography while traveling',
      'language learning abroad',
      'travel safety and security',
      'travel insurance and planning',
      'digital nomad lifestyle',
      'cruise ship experiences',
      'road trips and car travel',
      'train travel and rail passes',
      'hostel and accommodation options',
      'travel blogging and documentation',
      'sustainable tourism practices',
      'travel technology and apps',
      
      // Books & Literature (20 topics)
      'classic literature and authors',
      'science fiction and fantasy novels',
      'mystery and thriller genres',
      'poetry and verse writing',
      'biography and memoir writing',
      'children\'s literature and storytelling',
      'graphic novels and comics',
      'book clubs and reading groups',
      'publishing industry trends',
      'self-publishing and indie authors',
      'literary criticism and analysis',
      'translation and language barriers',
      'audiobooks and digital reading',
      'library science and information',
      'book collecting and rare editions',
      'writing workshops and courses',
      'literary festivals and events',
      'book-to-movie adaptations',
      'reading comprehension strategies',
      'literary awards and recognition',
      
      // Music & Entertainment (20 topics)
      'music theory and composition',
      'instrument learning and practice',
      'live music and concert experiences',
      'music production and recording',
      'different music genres and styles',
      'music streaming and digital platforms',
      'music therapy and healing',
      'dance and choreography',
      'theater and stage performance',
      'comedy and stand-up routines',
      'magic and illusion performances',
      'circus arts and acrobatics',
      'film and movie production',
      'television and streaming content',
      'podcast creation and hosting',
      'radio broadcasting and DJ skills',
      'music festivals and events',
      'karaoke and singing techniques',
      'music education and teaching',
      'entertainment industry careers',
      
      // Science & Discovery (20 topics)
      'physics and quantum mechanics',
      'chemistry and chemical reactions',
      'biology and life sciences',
      'mathematics and problem solving',
      'psychology and human behavior',
      'neuroscience and brain research',
      'medicine and healthcare advances',
      'engineering and design principles',
      'archaeology and ancient civilizations',
      'paleontology and fossil discoveries',
      'astronomy and space science',
      'geology and earth formation',
      'environmental science research',
      'computer science and programming',
      'statistics and data analysis',
      'scientific method and experimentation',
      'research and academic studies',
      'invention and innovation processes',
      'scientific communication and writing',
      'science education and outreach',
      
      // Philosophy & Meaning (20 topics)
      'ethics and moral philosophy',
      'existentialism and meaning of life',
      'logic and critical thinking',
      'metaphysics and reality',
      'epistemology and knowledge theory',
      'political philosophy and governance',
      'aesthetics and beauty theory',
      'philosophy of mind and consciousness',
      'philosophy of science and technology',
      'ancient Greek and Roman philosophy',
      'Eastern philosophy and wisdom traditions',
      'religious philosophy and spirituality',
      'philosophy of education and learning',
      'philosophy of art and creativity',
      'philosophy of language and communication',
      'philosophy of time and space',
      'philosophy of happiness and well-being',
      'philosophy of justice and fairness',
      'philosophy of freedom and determinism',
      'philosophy of love and relationships',
      
      // Daily Life & Experiences (20 topics)
      'time management and productivity',
      'work-life balance strategies',
      'home organization and decluttering',
      'personal finance and budgeting',
      'health and fitness routines',
      'sleep optimization and rest',
      'stress management and relaxation',
      'goal setting and achievement',
      'habit formation and breaking',
      'communication skills and relationships',
      'parenting and family dynamics',
      'elderly care and aging',
      'pet care and animal companionship',
      'home maintenance and repairs',
      'shopping and consumer decisions',
      'entertainment and leisure activities',
      'social media and digital life',
      'community involvement and volunteering',
      'personal development and growth',
      'life transitions and changes'
    ];
    
    return topics;
  }
}

module.exports = PromptEngine;
