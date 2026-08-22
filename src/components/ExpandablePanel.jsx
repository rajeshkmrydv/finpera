import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ExpandablePanel = ({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  defaultOpen = false,
  badge,
  children,
  className = '',
  accent,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`expandable-panel ${open ? 'is-open' : ''} ${className}`}>
      {accent && <div className="expandable-accent" style={{ background: accent }} />}
      <button
        type="button"
        className="expandable-header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="expandable-header-left">
          {Icon && (
            <div className="expandable-icon" style={iconColor ? { color: iconColor, background: `${iconColor}14` } : undefined}>
              <Icon size={18} />
            </div>
          )}
          <div className="expandable-titles">
            <span className="expandable-title">{title}</span>
            {subtitle && <span className="expandable-subtitle">{subtitle}</span>}
          </div>
        </div>
        <div className="expandable-header-right">
          {badge}
          <span className={`expandable-chevron ${open ? 'open' : ''}`}>
            <ChevronDown size={18} />
          </span>
        </div>
      </button>
      <div className="expandable-body" aria-hidden={!open}>
        <div className="expandable-inner">{children}</div>
      </div>
    </div>
  );
};

export default ExpandablePanel;
