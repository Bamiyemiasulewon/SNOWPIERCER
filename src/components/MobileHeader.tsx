'use client';

interface MobileHeaderProps {
  networkStatus?: 'good' | 'congested' | 'error';
  className?: string;
}

export default function MobileHeader({ className = '' }: MobileHeaderProps) {

  return (
    <header className={`bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-lg border-b border-gray-700/30 sticky top-0 z-50 backdrop-blur-md ${className}`}>
      <div className="container mx-auto">
        {/* Expanded header for large text */}
        <div className="flex items-center justify-center h-12 mobile-m:h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 px-3">
          {/* Centered logo */}
          <div className="flex items-center gap-2 mobile-m:gap-3 sm:gap-4">
            <div className="w-6 h-6 mobile-m:w-8 mobile-m:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 bg-gradient-to-br from-blue-400 to-cyan-300 rounded flex items-center justify-center">
              <svg className="w-3 h-3 mobile-m:w-4 mobile-m:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="text-2xl mobile-m:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-tight font-mono uppercase">
              SNOWPIERCER
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}