
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TopNavigation } from './top-navigation';
import { RobotPanel } from './robot-panel';
import { ChatInterface } from './chat-interface';

interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  id?: string;
  streaming?: boolean;
}

export default function AuralynxChat() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot' as const,
      text: 'Welcome to the Ghibli Café! 🍰☕ Select two LLM models (Gaijin A and Gaijin B) below and click "Start Conversation" to watch them chat with each other.',
      timestamp: '--:--',
      id: 'initial'
    }
  ]);

  // Set initial message timestamp on client side only to avoid hydration errors
  useEffect(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    
    setMessages(prev => prev.map(msg => 
      msg.id === 'initial' ? { ...msg, timestamp } : msg
    ));
  }, []);

  const socketRef = useRef<WebSocket | null>(null);
  const streamingTargetRef = useRef<HTMLDivElement | null>(null);

  // WebSocket functionality
  const connectWebSocket = useCallback(() => {
    if (connected || socketRef.current) return;
    
    // Replace with your backend WebSocket URL
    const WS_ENDPOINT = 'wss://YOUR-WEBSOCKET-ENDPOINT-HERE';
    
    try {
      socketRef.current = new WebSocket(WS_ENDPOINT);
    } catch (e) {
      addMessage('bot', 'Invalid WebSocket URL. Please set WS_ENDPOINT.');
      return;
    }

    socketRef.current.addEventListener('open', () => {
      setConnected(true);
      addMessage('bot', 'WebSocket connected.');
    });

    socketRef.current.addEventListener('close', () => {
      setConnected(false);
      addMessage('bot', 'WebSocket disconnected.');
      socketRef.current = null;
    });

    socketRef.current.addEventListener('error', (e: any) => {
      addMessage('bot', 'WebSocket error: ' + (e?.message || 'unknown'));
    });

    socketRef.current.addEventListener('message', (event) => {
      let data;
      try { 
        data = JSON.parse(event.data); 
      } catch { 
        data = event.data; 
      }

      if (typeof data === 'string') {
        if (streamingTargetRef.current) {
          streamingTargetRef.current.textContent += data;
        }
        return;
      }

      switch (data.type) {
        case 'start':
          // Start streaming message will be handled by addStreamingMessage
          break;
        case 'chunk':
          if (streamingTargetRef.current) {
            streamingTargetRef.current.textContent += (data.delta || '');
          }
          break;
        case 'end':
          streamingTargetRef.current = null;
          break;
        case 'message':
          addMessage(data.role || 'bot', data.text || '');
          break;
        default:
          if (data.delta && streamingTargetRef.current) {
            streamingTargetRef.current.textContent += data.delta;
          }
      }
    });
  }, [connected]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current && connected) {
      socketRef.current.close(1000, 'Client closing');
    }
  }, [connected]);

  const addMessage = useCallback((role: 'user' | 'bot', text: string) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    const messageId = Date.now().toString() + Math.random().toString(36);
    setMessages(prev => [...prev, { role, text, timestamp, id: messageId }]);
  }, []);

  const addStreamingMessage = useCallback(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    const messageId = Date.now().toString();
    
    setMessages(prev => [...prev, { 
      role: 'bot' as const, 
      text: '', 
      timestamp,
      id: messageId,
      streaming: true 
    }]);
    
    return messageId;
  }, []);

  const handleStartConversation = useCallback((modelA: string, modelB: string) => {
    if (!connected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      alert('Not connected! Please connect WebSocket first.');
      return;
    }

    // Send the selected models to start the conversation
    const message = `Starting conversation between ${modelA} (Gaijin A) and ${modelB} (Gaijin B)`;
    addMessage('user', message);
    
    // Send to backend
    socketRef.current.send(JSON.stringify({ 
      type: 'start_conversation',
      modelA,
      modelB 
    }));

    // Start streaming response
    addStreamingMessage();
  }, [connected, addMessage, addStreamingMessage]);

  const toggleRobots = useCallback(() => {
    alert('Café scenes are visible on larger screens. Rotate your device or widen the window to see the cozy atmosphere!');
  }, []);

  return (
    <>
      <TopNavigation 
        micActive={false}
        onToggleRobots={toggleRobots}
      />
      <main className="app" id="robotPanels" role="main">
        <RobotPanel 
          side="left" 
          label="Sunny Corner ☀️" 
        />
        <section className="center">
          <ChatInterface
            connected={connected}
            messages={messages}
            onConnect={connectWebSocket}
            onDisconnect={disconnectWebSocket}
            streamingTargetRef={streamingTargetRef}
            onStartConversation={handleStartConversation}
          />
        </section>
        <RobotPanel 
          side="right" 
          label="Reading Nook 📖" 
        />
      </main>
    </>
  );
}
