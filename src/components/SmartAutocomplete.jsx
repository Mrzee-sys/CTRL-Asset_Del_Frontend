import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";

/**
 * SmartAutocomplete
 * - If apiFetch is provided, uses it for suggestions
 * - If api fails, falls back to manual input
 * - Shows a + button to allow manual override
 */
export default function SmartAutocomplete({
  label,
  value,
  onChange,
  apiFetch, // async (input) => [{ label, value, id }]
  placeholder,
  allowManual = true,
  onAddManual,
  options = [], // fallback or local options
  disabled,
  style,
  inputClassName = "value",
  ...props
}) {
  const [input, setInput] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  useEffect(() => {
    let active = true;
    if (!apiFetch || showManual || !input) {
      setSuggestions([]);
      return;
    }
    setApiError(false);
    apiFetch(input)
      .then((results) => {
        if (active) setSuggestions(results || []);
      })
      .catch(() => {
        setApiError(true);
        setSuggestions([]);
      });
    return () => { active = false; };
  }, [input, apiFetch, showManual]);

  const handleSelect = (item) => {
    setInput(item.label);
    setDropdownOpen(false);
    onChange(item.label, item);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    setDropdownOpen(true);
    if (showManual || apiError) {
      onChange(e.target.value, null);
    }
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    setShowManual(true);
    setDropdownOpen(false);
    if (onAddManual) onAddManual();
  };

  // Fallback: show options if provided
  const fallbackOptions = (!apiFetch || apiError || showManual) && options.length > 0 ? options : [];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <div style={{ flex: 1, position: "relative" }}>
        <input
          className={inputClassName}
          type="text"
          value={input}
          onChange={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          {...props}
        />
        {(dropdownOpen && (suggestions.length > 0 || fallbackOptions.length > 0)) && (
          <div className="autocomplete-dropdown" style={{
            position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #ccc", borderRadius: 6, width: "100%", maxHeight: 180, overflowY: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            {suggestions.map((item) => (
              <div key={item.id || item.value || item.label} className="autocomplete-item" style={{ padding: 8, cursor: "pointer" }} onClick={() => handleSelect(item)}>
                {item.label}
              </div>
            ))}
            {fallbackOptions.map((opt) => (
              <div key={opt} className="autocomplete-item" style={{ padding: 8, cursor: "pointer" }} onClick={() => handleSelect({ label: opt, value: opt })}>
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
      {allowManual && (
        <button
          className="btn-electric btnGhost btn-icon-round"
          type="button"
          aria-label="Add manual entry"
          style={{ marginLeft: 2, width: 32, minWidth: 32, height: 32, borderRadius: "50%" }}
          onClick={handleAddManual}
          tabIndex={-1}
        >
          <span><FiPlus size={16} /></span>
        </button>
      )}
    </div>
  );
}
