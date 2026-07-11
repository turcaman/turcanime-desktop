import React from 'react';

interface SectionTitleProps {
  label: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ label }) => {
  return (
    <h2 className="text-lg font-semibold text-neutral-200 px-6 pt-6 pb-3 select-none">
      {label}
    </h2>
  );
};
