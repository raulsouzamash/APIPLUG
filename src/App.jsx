import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Header from '@/components/layout/Header';
import Login from '@/pages/Login';
import NFePage from '@/pages/NFePage';
import BufferedPage from '@/pages/BufferedPage';
import JsonPage from '@/pages/JsonPage';
import AdminModal from '@/components/AdminModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from 'sonner';
import { FileKey, Calendar, Code } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user } = await apiFetch('/api/auth/me');
      if (user) setUser(user);
    } catch (e) {
      // Not logged in
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        user={user}
        onLogout={() => setUser(null)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main className="flex-1 container max-w-screen-2xl py-8 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="nfe" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto mb-8">
            <TabsTrigger value="nfe" className="gap-2">
              <FileKey className="h-4 w-4" />
              <span className="hidden sm:inline">NFe & Etiquetas</span>
              <span className="sm:hidden">NFe</span>
            </TabsTrigger>
            <TabsTrigger value="buffered" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Inspecionar JSON</span>
              <span className="sm:hidden">JSON</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nfe" className="mt-0">
            <NFePage />
          </TabsContent>

          <TabsContent value="buffered" className="mt-0">
            <BufferedPage />
          </TabsContent>

          <TabsContent value="json" className="mt-0">
            <JsonPage />
          </TabsContent>
        </Tabs>
      </main>

      <AdminModal isOpen={adminOpen} onClose={() => setAdminOpen(false)} />

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
