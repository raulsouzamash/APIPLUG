import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Copy } from 'lucide-react';

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
      const { data } = await apiFetch(`/api/orders/json?type=${searchType}&id=${searchValue}`);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inspecionar JSON</CardTitle>
          <CardDescription>Busque o payload bruto de um pedido para debug</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select 
              className="flex h-10 w-full sm:max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex-1"
            />
            
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {jsonResult && (
            <div className="mt-6 border rounded-md relative">
              <div className="flex justify-between items-center p-3 border-b bg-muted/50">
                <span className="text-sm font-medium">Resultado</span>
                <Button variant="ghost" size="sm" onClick={copyJson} className="h-8">
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-auto max-h-[600px] bg-zinc-950 text-zinc-50">
                {JSON.stringify(jsonResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
