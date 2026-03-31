import { useState, useEffect, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  accentColor?: string;
}

export default function TabContainer({ tabs, defaultTab, accentColor = '#e10600' }: Props) {
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL hash on mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.some(t => t.id === hash && !t.disabled)) {
        return hash;
      }
    }
    return defaultTab || tabs.find(t => !t.disabled)?.id || tabs[0]?.id || '';
  });

  useEffect(() => {
    // Update URL hash when tab changes
    if (typeof window !== 'undefined' && activeTab) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    // Listen for hash changes (back/forward navigation)
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.some(t => t.id === hash && !t.disabled)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs]);

  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div className="tab-container">
      <div className="tab-nav" style={{ '--tab-accent': accentColor } as React.CSSProperties}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}
