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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <Toaster theme="dark" richColors position="bottom-right" />
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
      
      <main className="flex-1 container max-w-screen-2xl py-8">
        <Tabs defaultValue="nfe" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-8">
            <TabsTrigger value="nfe">NFe & Etiquetas</TabsTrigger>
            <TabsTrigger value="buffered">Agendamentos</TabsTrigger>
            <TabsTrigger value="json">Inspecionar JSON</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nfe">
            <NFePage />
          </TabsContent>
          
          <TabsContent value="buffered">
            <BufferedPage />
          </TabsContent>
          
          <TabsContent value="json">
            <JsonPage />
          </TabsContent>
        </Tabs>
      </main>

      <AdminModal isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
      
      <Toaster theme="dark" richColors position="bottom-right" />
    </div>
  );
}
