import React from 'react';

interface SectionTitleProps {
  label: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ label }) => {
  return (
    <div className="px-6 pt-6 pb-3 select-none">
      <h2 className="text-[11px] font-medium text-neutral-300 uppercase tracking-[0.14em]">
        {label}
      </h2>
    </div>
  );
};
