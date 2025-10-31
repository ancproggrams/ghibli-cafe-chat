/**
 * Automatic Conversation Recovery Service
 * Handles recovery of failed conversations without data loss
 */
class RecoveryService {
  constructor(db) {
    this.db = db;
    this.recoveryAttempts = new Map(); // conversationId -> attempt count
    this.maxRecoveryAttempts = 3;
    this.recoveryDelay = 5000; // 5 seconds
  }

  /**
   * Save conversation state for recovery
   */
  async saveConversationState(conversationId, state) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO conversation_states 
        (conversation_id, state_data, last_message_id, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(query, [
        conversationId,
        JSON.stringify(state),
        state.lastMessageId || null
      ], function(err) {
        if (err) {
          console.error('[RecoveryService] Error saving state:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get saved conversation state
   */
  async getConversationState(conversationId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT state_data, last_message_id, timestamp
        FROM conversation_states
        WHERE conversation_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      this.db.get(query, [conversationId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            state: JSON.parse(row.state_data),
            lastMessageId: row.last_message_id,
            timestamp: row.timestamp
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Recover conversation after failure
   */
  async recoverConversation(conversationId, failureReason) {
    const attemptCount = this.recoveryAttempts.get(conversationId) || 0;
    
    if (attemptCount >= this.maxRecoveryAttempts) {
      console.log(`[RecoveryService] Max recovery attempts reached for ${conversationId}`);
      return { success: false, reason: 'max_attempts_reached' };
    }

    this.recoveryAttempts.set(conversationId, attemptCount + 1);

    // Get last successful state
    const savedState = await this.getConversationState(conversationId);
    
    if (!savedState) {
      console.log(`[RecoveryService] No saved state found for ${conversationId}`);
      return { success: false, reason: 'no_saved_state' };
    }

    // Get last successful message
    const lastMessage = await this.getLastSuccessfulMessage(conversationId, savedState.lastMessageId);
    
    if (!lastMessage) {
      console.log(`[RecoveryService] No last message found for ${conversationId}`);
      return { success: false, reason: 'no_last_message' };
    }

    console.log(`[RecoveryService] Recovering conversation ${conversationId} from message ${lastMessage.id}`);

    return {
      success: true,
      state: savedState.state,
      lastMessage: lastMessage,
      attemptCount: attemptCount + 1
    };
  }

  /**
   * Get last successful message before failure
   */
  async getLastSuccessfulMessage(conversationId, lastMessageId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, sender, message, timestamp
        FROM messages
        WHERE conversation_id = ? AND id <= ?
        ORDER BY id DESC
        LIMIT 1
      `;
      
      this.db.get(query, [conversationId, lastMessageId || 999999999], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Initialize recovery tables
   */
  initializeTables() {
    return new Promise((resolve, reject) => {
      const query = `
        CREATE TABLE IF NOT EXISTS conversation_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          state_data TEXT NOT NULL,
          last_message_id INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(conversation_id)
        )
      `;
      
      this.db.run(query, (err) => {
        if (err) {
          reject(err);
        } else {
          // Create index
          this.db.run(
            `CREATE INDEX IF NOT EXISTS idx_states_conversation_id ON conversation_states (conversation_id)`,
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        }
      });
    });
  }

  /**
   * Clear recovery attempts for a conversation
   */
  clearRecoveryAttempts(conversationId) {
    this.recoveryAttempts.delete(conversationId);
  }
}

module.exports = RecoveryService;

