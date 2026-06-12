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

    <header className="sticky top-0 z-50 w-full border-b border-indigo-500/20 bg-[#0f172a]/90 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-white group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-md opacity-30 group-hover:opacity-60 transition-opacity"></div>
            <Package className="h-7 w-7 text-blue-400 relative z-10" />
          </div>
          <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Pluggto Tools</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shadow-inner">
                <span className="text-xs font-bold text-slate-300">RS</span>
              </div>
              <span className="text-sm font-medium text-slate-300">
                {user.email}
              </span>
            </div>
            
            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
              <Button variant="ghost" size="icon" onClick={onOpenAdmin} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
                <Users className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-semibold px-4">
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
