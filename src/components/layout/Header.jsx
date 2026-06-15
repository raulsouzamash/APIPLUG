import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Package, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function Header({ user, onLogout, onOpenAdmin }) {
  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    onLogout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-foreground group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-md opacity-30 group-hover:opacity-60 transition-opacity rounded-lg" />
            <Package className="h-8 w-8 text-primary relative z-10" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Pluggto API
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {user.email}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-6">
              {user.role === 'admin' && (
                <Button variant="ghost" size="icon" onClick={onOpenAdmin} title="Gerenciar Usuários">
                  <Users className="h-5 w-5" />
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
