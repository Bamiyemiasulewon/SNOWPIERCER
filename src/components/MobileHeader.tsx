'use client';

interface MobileHeaderProps {
  networkStatus?: 'good' | 'congested' | 'error';
  className?: string;
}

export default function MobileHeader({ className = '' }: MobileHeaderProps) {

  return (
    <header className={`bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-lg border-b border-gray-700/30 sticky top-0 z-50 backdrop-blur-md ${className}`}>
      <div className="container mx-auto">
        {/* Ultra-compact header */}
        <div className="flex items-center justify-center h-8 sm:h-10 md:h-12 px-3">
          {/* Centered logo */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 bg-gradient-to-br from-blue-400 to-cyan-300 rounded flex items-center justify-center">
              <svg className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="text-base sm:text-lg md:text-xl font-medium bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-tight font-mono uppercase">
              SNOWPIERCER
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}