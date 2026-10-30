'use client';

import React, { useState } from 'react';
import { PortalConversation } from '@/types/portal';

interface MessageThreadProps {
  conversations: PortalConversation[];
  activeId?: string;
  onSendMessage: (convId: string, text: string) => void;
}

export function MessageThread({ conversations, activeId, onSendMessage }: MessageThreadProps) {
  const [selectedId, setSelectedId] = useState<string>(activeId || conversations[0]?.id || '');
  const [textInput, setTextInput] = useState('');

  const currentConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !currentConv) return;
    onSendMessage(currentConv.id, textInput.trim());
    setTextInput('');
  };

  if (!conversations.length) {
    return (
      <div className="empty-message-state">
        <p>No active conversations with local partners yet.</p>
      </div>
    );
  }

  return (
    <div className="messages-layout">
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h3>Local Partner Inquiries</h3>
          <span>{conversations.length} Active</span>
        </div>
        <div className="conversation-list">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`conv-list-item ${c.id === currentConv?.id ? 'active' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div
                className="conv-avatar"
                style={{ backgroundImage: `url('${c.partnerImage}')` }}
              />
              <div className="conv-info">
                <div className="conv-topline">
                  <b>{c.partnerName}</b>
                  {c.unreadCount > 0 && <span className="unread-dot">{c.unreadCount}</span>}
                </div>
                <small className="conv-category">{c.partnerCategory}</small>
                <p className="conv-snippet">{c.lastMessageSnippet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="thread-main">
        {currentConv ? (
          <>
            <div className="thread-header">
              <div
                className="conv-avatar"
                style={{ backgroundImage: `url('${currentConv.partnerImage}')` }}
              />
              <div>
                <h3>{currentConv.partnerName}</h3>
                <span className="thread-subject">{currentConv.subject}</span>
              </div>
            </div>

            <div className="thread-messages">
              {currentConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`thread-bubble ${m.sender === 'traveler' ? 'bubble-traveler' : 'bubble-partner'}`}
                >
                  <p>{m.text}</p>
                  <small>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
            </div>

            <form className="thread-input-form" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Ask about step-free stays, weather, or custom timings..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <button type="submit" className="button button-gold" style={{ minHeight: '40px' }}>
                Send <span>↑</span>
              </button>
            </form>
          </>
        ) : (
          <div className="empty-selection">Select a partner inquiry to view messages</div>
        )}
      </div>
    </div>
  );
}
