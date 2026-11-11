import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'dark', 
  className = '', 
  size = 'md',
  showSubtitle = true,
}) => {
  const isLight = variant === 'light';

  const markSize = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-12 w-auto',
  }[size];

  const textSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }[size];

  return (
    <Link to="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Official BS4 Logo Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt="BS4copy&print" 
          className={`${markSize} object-contain transition-transform duration-200 group-hover:scale-105 ${
            isLight ? 'brightness-0 invert' : ''
          }`}
          onError={(e) => {
            // Fallback to SVG if PNG is blocked
            (e.target as HTMLImageElement).src = '/logo-mark.svg';
          }}
        />
      </div>

      {/* Typography from Official 2026 Price List */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1">
          <span className={`font-black tracking-tight ${textSize} ${isLight ? 'text-white' : 'text-slate-900'}`}>
            BS4copy<span className="text-blue-600">&</span>print
          </span>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-blue-300' : 'text-blue-600'}`}>
            Services
          </span>
        </div>
        {showSubtitle && (
          <span className={`text-[10px] tracking-wide font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Brislington, Bristol • Est. 2026
          </span>
        )}
      </div>
    </Link>
  );
};
