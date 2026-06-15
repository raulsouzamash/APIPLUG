import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Copy, Loader as Loader2, Code } from 'lucide-react';

export default function JsonPage() {
  const [searchType, setSearchType] = useState('external');
  const [searchValue, setSearchValue] = useState('');
  const [jsonResult, setJsonResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchValue) {
      toast.error('Digite um ID para buscar!');
      return;
    }

    setLoading(true);
    setJsonResult(null);

    try {
      const { data } = await apiFetch('/api/orders/json', {
        method: 'POST',
        body: { searchType, searchValue }
      });
      setJsonResult(data);
      toast.success('Pedido encontrado!');
    } catch (e) {
      toast.error(e.message || 'Erro ao buscar pedido');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (!jsonResult) return;
    navigator.clipboard.writeText(JSON.stringify(jsonResult, null, 2));
    toast.success('JSON copiado para a área de transferência!');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Inspecionar JSON
          </CardTitle>
          <CardDescription>Busque o payload bruto de um pedido para debug</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              className="flex h-10 w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="external">ID Externo (ex: Shopee)</option>
              <option value="internal">ID Pluggto</option>
            </select>

            <Input
              type="text"
              placeholder="Digite o ID para buscar..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />

            <Button onClick={handleSearch} disabled={loading || !searchValue}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {jsonResult && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-muted/50 border-b">
                <span className="text-sm font-medium">Resultado da Busca</span>
                <Button variant="ghost" size="sm" onClick={copyJson}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar JSON
                </Button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-auto max-h-[600px] bg-secondary/30">
                {JSON.stringify(jsonResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
