import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

export default function CollapsibleSection({ 
  title, 
  description, 
  children, 
  defaultOpen = false,
  accentColor = '#e10600'
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section ${isOpen ? 'open' : ''}`}>
      <button 
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{ '--section-accent': accentColor } as React.CSSProperties}
      >
        <div className="collapsible-title-wrap">
          <span className="collapsible-indicator">{isOpen ? '−' : '+'}</span>
          <span className="collapsible-title">{title}</span>
        </div>
        {description && !isOpen && (
          <span className="collapsible-desc-preview">{description}</span>
        )}
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {description && (
            <p className="collapsible-desc">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
