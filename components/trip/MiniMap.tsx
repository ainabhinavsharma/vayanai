import React from 'react';

interface MiniMapProps {
  routeName: string;
  pins: Array<{ name: string; className: string }>;
}

export function MiniMap({ routeName, pins }: MiniMapProps) {
  return (
    <div className="mini-map">
      <div className="map-grid"></div>
      {pins.map((pin) => (
        <span key={pin.name} className={`map-pin ${pin.className}`}>
          {pin.name}
        </span>
      ))}
      <svg viewBox="0 0 300 180" aria-hidden="true">
        <path d="M46 48 C84 50 99 73 127 88 S174 113 232 130" />
      </svg>
      <div className="map-caption">
        ROUTE SHAPE · {routeName.toUpperCase()} · NOT NAVIGATION
      </div>
    </div>
  );
}
