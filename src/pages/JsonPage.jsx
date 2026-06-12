import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="animate-fade-in space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Search className="text-primary" />
            Inspecionar Pedido (JSON Completo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select 
              className="flex h-10 w-full sm:max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="external">ID Externo (ex: Shopee)</option>
              <option value="internal">ID Pluggto</option>
            </select>
            
            <Input 
              type="text" 
              placeholder="Digite o ID para ver o JSON completo retornado pela API..." 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            
            <Button onClick={handleSearch} disabled={loading} className="px-8">
              {loading ? 'Buscando...' : 'Buscar JSON'}
            </Button>
          </div>

          {jsonResult && (
            <div className="animate-fade-in mt-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-muted-foreground">Resultado da Busca:</span>
                <Button variant="ghost" size="sm" onClick={copyJson} className="text-primary hover:text-primary">
                  <Copy size={16} className="mr-2" /> Copiar JSON
                </Button>
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-sm font-mono text-green-400 max-h-[600px] overflow-auto shadow-inner">
                {JSON.stringify(jsonResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
