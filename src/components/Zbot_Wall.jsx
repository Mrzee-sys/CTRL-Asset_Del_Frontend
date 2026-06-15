import React, { useState, useEffect } from 'react';
import './Zbot_Wall.css';

export default function Zbot_Wall() {
  const [blinking, setBlinking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [isHidden, setIsHidden] = useState(false); 
  const [isFalling, setIsFalling] = useState(false);
  const [randomTop, setRandomTop] = useState(20); // Default vertical position
  
  // 2D eye tracking offsets
  const [eyeOffsetX, setEyeOffsetX] = useState(0); 
  const [eyeOffsetY, setEyeOffsetY] = useState(0);

  // Listener to hide Zbot when inputs are focused (prevents blocking work area)
  useEffect(() => {
    let hideTimeout;
    
    const handleInputFocus = () => {
      clearTimeout(hideTimeout);
      setIsHidden(true); 
    };
    
    const handleInputBlur = () => {
      // Small delay prevents flickering during rapid tab switching
      hideTimeout = setTimeout(() => {
        // Randomize height between 10% and 80% to keep the UI fresh
        const newTop = Math.floor(Math.random() * 70) + 10;
        setRandomTop(newTop);
        setIsHidden(false);
        
        // Trigger the 'Fall' physics animation
        setIsFalling(true);
        setTimeout(() => setIsFalling(false), 600);
      }, 100); 
    };

    window.addEventListener('mascot-focus', handleInputFocus);
    window.addEventListener('mascot-blur', handleInputBlur);

    return () => {
      window.removeEventListener('mascot-focus', handleInputFocus);
      window.removeEventListener('mascot-blur', handleInputBlur);
      clearTimeout(hideTimeout);
    };
  }, []);

  // Global Mouse Tracking for eye movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isHidden) return; 

      const yRatio = e.clientY / window.innerHeight;
      const offsetX = ((1 - yRatio) * 14) - 7; 
      
      const xRatio = e.clientX / window.innerWidth;
      const offsetY = xRatio * 6; 
      
      setEyeOffsetX(offsetX);
      setEyeOffsetY(offsetY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHidden]); 

  // Random blinking logic
  useEffect(() => {
    let timeout;
    if (!blinking) {
      timeout = setTimeout(() => setBlinking(true), 1200 + Math.random() * 1000);
    } else {
      timeout = setTimeout(() => setBlinking(false), 80 + Math.random() * 40); 
    }
    return () => clearTimeout(timeout);
  }, [blinking]);

  // Waving logic occurs every 11 seconds
  useEffect(() => {
    const waveTimer = setInterval(() => {
        if (!isHidden) { 
          setWaving(true);
          setTimeout(() => setWaving(false), 1200);
        }
    }, 11000);

    return () => clearInterval(waveTimer);
  }, [isHidden]);

  if (isHidden) return null;

  return (
    <div 
      className={`zbot-wall-wrapper ${isFalling ? 'zbot-falling' : ''}`}
      style={{ top: `${randomTop}%` }}
    >
      <svg width="56" height="36" viewBox="0 0 56 36" className="zbot-wall-svg">
        <defs>
          <filter id="wall-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f6ff" floodOpacity="0.7" />
          </filter>
        </defs>
        
        {/* Left Hand (resting on wall/border) */}
        <ellipse 
          cx="10" cy="32" rx="6" ry="4" 
          fill="#101624" stroke="#00f6ff" strokeWidth="2" filter="url(#wall-glow)"
          className={waving ? "zbot-waving-hand" : ""}
        />
        
        {/* Right Hand */}
        <ellipse cx="46" cy="32" rx="6" ry="4" fill="#101624" stroke="#00f6ff" strokeWidth="2" filter="url(#wall-glow)" />
        
        {/* Main Body */}
        <ellipse cx="28" cy="20" rx="22" ry="12" fill="#101624" stroke="#00f6ff" strokeWidth="2.5" filter="url(#wall-glow)" />
        
        {/* Eyes (2D tracking) */}
        <ellipse cx={20 + eyeOffsetX} cy={22 + eyeOffsetY} rx="3" ry="4" fill="#222" stroke="#00f6ff" strokeWidth="0.7" />
        <ellipse cx={36 + eyeOffsetX} cy={22 + eyeOffsetY} rx="3" ry="4" fill="#222" stroke="#00f6ff" strokeWidth="0.7" />
        
        {/* Head Details */}
        <rect x="16" y="14" width="8" height="2" rx="1" fill="#00f6ff" opacity="0.3" />
        <rect x="32" y="14" width="8" height="2" rx="1" fill="#00f6ff" opacity="0.3" />
        
        {/* Blink Overlays */}
        {blinking && (
          <g>
            <rect x={17 + eyeOffsetX} y={18 + eyeOffsetY} width="6" height="8" rx="3" fill="#00f6ff" opacity="0.85" />
            <rect x={33 + eyeOffsetX} y={18 + eyeOffsetY} width="6" height="8" rx="3" fill="#00f6ff" opacity="0.85" />
          </g>
        )}
      </svg>
    </div>
  );
}