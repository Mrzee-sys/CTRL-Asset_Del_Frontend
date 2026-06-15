import React from "react";

export default function CategoryDropdown({ value, onChange }) {
    return (
        <select
            value={value}
            onChange={onChange}
            style={{
                borderRadius: 8,
                padding: '7px 18px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, #f7f7fa)',
                fontSize: 15,
                marginLeft: 12,
                outline: 'none',
                height: 38,
                color: 'var(--text)',
                boxShadow: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                cursor: 'pointer',
                verticalAlign: 'middle',
            }}
        >
            <option value="all">All Assets</option>
            <option value="computer">Computers</option>
            <option value="server">Servers</option>
            <option value="networking">Networking</option>
            <option value="av">AV Equipment</option>
            <option value="Sundries">Sundries</option>
        </select>
    );
}
