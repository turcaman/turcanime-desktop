import React from 'react';
import { ConnectionSection } from '../components/settings/ConnectionSection';
import { ShortcutsSection } from '../components/settings/ShortcutsSection';
import { UpdatesSection } from '../components/settings/UpdatesSection';
import { AboutSection } from '../components/settings/AboutSection';

export const SettingsPage: React.FC = () => {
  return (
    <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <div className="p-6 pt-4 space-y-8">
        <ConnectionSection />
        <ShortcutsSection />
        <UpdatesSection />
        <AboutSection />
      </div>
    </div>
  );
};
