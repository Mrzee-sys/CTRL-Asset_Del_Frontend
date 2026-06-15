import React from 'react';
import './Zbot_Fields.css';

export default function Zbot_Fields({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  className = "", 
  variant = "default",
  ...props 
}) {
  void variant;

  return (
    <div className="zbot-field-wrapper">
      {label && <label className="zbot-field-label">{label}</label>}
      
      <div className="zbot-input-container">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`zbot-input imwatching-input ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}