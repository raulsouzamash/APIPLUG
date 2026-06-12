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
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pluggto Tools</h1>
            <div className="text-[10px] uppercase tracking-widest font-bold text-primary">Painel Interno</div>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logado como</span>
              <span className="text-sm font-bold">{user.email}</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={onOpenAdmin} className="hidden sm:flex gap-2">
              <Users size={16} />
              Usuários
            </Button>
            
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenAdmin}>
              <Users size={20} />
            </Button>

            <Button variant="destructive" size="sm" onClick={handleLogout} className="hidden sm:flex gap-2">
              <LogOut size={16} />
              Sair
            </Button>
            
            <Button variant="ghost" size="icon" className="sm:hidden text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut size={20} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
