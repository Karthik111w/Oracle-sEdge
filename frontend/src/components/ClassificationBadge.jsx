import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

const ClassificationBadge = ({ classification }) => {
  let color = 'var(--color-text-muted)';
  let bg = 'var(--color-surface)';
  let Icon = HelpCircle;

  switch (classification) {
    case 'Strong Buy':
    case 'Buy':
      color = 'var(--color-success)';
      bg = 'rgba(16, 185, 129, 0.1)';
      Icon = CheckCircle;
      break;
    case 'Watchlist':
      color = 'var(--color-warning)';
      bg = 'rgba(245, 158, 11, 0.1)';
      Icon = AlertTriangle;
      break;
    case 'Avoid':
      color = 'var(--color-danger)';
      bg = 'rgba(239, 68, 68, 0.1)';
      Icon = XCircle;
      break;
    case 'Hold':
    default:
      color = 'var(--color-text)';
      bg = 'rgba(255, 255, 255, 0.1)';
      Icon = HelpCircle;
      break;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '999px',
      background: bg,
      color: color,
      fontWeight: 600,
      border: `1px solid ${color}`,
      boxShadow: classification === 'Buy' || classification === 'Strong Buy' ? `0 0 10px ${bg}` : 'none'
    }}>
      <Icon size={18} />
      <span>{classification}</span>
    </div>
  );
};

export default ClassificationBadge;
