
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TopNavigation } from './top-navigation';
import { RobotPanel } from './robot-panel';
import { ChatInterface } from './chat-interface';

interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  id?: string;
  streaming?: boolean;
  sender?: string;
}

export default function AuralynxChat() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot' as const,
      text: 'Welcome to the Ghibli Café! 🍰☕ Select two LLM models (Alex and Sam) below and click "Start Conversation" to watch them chat with each other.',
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

  const socketRef = useRef<Socket | null>(null);
  const streamingTargetRef = useRef<HTMLDivElement | null>(null);

  // Socket.io functionality
  const connectWebSocket = useCallback(() => {
    if (connected || socketRef.current) return;
    
    // Backend Socket.io URL
    const SOCKET_ENDPOINT = 'http://localhost:3002';
    
    try {
      socketRef.current = io(SOCKET_ENDPOINT, {
        transports: ['websocket', 'polling']
      });
      
      // Make socketRef available globally for stop button
      (window as any).socketRef = socketRef;
    } catch (e) {
      addMessage('bot', 'Invalid Socket.io URL. Please set SOCKET_ENDPOINT.');
      return;
    }

    socketRef.current.on('connect', () => {
      setConnected(true);
      addMessage('bot', 'Socket.io connected to Ollama backend!');
      console.log('Socket.io connected successfully');
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      addMessage('bot', 'Socket.io disconnected.');
      socketRef.current = null;
    });

    socketRef.current.on('connect_error', (e: any) => {
      console.error('Socket.io connection error:', e);
      addMessage('bot', 'Connection error: ' + (e?.message || 'Failed to connect to backend'));
    });

    socketRef.current.on('error', (e: any) => {
      console.error('Socket.io error:', e);
      addMessage('bot', 'WebSocket error: ' + (e?.message || 'unknown'));
    });

    socketRef.current.on('message', (data: any) => {
      console.log('Received Socket.io message:', data);
      console.log('Parsed data:', data);

      if (typeof data === 'string') {
        if (streamingTargetRef.current) {
          streamingTargetRef.current.textContent += data;
        }
        return;
      }

      switch (data.type) {
        case 'message':
          // Remove typing indicator for this sender before adding the message
          setMessages(prev => prev.filter(msg => !(msg.id?.startsWith(`typing-${data.sender}-`))));
          addMessage(data.role || 'bot', data.text || '', data.sender, data.media);
          break;
        case 'typing':
          addTypingIndicator(data.sender);
          break;
        case 'read_receipt':
          updateReadReceipt(data.sender);
          break;
        case 'error':
          addMessage('bot', data.text || 'An error occurred');
          break;
        default:
          // Handle any other message types
          if (data.text) {
            addMessage(data.role || 'bot', data.text, data.sender, data.media);
          }
      }
    });
  }, [connected]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current && connected) {
      socketRef.current.disconnect();
    }
  }, [connected]);

  const addMessage = useCallback((role: 'user' | 'bot', text: string, sender?: string, media?: any) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    const messageId = Date.now().toString() + Math.random().toString(36);
    setMessages(prev => [...prev, { role, text, timestamp, id: messageId, sender, media }]);
  }, []);

  const addTypingIndicator = useCallback((sender: string) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;
    const messageId = `typing-${sender}-${Date.now()}`;
    
    // Remove any existing typing indicator for this sender
    setMessages(prev => prev.filter(msg => !(msg.id?.startsWith(`typing-${sender}-`))));
    
    // Add new typing indicator
    setMessages(prev => [...prev, { 
      role: 'bot', 
      text: '', 
      timestamp, 
      id: messageId, 
      sender, 
      typing: true 
    }]);
  }, []);

  const updateReadReceipt = useCallback((sender: string) => {
    setMessages(prev => prev.map(msg => 
      msg.sender === sender && msg.role === 'bot' 
        ? { ...msg, read: true }
        : msg
    ));
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
    if (!connected || !socketRef.current || !socketRef.current.connected) {
      alert('Not connected! Please connect Socket.io first.');
      return;
    }

    // Send the selected models to start the conversation
    const message = `Starting conversation between ${modelA} (Alex) and ${modelB} (Sam)`;
    addMessage('user', message);
    
    // Send to backend
    socketRef.current.emit('start_conversation', { 
      modelA,
      modelB 
    });
  }, [connected, addMessage]);

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
