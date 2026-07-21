import React from 'react';

interface SectionTitleProps {
  label: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ label }) => {
  return (
    <div className="px-6 pt-6 pb-3 select-none">
      <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        {label}
      </h2>
    </div>
  );
};
