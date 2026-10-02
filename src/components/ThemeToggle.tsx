import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-xl transition-colors ${className}`}
            title="Changer de thème"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-amber-400 transition-transform" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500 transition-transform" />
            )}
            <span className="sr-only">Changer le thème</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => setTheme('light')}
            className={`cursor-pointer flex items-center gap-2 ${theme === 'light' ? 'font-bold text-primary' : ''}`}
          >
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Clair</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme('dark')}
            className={`cursor-pointer flex items-center gap-2 ${theme === 'dark' ? 'font-bold text-primary' : ''}`}
          >
            <Moon className="h-4 w-4 text-amber-400" />
            <span>Sombre</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme('system')}
            className={`cursor-pointer flex items-center gap-2 ${theme === 'system' ? 'font-bold text-primary' : ''}`}
          >
            <Laptop className="h-4 w-4 text-muted-foreground" />
            <span>Système</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-9 w-9 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted transition-all duration-200 ${className}`}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDark ? (
            <Moon className="h-4 w-4 text-amber-400 transition-transform hover:scale-110" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500 transition-transform hover:scale-110" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}</p>
      </TooltipContent>
    </Tooltip>
  );
};