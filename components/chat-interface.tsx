
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  id?: string;
  streaming?: boolean;
  sender?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
    thumbnail?: string;
    caption?: string;
  };
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
  const [modelA, setModelA] = useState('llama3.2:latest');
  const [modelB, setModelB] = useState('llama3.2:latest');
  const chatStreamRef = useRef<HTMLDivElement>(null);

  // Available Ollama models (only the ones you have downloaded)
  const llmModels = [
    { value: 'llama3.2:latest', label: 'Llama 3.2 (Latest) ✅' },
    { value: 'phi3:mini', label: 'Phi-3 Mini (Lightweight) ✅' },
    // Temporarily disabled due to resource limitations
    // { value: 'qwen3-vl:235b-cloud', label: 'Qwen3-VL 235B (Vision) ✅' },
    // Add more models as you download them with: ollama pull <model-name>
    // { value: 'mistral:latest', label: 'Mistral (Latest)' },
    // { value: 'codellama:latest', label: 'Code Llama (Latest)' },
    // { value: 'phi3:latest', label: 'Phi-3 (Latest)' },
    // { value: 'gemma:latest', label: 'Gemma (Latest)' },
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
              data-sender={message.sender}
            >
              <div className="meta">
                {message.role === 'user' ? 'You' : (message.sender || 'Café Friend')} • {message.timestamp}
              </div>
              <div className="content">{message.text}</div>
              {message.media && (
                <div className="media-content">
                  {message.media.type === 'image' ? (
                    <div className="media-image">
                      <img 
                        src={message.media.url} 
                        alt={message.media.alt || 'Shared image'} 
                        style={{
                          maxWidth: '100%',
                          borderRadius: '8px',
                          marginTop: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE5NSAxNDVIMjA1VjE1NUgxOTVWMjQ1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                        }}
                      />
                      {message.media.caption && (
                        <div className="media-caption" style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>
                          {message.media.caption}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="media-video">
                      <video 
                        controls 
                        poster={message.media.thumbnail}
                        style={{
                          maxWidth: '100%',
                          borderRadius: '8px',
                          marginTop: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        onError={(e) => {
                          (e.target as HTMLVideoElement).poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjExMi41IiByPSI0MCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                        }}
                      >
                        <source src={message.media.url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      {message.media.caption && (
                        <div className="media-caption" style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>
                          {message.media.caption}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <div style={{display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-end'}}>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <label htmlFor="modelA" style={{fontSize: '12px', fontWeight: 600, color: 'var(--warm-dark)'}}>
                Alex
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
                Maya
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
          </div>

          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px'}}>
            <button 
              className="btn" 
              onClick={handleStartConversation}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600
              }}
              aria-label="Start conversation between selected models"
            >
              Start Conversation
            </button>
            <button 
              className="btn outline" 
              onClick={() => {
                // Send stop signal to backend
                if ((window as any).socketRef && (window as any).socketRef.current) {
                  (window as any).socketRef.current.emit('stop_conversation');
                }
              }}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600
              }}
              aria-label="Stop the ongoing conversation"
            >
              Stop Conversation
            </button>
          </div>
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
