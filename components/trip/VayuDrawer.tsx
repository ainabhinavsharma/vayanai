'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  disclaimer?: string;
}

interface VayuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pendingQuestion?: string | null;
  onQuestionConsumed?: () => void;
}

export function VayuDrawer({
  isOpen,
  onClose,
  pendingQuestion,
  onQuestionConsumed
}: VayuDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial',
      sender: 'bot',
      text: 'I can help reshape this sample route. What would you like to change?',
      disclaimer: 'Preview mode · example responses'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (pendingQuestion) {
      sendMessage(pendingQuestion);
      onQuestionConsumed?.();
    }
  }, [pendingQuestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateAnswer = (query: string): string => {
    const lower = query.toLowerCase();
    if (lower.includes('drive') || lower.includes('road')) {
      return 'For a gentler version, keep one base change and treat the scenic stops as optional. The real route times and current road conditions would need checking before you settle dates.';
    } else if (lower.includes('food')) {
      return 'A food-led day could focus on one neighbourhood and a local host, with fewer viewpoint stops. In a live plan, I’d show the partner and source behind each suggestion.';
    } else if (lower.includes('easy') || lower.includes('walk') || lower.includes('active') || lower.includes('gentle')) {
      return 'We can make the walk optional and add an easier viewpoint day. Trail access, steps and current conditions should be checked for the exact route.';
    } else if (lower.includes('leh') || lower.includes('altitude') || lower.includes('ladakh')) {
      return 'Altitude acclimatisation requires keeping days 1 and 2 completely low-effort. We build in 48-hour buffers before higher mountain passes.';
    } else {
      return 'I can adjust the sample route’s pace, interests or transfer balance. A live Vayu plan will verify current sources and partner availability before presenting route facts.';
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim()
    };
    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: generateAnswer(text),
      disclaimer: 'Preview response · not live AI or current travel data'
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <>
      <div
        className={`chat-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`chat-drawer ${isOpen ? 'open' : ''}`}
        aria-label="Vayu trip assistant"
        aria-hidden={!isOpen}
      >
        <div className="chat-top">
          <div>
            <span className="vayu-mini">V</span>
            <b>
              Vayu <small>YOUR TRIP COMPANION</small>
            </b>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Vayu">
            ×
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              {msg.text}
              {msg.disclaimer && <small>{msg.disclaimer}</small>}
            </div>
          ))}
          <div ref={messagesEndRef} />

          <button
            type="button"
            className="ask-prompt chat-suggestion"
            onClick={() => sendMessage('Can we make this trip more food-focused?')}
          >
            Add more local food
          </button>
          <button
            type="button"
            className="ask-prompt chat-suggestion"
            onClick={() => sendMessage('Can we keep road journeys shorter?')}
          >
            Reduce the road time
          </button>
        </div>

        <form className="chat-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="chatInput">
            Ask Vayu a question
          </label>
          <input
            id="chatInput"
            ref={inputRef}
            placeholder="Ask for a change…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" aria-label="Send message">
            ↑
          </button>
        </form>

        <p className="chat-disclosure">
          Vayu is showing sample replies here. A live assistant will cite current sources.
        </p>
      </aside>
    </>
  );
}
