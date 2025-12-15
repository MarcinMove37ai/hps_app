import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface MobileNavigationProps {
  onToggleSidebar: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onToggleSidebar
}) => {
  return (
    <div className="bg-white px-6 border-b border-gray-100 py-4">
      <div className="flex justify-between items-center">
        <button
          onClick={onToggleSidebar}
          className="p-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>

        <div
          className="relative group"
          onClick={() => window.location.reload()}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            const divElement = e.currentTarget.querySelector('div');
            if (divElement) divElement.style.width = '105%';
          }}
          onMouseLeave={(e) => {
            const divElement = e.currentTarget.querySelector('div');
            if (divElement) divElement.style.width = '150%';
          }}
        >
          <h1 className="text-xl text-gray-800 tracking-wide">
            <span className="font-bold">omega3</span>
            <span className="font-light">gpt.pl</span>
          </h1>
          <div
            className="h-px bg-gray-200 mt-2 transition-all duration-300"
            style={{
              width: '150%',
              position: 'relative',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
        </div>

        {/* Miejsce na ewentualne dodatkowe elementy w przyszłości */}
      </div>
    </div>
  );
};

export default MobileNavigation;