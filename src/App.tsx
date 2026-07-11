import React from 'react';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-[#0f0f11] text-gray-900 dark:text-gray-100">
      <main className="flex-1 flex flex-col p-8">
      </main>

      <footer className="h-7 px-4 flex items-center border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-600 select-none">
        <span>Turcanime Desktop</span>
      </footer>
    </div>
  );
};

export default App;
