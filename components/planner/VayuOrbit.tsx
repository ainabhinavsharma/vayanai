import React from 'react';

export function VayuOrbit() {
  return (
    <aside className="planner-aside">
      <div className="aside-topline">
        <span>YOUR TRAVEL COMPANION</span>
        <span className="ai-pulse">
          <i></i> READY WHEN YOU ARE
        </span>
      </div>

      <div className="vayu-orbit">
        <div className="orbit-ring ring-one"></div>
        <div className="orbit-ring ring-two"></div>
        <div className="vayu-core">V</div>
        <span className="orbit-dot dot-a"></span>
        <span className="orbit-dot dot-b"></span>
        <span className="orbit-dot dot-c"></span>
      </div>

      <h2>
        Meet <em>Vayu.</em>
      </h2>
      <p>
        Tell Vayu what matters. It’ll help connect your preferences to a route—and explain the thinking along the way.
      </p>

      <ul>
        <li>Turns your words into editable trip preferences</li>
        <li>Checks pace, travel effort and your comfort band</li>
        <li>Leaves the choices with you</li>
      </ul>

      <div className="aside-trust">
        <span className="trust-icon">✳</span>
        <span>
          <b>AI assisted. Human decided.</b>
          <br />
          Planning suggestions are starting points, not promises.
        </span>
      </div>
    </aside>
  );
}
