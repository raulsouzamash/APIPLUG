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
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Package className="h-6 w-6" />
          <span>Pluggto Tools</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {user.email}
            </span>
            
            <Button variant="outline" size="sm" onClick={onOpenAdmin}>
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
