import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-[var(--color-primary)]" />
      {text && <p className="text-[var(--color-text-muted)] font-medium animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
