
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  id?: string;
  streaming?: boolean;
}

interface ChatInterfaceProps {
  connected: boolean;
  messages: Message[];
  onConnect: () => void;
  onDisconnect: () => void;
  streamingTargetRef: React.MutableRefObject<HTMLDivElement | null>;
  onStartConversation: (modelA: string, modelB: string) => void;
}

export function ChatInterface({
  connected,
  messages,
  onConnect,
  onDisconnect,
  streamingTargetRef,
  onStartConversation
}: ChatInterfaceProps) {
  const [modelA, setModelA] = useState('gpt-4o');
  const [modelB, setModelB] = useState('claude-3-5-sonnet');
  const chatStreamRef = useRef<HTMLDivElement>(null);

  // Available LLM models
  const llmModels = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'llama-3', label: 'Llama 3' },
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages]);

  // Set streaming target for the latest streaming message
  useEffect(() => {
    const streamingMessage = messages.find(msg => msg.streaming);
    if (streamingMessage) {
      const messageElement = document.querySelector(`[data-message-id="${streamingMessage.id}"] .content`);
      streamingTargetRef.current = messageElement as HTMLDivElement;
    }
  }, [messages, streamingTargetRef]);

  const handleStartConversation = () => {
    onStartConversation(modelA, modelB);
  };

  return (
    <div className="chat-wrapper">
      <header>
        <h1 style={{margin: '0 0 8px 0', fontSize: '28px', letterSpacing: '.4px', color: 'var(--warm-dark)'}}>
          Cozy Café Conversations
        </h1>
      </header>

      <article className="chat-surface elev-2" aria-label="Chat interface" role="application">
        <div className="chat-topbar">
          <div className="chat-title">
            <span className="dot" aria-hidden="true"></span>
            <span>Table #7 • Window Seat</span>
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              className="btn outline" 
              onClick={onConnect}
              disabled={connected}
              title="Connect WebSocket"
            >
              Connect
            </button>
            <button 
              className="btn outline" 
              onClick={onDisconnect}
              disabled={!connected}
              title="Disconnect WebSocket"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div 
          className="chat-stream" 
          ref={chatStreamRef}
          role="log" 
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div 
              key={message.id || index} 
              className={`msg ${message.role}`}
              data-message-id={message.id}
            >
              <div className="meta">
                {message.role === 'user' ? 'You' : 'Café Friend'} • {message.timestamp}
              </div>
              <div className="content">{message.text}</div>
            </div>
          ))}
        </div>

        <div className="chat-input" style={{display: 'flex', gap: '12px', alignItems: 'center', padding: '16px'}}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
            <label htmlFor="modelA" style={{fontSize: '12px', fontWeight: 600, color: 'var(--warm-dark)'}}>
              Gaijin A
            </label>
            <select
              id="modelA"
              className="field"
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {llmModels.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
            <label htmlFor="modelB" style={{fontSize: '12px', fontWeight: 600, color: 'var(--warm-dark)'}}>
              Gaijin B
            </label>
            <select
              id="modelB"
              className="field"
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {llmModels.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="btn" 
            onClick={handleStartConversation}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600
            }}
            aria-label="Start conversation between selected models"
          >
            Start Conversation
          </button>
        </div>
      </article>

      <footer style={{display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <span className="chip">Warm Atmosphere ☕</span>
          <span className="chip">Ghibli Vibes 🌿</span>
        </div>
        <small style={{color: 'var(--muted)'}}>© 2025 Ghibli Café • A peaceful corner</small>
      </footer>
    </div>
  );
}
