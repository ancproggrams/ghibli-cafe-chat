/**
 * Message Parser - Handles AI response parsing, type detection, and content cleaning
 */

class MessageParser {
  constructor() {
    this.questionPatterns = [
      /\?/g,  // Question marks
      /^(what|how|why|when|where|who|which|can|could|would|should|do|does|did|is|are|was|were|will|have|has|had)\b/i,  // Question words
      /^(tell me|explain|describe|share|show me)\b/i,  // Question phrases
    ];
    
    this.answerPatterns = [
      /^(yes|no|sure|certainly|absolutely|definitely|of course|i think|i believe|i feel|i agree|i disagree)\b/i,  // Direct answers
      /^(that's|this is|it's|here's|let me|i'll|i can|i will)\b/i,  // Response starters
      /^(because|since|due to|as a result|therefore|so|thus)\b/i,  // Explanatory words
    ];
    
    this.statementPatterns = [
      /^(i'm|i am|i feel|i think|i believe|i love|i like|i enjoy|i find|i notice|i see|i understand)\b/i,  // Personal statements
      /^(that's|this is|it's|here's|there's|look|see|notice|observe)\b/i,  // Observation statements
      /^(let's|we should|we could|we might|we can|we will|we need)\b/i,  // Suggestion statements
    ];
  }

  /**
   * Parse and clean an AI response
   * @param {string} content - Raw AI response content
   * @param {string} sender - Sender name (Alex or Sam)
   * @param {string} conversationContext - Previous conversation context
   * @returns {Object} Parsed message object
   */
  parseMessage(content, sender, conversationContext = '') {
    if (!content || typeof content !== 'string') {
      return this.createEmptyMessage(sender);
    }

    // Clean the content
    const cleanedContent = this.cleanContent(content);
    
    // Detect message type
    const messageType = this.detectMessageType(cleanedContent, conversationContext);
    
    // Format the message
    const formattedContent = this.formatMessage(cleanedContent, messageType);
    
    return {
      content: formattedContent,
      originalContent: content,
      type: messageType,
      sender: sender,
      timestamp: new Date().toISOString(),
      length: formattedContent.length,
      isValid: this.validateMessage(formattedContent, messageType)
    };
  }

  /**
   * Clean AI response content
   * @param {string} content - Raw content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    if (!content) return '';

    let cleaned = content.trim();
    
    // Remove conflicting instructions
    cleaned = cleaned.replace(/\b(keep your response short|under \d+ characters|avoid using emojis|avoid quotation marks|be conversational|be varied)\b/gi, '');
    
    // Remove repetitive phrases
    cleaned = cleaned.replace(/\b(that's fantastic|that's amazing|that's great|that's wonderful|that's interesting|that's cool)\b/gi, '');
    
    // Remove quotation marks around the entire response
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Remove excessive punctuation
    cleaned = cleaned.replace(/[.]{2,}/g, '.');
    cleaned = cleaned.replace(/[!]{2,}/g, '!');
    cleaned = cleaned.replace(/[?]{2,}/g, '?');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Ensure proper sentence ending
    if (cleaned && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
    
    return cleaned;
  }

  /**
   * Detect message type (question, answer, statement)
   * @param {string} content - Cleaned content
   * @param {string} context - Conversation context
   * @returns {string} Message type
   */
  detectMessageType(content, context = '') {
    if (!content) return 'statement';

    const lowerContent = content.toLowerCase();
    
    // Check for question patterns
    const hasQuestionPattern = this.questionPatterns.some(pattern => pattern.test(lowerContent));
    if (hasQuestionPattern) {
      return 'question';
    }
    
    // Check for answer patterns
    const hasAnswerPattern = this.answerPatterns.some(pattern => pattern.test(lowerContent));
    if (hasAnswerPattern) {
      return 'answer';
    }
    
    // Check for statement patterns
    const hasStatementPattern = this.statementPatterns.some(pattern => pattern.test(lowerContent));
    if (hasStatementPattern) {
      return 'statement';
    }
    
    // Default to statement if no clear pattern
    return 'statement';
  }

  /**
   * Format message based on type
   * @param {string} content - Content to format
   * @param {string} type - Message type
   * @returns {string} Formatted content
   */
  formatMessage(content, type) {
    if (!content) return '';

    let formatted = content.trim();
    
    // Ensure proper length (max 200 characters)
    if (formatted.length > 200) {
      formatted = formatted.substring(0, 197) + '...';
    }
    
    // Type-specific formatting
    switch (type) {
      case 'question':
        // Ensure question ends with ?
        if (!formatted.endsWith('?')) {
          formatted = formatted.replace(/[.!]$/, '') + '?';
        }
        break;
        
      case 'answer':
        // Ensure answer is direct and clear
        if (formatted.startsWith('I think') || formatted.startsWith('I believe')) {
          formatted = formatted.replace(/^(I think|I believe)\s*/i, '');
        }
        break;
        
      case 'statement':
        // Ensure statement ends with proper punctuation
        if (!/[.!?]$/.test(formatted)) {
          formatted += '.';
        }
        break;
    }
    
    return formatted;
  }

  /**
   * Validate message quality
   * @param {string} content - Message content
   * @param {string} type - Message type
   * @returns {boolean} Is valid
   */
  validateMessage(content, type) {
    if (!content || content.length < 3) return false;
    if (content.length > 200) return false;
    
    // Check for empty or meaningless content
    const meaningfulWords = content.split(/\s+/).filter(word => 
      word.length > 2 && !/^(the|and|or|but|in|on|at|to|for|of|with|by)\b/i.test(word)
    );
    
    if (meaningfulWords.length < 2) return false;
    
    return true;
  }

  /**
   * Create empty message for error cases
   * @param {string} sender - Sender name
   * @returns {Object} Empty message object
   */
  createEmptyMessage(sender) {
    return {
      content: 'Sorry, I need a moment to think...',
      originalContent: '',
      type: 'statement',
      sender: sender,
      timestamp: new Date().toISOString(),
      length: 0,
      isValid: false
    };
  }

  /**
   * Get conversation flow context
   * @param {Array} recentMessages - Recent conversation messages
   * @returns {string} Flow context
   */
  getFlowContext(recentMessages = []) {
    if (recentMessages.length === 0) return '';
    
    const lastMessage = recentMessages[recentMessages.length - 1];
    const secondLastMessage = recentMessages[recentMessages.length - 2];
    
    let context = '';
    
    if (lastMessage && lastMessage.type === 'question') {
      context = 'The other person just asked a question. You should provide a direct answer.';
    } else if (lastMessage && lastMessage.type === 'answer') {
      context = 'The other person just answered. You can ask a follow-up question or make a statement.';
    } else if (lastMessage && lastMessage.type === 'statement') {
      context = 'The other person made a statement. You can respond with a question, answer, or related statement.';
    }
    
    return context;
  }
}

module.exports = MessageParser;
