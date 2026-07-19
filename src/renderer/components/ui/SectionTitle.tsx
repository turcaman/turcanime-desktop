import React from 'react';

interface SectionTitleProps {
  label: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ label }) => {
  return (
    <div className="flex items-center gap-3 px-6 pt-6 pb-3 select-none">
      <span className="w-0.5 h-4 bg-purple-500 rounded-full flex-shrink-0" />
      <h2 className="text-base font-semibold text-neutral-200">
        {label}
      </h2>
    </div>
  );
};
