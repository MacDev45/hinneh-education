import React from 'react';
import { IMAGES } from '@/assets/images';

export interface AppLogoLoaderProps {
  /** Titre ou en-tête au-dessus du message */
  title?: string;
  /** Message principal */
  message?: string;
  /** Message secondaire ou d'état */
  submessage?: string;
  /** Mode plein écran centré avec fond flouté */
  fullScreen?: boolean;
  /** Taille du logo : 'sm', 'md', 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Classes CSS additionnelles */
  className?: string;
}

export const AppLogoLoader: React.FC<AppLogoLoaderProps> = ({
  title = 'HÎNNEH ÉDUCATION',
  message = 'Chargement en cours...',
  submessage,
  fullScreen = false,
  size = 'md',
  className = '',
}) => {
  // Configuration des dimensions selon la taille
  const sizeConfig = {
    sm: {
      container: 'h-12 w-12',
      glow: '-inset-2 blur-md',
      ringOuter: 'h-16 w-16',
      ringInner: 'h-14 w-14',
      title: 'text-[11px] font-bold tracking-wider',
      message: 'text-xs',
      bar: 'w-24 h-1',
    },
    md: {
      container: 'h-16 w-16',
      glow: '-inset-3 blur-lg',
      ringOuter: 'h-24 w-24',
      ringInner: 'h-20 w-20',
      title: 'text-xs font-bold tracking-widest',
      message: 'text-sm font-medium',
      bar: 'w-36 h-1.5',
    },
    lg: {
      container: 'h-24 w-24',
      glow: '-inset-4 blur-xl',
      ringOuter: 'h-32 w-32',
      ringInner: 'h-28 w-28',
      title: 'text-sm font-bold tracking-widest',
      message: 'text-base font-semibold',
      bar: 'w-48 h-2',
    },
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 text-center select-none ${className}`}>
      {/* Halo et Logo animé centré */}
      <div className="relative flex items-center justify-center">
        {/* Lueur d'ambiance avec pulsation */}
        <div
          className={`absolute rounded-full bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-emerald-500/30 animate-pulse ${sizeConfig.glow}`}
        />

        {/* Anneau orbital externe en pointillés avec rotation lente */}
        <div
          className={`absolute rounded-full border-2 border-dashed border-primary/35 animate-spin [animation-duration:10s] ${sizeConfig.ringOuter}`}
        />

        {/* Anneau dynamique bicolore avec rotation fluide */}
        <div
          className={`absolute rounded-full border-2 border-t-primary border-r-transparent border-b-indigo-500 border-l-transparent animate-spin [animation-duration:1.6s] ${sizeConfig.ringInner}`}
        />

        {/* Conteneur circulaire du logo */}
        <div
          className={`relative z-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200/90 dark:border-slate-800 p-2.5 transition-transform duration-500 ${sizeConfig.container}`}
        >
          <img
            src={IMAGES.HINNEH_LOGO_20260507_234919_1}
            alt="Logo Hînneh"
            className="h-full w-full object-contain drop-shadow-xs"
            onError={(e) => {
              // Fallback vers chemin direct si nécessaire
              (e.currentTarget as HTMLImageElement).src = '/images/hinneh_logo_20260507_234919.png';
            }}
          />
        </div>
      </div>

      {/* Textes et barre de progression animée */}
      <div className="flex flex-col items-center gap-1.5 mt-2 max-w-sm px-4">
        {title && (
          <span className={`text-primary uppercase ${sizeConfig.title}`}>
            {title}
          </span>
        )}
        {message && (
          <span className={`text-slate-800 dark:text-slate-200 ${sizeConfig.message}`}>
            {message}
          </span>
        )}
        {submessage && (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {submessage}
          </span>
        )}

        {/* Barre de chargement avec vague lumineuse */}
        <div className={`bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden relative mt-1.5 ${sizeConfig.bar}`}>
          <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full animate-pulse opacity-90" />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center">
      {content}
    </div>
  );
};

export default AppLogoLoader;
