import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Key, Tag, Zap, Search } from 'lucide-react';

export default function NFePage() {
  const [orderInput, setOrderInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [currentMode, setCurrentMode] = useState(null);

  const orderCount = orderInput.split('\n').map(s => s.trim()).filter(Boolean).length;

  const runAction = async (mode) => {
    const ids = orderInput.split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      toast.error('Nenhum ID inserido!');
      return;
    }
    setLoading(true);
    setResults([]);
    setCurrentMode(mode);
    
    toast.info(`Buscando ${ids.length} pedidos...`);

    try {
      const { data } = await apiFetch('/api/orders/process', {
        method: 'POST',
        body: { ids, action: mode },
      });
      setResults(data);
      toast.success('Busca concluída!');
    } catch (e) {
      toast.error(e.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      shipping_informed: { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: '✓ Enviado' },
      invoice_error: { bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: '⚠ Erro NF' },
      approved: { bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: '● Enviar NF-e' },
      delivered: { bg: 'bg-green-500/10 text-green-500 border-green-500/20', label: '✓ Entregue' },
      cancelled: { bg: 'bg-red-500/10 text-red-500 border-red-500/20', label: '✕ Cancelado' },
    };
    const { bg, label } = map[status] || { bg: 'bg-muted text-muted-foreground border-border', label: status || 'N/A' };
    return <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${bg}`}>{label}</span>;
  };

  const downloadNfeXlsx = () => {
    const data = results.map(r => ({
      ID_Interno: r.id || '',
      ID_Externo: r.ext || '',
      Status: r.status || '',
      Nf_Numero: r.nfNumber || '',
      Chave_NFe: r.nfeKey || '',
      Erro_NF: r.error || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chaves_NFe");
    XLSX.writeFile(wb, "chaves_nfe.xlsx");
  };

  const downloadLabelsXlsx = () => {
    const data = results.map(r => ({
      ID_Interno: r.id || '',
      ID_Externo: r.ext || '',
      Link_Etiqueta: r.labelUrl || '',
      Erro_Etiqueta: r.labelError || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Etiquetas");
    XLSX.writeFile(wb, "etiquetas.xlsx");
  };

  const downloadPdfs = async (print) => {
    toast.info('Gerando PDFs...');
    try {
      const valid = results.filter(r => r.labelUrl);
      const urls = valid.map(r => r.labelUrl);
      const res = await apiFetch('/api/orders/merge-pdf', {
        method: 'POST',
        body: { urls }
      });
      const link = document.createElement('a');
      link.href = res.mergedPdfBase64;
      if (print) {
        const w = window.open();
        w.document.write(`<iframe width="100%" height="100%" src="${res.mergedPdfBase64}"></iframe>`);
        w.document.close();
        w.focus();
        w.print();
      } else {
        link.download = `etiquetas_${valid.length}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (e) {
      toast.error('Erro ao gerar PDFs');
    }
  };

  const filtered = results.filter(r => 
    (r.id?.includes(filter) || r.ext?.includes(filter) || r.nfNumber?.includes(filter))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</div>
              <CardTitle>Cole os IDs dos Pedidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-40 p-4 rounded-md border bg-background text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              placeholder="Cole os IDs dos pedidos, um por linha..."
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground font-medium bg-secondary px-3 py-1 rounded-full">
                <strong className="text-primary">{orderCount}</strong> pedidos
              </span>
              <Button variant="ghost" size="sm" onClick={() => setOrderInput('')}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</div>
              <CardTitle>Escolha a Ação</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[160px]">
              <Button 
                variant="outline" 
                className="h-full flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => runAction('nfe')}
                disabled={loading}
              >
                <Key size={32} className="text-primary" />
                <span className="font-bold">Buscar Chaves</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-full flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-500/5"
                onClick={() => runAction('label')}
                disabled={loading}
              >
                <Tag size={32} className="text-blue-500" />
                <span className="font-bold">Baixar Etiquetas</span>
              </Button>
              <Button 
                variant="default" 
                className="sm:col-span-2 h-full flex items-center justify-center gap-2 text-lg"
                onClick={() => runAction('both')}
                disabled={loading}
              >
                <Zap size={24} />
                <span className="font-bold">Ambos (NFe + Etiquetas)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card className="shadow-lg animate-slide-up border-primary/20">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">📊 Resultados</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(currentMode === 'nfe' || currentMode === 'both') && (
                <Button variant="secondary" size="sm" onClick={downloadNfeXlsx}>⬇ Excel NFe</Button>
              )}
              {(currentMode === 'label' || currentMode === 'both') && (
                <Button variant="secondary" size="sm" onClick={downloadLabelsXlsx}>⬇ Excel Etiquetas</Button>
              )}
              {results.filter(r => r.labelUrl).length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => downloadPdfs(false)}>⬇ PDFs</Button>
                  <Button size="sm" onClick={() => downloadPdfs(true)}>🖨️ Imprimir PDFs</Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 border p-4 rounded-xl text-center">
                <div className="text-2xl font-black">{results.length}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Processados</div>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-center">
                <div className="text-2xl font-black text-primary">{results.filter(r => r.nfeKey).length}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Com Chave NFe</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                <div className="text-2xl font-black text-blue-500">{results.filter(r => r.labelUrl).length}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Com Etiqueta</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                <div className="text-2xl font-black text-emerald-500">{results.filter(r => r.status === 'approved').length}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Enviar NF-e</div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por NF ou ID..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 max-w-sm"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Status</TableHead>
                    {(currentMode === 'nfe' || currentMode === 'both') && (
                      <>
                        <TableHead>Nº NF</TableHead>
                        <TableHead>Chave NFe</TableHead>
                      </>
                    )}
                    {(currentMode === 'label' || currentMode === 'both') && (
                      <TableHead>Etiqueta</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id || i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-mono">{r.ext || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.id || '-'}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      {(currentMode === 'nfe' || currentMode === 'both') && (
                        <>
                          <TableCell className="font-mono">{r.nfNumber || '-'}</TableCell>
                          <TableCell>
                            {r.error ? (
                              <span className="text-xs text-red-500 font-medium">{r.error}</span>
                            ) : (
                              <span className="font-mono text-xs text-green-500 break-all">{r.nfeKey || '-'}</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      {(currentMode === 'label' || currentMode === 'both') && (
                        <TableCell>
                          {r.labelError ? (
                            <span className="text-xs text-red-500 font-medium">{r.labelError}</span>
                          ) : r.labelUrl ? (
                            <a href={r.labelUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium text-xs">
                              Abrir Etiqueta
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
