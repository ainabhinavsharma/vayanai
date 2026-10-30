'use client';

import React, { useState } from 'react';
import { PortalNotification } from '@/types/portal';
import { useToast } from '@/components/ui/Toast';

interface NotificationCenterProps {
  notifications: PortalNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: string) => void;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'transit' | 'host' | 'weather' | 'pacing'>('all');
  const { showToast } = useToast();

  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.category === filter));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(id);
    showToast('Notification marked as read');
  };

  const handleAction = (tab?: string) => {
    if (tab) {
      onNavigateTab(tab);
    }
  };

  return (
    <div className="portal-notifications-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> DISPATCH & ROUTE ALERTS
          </div>
          <h2>Live Journey <em>Notifications</em></h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="small-action"
              onClick={() => {
                onMarkAllRead();
                showToast('All notifications marked as read');
              }}
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-bar">
        {(['all', 'transit', 'host', 'weather', 'pacing'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`notif-filter-pill ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? 'All Alerts' : cat.toUpperCase()}
            {cat === 'all' && unreadCount > 0 && (
              <span className="notif-counter">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notif-cards-list">
        {filtered.length === 0 ? (
          <div className="empty-message-state">
            <p>No notifications under this filter.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`notif-card ${item.isRead ? 'read' : 'unread'} urgency-${item.urgency}`}
              onClick={() => !item.isRead && onMarkRead(item.id)}
            >
              <div className="notif-card-header">
                <span className={`urgency-badge badge-${item.urgency}`}>
                  {item.urgency === 'critical' ? 'CRITICAL' : item.urgency === 'warning' ? 'ADVISORY' : 'DISPATCH'}
                </span>
                <span className="notif-category-tag">{item.category.toUpperCase()}</span>
                <time className="notif-time">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                {!item.isRead && (
                  <button
                    type="button"
                    className="notif-mark-btn"
                    title="Mark as read"
                    onClick={(e) => handleRead(item.id, e)}
                  >
                    Mark read ✓
                  </button>
                )}
              </div>

              <h4 className="notif-title">{item.title}</h4>
              <p className="notif-body">{item.message}</p>

              {item.actionTab && (
                <div className="notif-footer-action">
                  <button
                    type="button"
                    className="notif-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(item.actionTab);
                    }}
                  >
                    {item.actionText || 'View details'} ↗
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
