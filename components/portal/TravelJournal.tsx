'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { TravelJournalEntry } from '@/types/portal';
import { useToast } from '@/components/ui/Toast';

interface TravelJournalProps {
  initialEntries: TravelJournalEntry[];
  onAddEntry: (entry: Omit<TravelJournalEntry, 'id'>) => void;
}

export function TravelJournal({ initialEntries, onAddEntry }: TravelJournalProps) {
  const [entries, setEntries] = useState<TravelJournalEntry[]>(initialEntries);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntryForStory, setSelectedEntryForStory] = useState<TravelJournalEntry | null>(null);
  const { showToast } = useToast();

  // Form State
  const [day, setDay] = useState<number>(3);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [reflection, setReflection] = useState('');
  const [highlight, setHighlight] = useState('');
  const [localInteraction, setLocalInteraction] = useState('');
  const [weatherCondition, setWeatherCondition] = useState('22°C · Clear Autumn Sky');
  const [photoUrl, setPhotoUrl] = useState('/images/destinations/meghalaya.jpg');

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reflection) {
      showToast('Please provide a title and reflection.');
      return;
    }

    const newEntry: Omit<TravelJournalEntry, 'id'> = {
      day,
      date: `Autumn Day ${day}`,
      title,
      location: location || 'Meghalaya Valley',
      reflection,
      highlight,
      localInteraction,
      weatherCondition,
      photoUrl
    };

    onAddEntry(newEntry);
    setEntries([
      {
        ...newEntry,
        id: `entry-${Date.now()}`
      },
      ...entries
    ]);

    setShowAddModal(false);
    setTitle('');
    setReflection('');
    setHighlight('');
    setLocalInteraction('');
    showToast('New day memory recorded in travel journal.');
  };

  return (
    <div className="travel-journal-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> FIELD OBSERVATIONS & MEMORIES
          </div>
          <h2>Travel Journal & <em>Story Builder</em></h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddModal(true)}
          >
            + Log New Memory
          </button>
        </div>
      </div>

      <p className="journal-intro">
        Capture unhurried reflections, conversations with local hosts, and unexpected observations.
        Journal entries can be printed into an archival field notebook or saved offline.
      </p>

      {/* Entries List */}
      <div className="journal-entries-grid">
        {entries.map((entry) => (
          <article key={entry.id} className="journal-entry-card">
            {entry.photoUrl && (
              <div className="entry-photo-wrap">
                <Image
                  src={entry.photoUrl}
                  alt={entry.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  style={{ objectFit: 'cover' }}
                />
                <div className="entry-day-badge">DAY {entry.day}</div>
                {entry.weatherCondition && (
                  <div className="entry-weather-badge">{entry.weatherCondition}</div>
                )}
              </div>
            )}

            <div className="entry-content">
              <div className="entry-meta-top">
                <span className="entry-date">{entry.date}</span>
                <span className="entry-loc">📍 {entry.location}</span>
              </div>

              <h3 className="entry-title">{entry.title}</h3>
              <p className="entry-reflection">{entry.reflection}</p>

              {entry.highlight && (
                <div className="entry-highlight-box">
                  <b>Highlight:</b> <span>{entry.highlight}</span>
                </div>
              )}

              {entry.localInteraction && (
                <div className="entry-interaction-box">
                  <b>Local Conversation:</b> <span>{entry.localInteraction}</span>
                </div>
              )}

              <div className="entry-card-footer">
                <button
                  type="button"
                  className="small-action"
                  onClick={() => setSelectedEntryForStory(entry)}
                >
                  View Story Card ↗
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Log Memory Modal */}
      {showAddModal && (
        <div className="portal-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="portal-modal-card journal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Log Trip Memory</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <p>Record your personal experience and conversations from today’s journey.</p>

            <form onSubmit={handleSaveEntry} className="journal-form">
              <div className="form-row-2">
                <div className="field-group">
                  <label>Trip Day Number</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    className="journal-input"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label>Location / Valley</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mawkdok Dympep Valley"
                    className="journal-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Memory Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning mist over canyon bamboo shacks"
                  required
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Reflection & Impressions</label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={4}
                  placeholder="Describe what struck you today—sounds, smells, light, thoughts..."
                  required
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Standout Highlight</label>
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  placeholder="e.g. Drinking fresh tea with forest honey"
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Conversation with Local Host / Guide</label>
                <input
                  type="text"
                  value={localInteraction}
                  onChange={(e) => setLocalInteraction(e.target.value)}
                  placeholder="e.g. Host explained the clan root maintenance schedule"
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Photo Memory</label>
                <select
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="journal-input"
                >
                  <option value="/images/destinations/meghalaya.jpg">Meghalaya Valley View</option>
                  <option value="/images/categories/exp-trails.jpg">Living Root Trail</option>
                  <option value="/images/categories/exp-food.jpg">Local Culinary Table</option>
                  <option value="/images/destinations/kerala.jpg">Backwater Canal</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save to Archival Journal ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Card Preview / Print Modal */}
      {selectedEntryForStory && (
        <div className="portal-modal-backdrop" onClick={() => setSelectedEntryForStory(null)}>
          <div className="portal-modal-card story-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <span className="story-eyebrow">VAYANAI FIELD DISPATCH · DAY {selectedEntryForStory.day}</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedEntryForStory(null)}
              >
                ✕
              </button>
            </div>

            <div className="printable-story-card">
              {selectedEntryForStory.photoUrl && (
                <div className="story-photo">
                  <Image
                    src={selectedEntryForStory.photoUrl}
                    alt={selectedEntryForStory.title}
                    width={440}
                    height={220}
                    style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                  />
                </div>
              )}
              <div className="story-header">
                <h2>{selectedEntryForStory.title}</h2>
                <div className="story-location-line">
                  <span>📍 {selectedEntryForStory.location}</span>
                  <span>{selectedEntryForStory.weatherCondition}</span>
                </div>
              </div>

              <p className="story-body">{selectedEntryForStory.reflection}</p>

              {selectedEntryForStory.highlight && (
                <blockquote className="story-quote">
                  <b>Highlight:</b> {selectedEntryForStory.highlight}
                </blockquote>
              )}

              {selectedEntryForStory.localInteraction && (
                <div className="story-folk-note">
                  <b>Host Voice:</b> {selectedEntryForStory.localInteraction}
                </div>
              )}

              <div className="story-provenance-seal">
                <span>व VAYANAI ARCHIVE · AUTHENTIC TRAVEL RECORD</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedEntryForStory(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  window.print();
                }}
              >
                Print / Save PDF 🖨️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
