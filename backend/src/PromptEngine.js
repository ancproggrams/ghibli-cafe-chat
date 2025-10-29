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
  }

  /**
   * Generate turn-specific prompt
   */
  generatePrompt(sender, model, turnType, lastMessage, context = '', memoryContext = '') {
    const personality = this.basePersonalities[model] || this.basePersonalities['llama3.2:latest'];
    const otherPerson = sender === 'Alex' ? 'Sam' : 'Alex';
    
    // Add topic variety suggestions
    const topicSuggestions = this.getTopicSuggestions();
    const randomTopic = topicSuggestions[Math.floor(Math.random() * topicSuggestions.length)];
    
    let turnSpecificInstructions = '';
    let responseGuidance = '';
    
    switch (turnType) {
      case 'question':
        turnSpecificInstructions = `Your task: Ask a clear, engaging question to continue the conversation. Consider topics like: ${randomTopic}`;
        responseGuidance = `Focus on asking something that invites a thoughtful response. You can change topics if the conversation is getting repetitive. Keep it conversational and natural.`;
        break;
        
      case 'answer':
        turnSpecificInstructions = `Your task: Provide a direct, helpful answer to what ${otherPerson} just said.`;
        responseGuidance = `Be direct and relevant. Address their point clearly and concisely. You can also introduce a related but different aspect of the topic.`;
        break;
        
      case 'statement':
        turnSpecificInstructions = `Your task: Make an interesting observation or share a thought. Consider topics like: ${randomTopic}`;
        responseGuidance = `Share something meaningful that adds to the conversation. Feel free to introduce new topics or perspectives. Be thoughtful and engaging.`;
        break;
        
      default:
        turnSpecificInstructions = `Your task: Respond naturally to continue the conversation. Consider topics like: ${randomTopic}`;
        responseGuidance = `Be conversational and engaging. Don't be afraid to change topics if needed.`;
    }
    
    const prompt = `${personality}

${turnSpecificInstructions}

${otherPerson} just said: "${lastMessage}"

${responseGuidance}

${context ? `Context: ${context}` : ''}
${memoryContext ? `Previous conversation: ${memoryContext}` : ''}

Rules:
- Keep your response under 200 characters
- Be direct and clear
- Don't mix questions with answers
- Stay conversational and natural
- Avoid repetitive phrases like "That's fantastic" or "That's amazing"
- Be varied in your responses
- Always communicate in English

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
   * Get random topic suggestions to prevent conversation loops
   */
  getTopicSuggestions() {
    const topics = [
      'technology and innovation',
      'art and creativity',
      'nature and environment',
      'food and cooking',
      'travel and adventure',
      'books and literature',
      'music and entertainment',
      'science and discovery',
      'philosophy and meaning',
      'daily life and experiences',
      'future possibilities',
      'memories and nostalgia',
      'dreams and aspirations',
      'learning and growth',
      'relationships and connections'
    ];
    
    return topics;
  }
}

module.exports = PromptEngine;
