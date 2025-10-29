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
    
    let turnSpecificInstructions = '';
    let responseGuidance = '';
    
    switch (turnType) {
      case 'question':
        turnSpecificInstructions = `Your task: Ask a clear, engaging question to continue the conversation.`;
        responseGuidance = `Focus on asking something that invites a thoughtful response. Keep it conversational and natural.`;
        break;
        
      case 'answer':
        turnSpecificInstructions = `Your task: Provide a direct, helpful answer to what ${otherPerson} just said.`;
        responseGuidance = `Be direct and relevant. Address their point clearly and concisely.`;
        break;
        
      case 'statement':
        turnSpecificInstructions = `Your task: Make an interesting observation or share a thought about the topic.`;
        responseGuidance = `Share something meaningful that adds to the conversation. Be thoughtful and engaging.`;
        break;
        
      default:
        turnSpecificInstructions = `Your task: Respond naturally to continue the conversation.`;
        responseGuidance = `Be conversational and engaging.`;
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
}

module.exports = PromptEngine;
