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
      shipping_informed: { bg: 'bg-green-500/10 text-green-500', label: '✓ Enviado' },
      invoice_error: { bg: 'bg-destructive/10 text-destructive', label: '⚠ Erro NF' },
      approved: { bg: 'bg-primary/10 text-primary', label: '● Enviar NF-e' },
      delivered: { bg: 'bg-green-500/10 text-green-500', label: '✓ Entregue' },
      cancelled: { bg: 'bg-muted text-muted-foreground', label: '✕ Cancelado' },
    };
    const { bg, label } = map[status] || { bg: 'bg-muted text-muted-foreground', label: status || 'N/A' };
    return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${bg}`}>{label}</span>;
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>IDs dos Pedidos</CardTitle>
            <CardDescription>Cole os IDs um por linha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <span className="absolute top-3 right-4 font-black text-slate-800 text-6xl opacity-30 select-none pointer-events-none">ORDER IDs</span>
              <textarea
                className="block min-h-[200px] w-full rounded-xl border-0 bg-black/40 p-4 text-white shadow-inner ring-1 ring-inset ring-white/5 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-black/60 text-lg disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono transition-all relative z-10 bg-transparent"
                placeholder="Cole os IDs..."
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                <strong>{orderCount}</strong> pedidos
              </span>
              <Button variant="ghost" size="sm" onClick={() => setOrderInput('')}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Escolha a operação que deseja realizar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 h-[160px]">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <Button 
                  className="h-full flex flex-col gap-2 bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 relative group overflow-hidden"
                  onClick={() => runAction('nfe')}
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Key size={24} className="text-blue-400 group-hover:text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <span className="font-semibold text-slate-200">Buscar Chaves</span>
                </Button>
                <Button 
                  className="h-full flex flex-col gap-2 bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300 relative group overflow-hidden"
                  onClick={() => runAction('label')}
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Tag size={24} className="text-emerald-400 group-hover:text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <span className="font-semibold text-slate-200">Baixar Etiquetas</span>
                </Button>
              </div>
              <Button 
                className="w-full flex-1 flex gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 text-lg group"
                onClick={() => runAction('both')}
                disabled={loading}
              >
                <Zap size={22} className="group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="font-bold tracking-wide">Ambos (NFe + Etiquetas)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>Resumo do processamento</CardDescription>
            </div>
            <div className="flex gap-2">
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
              <Card>
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Processados</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-2xl font-bold">{results.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Com Chave</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-2xl font-bold">{results.filter(r => r.nfeKey).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Com Etiqueta</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-2xl font-bold">{results.filter(r => r.labelUrl).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Aprovados</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-2xl font-bold">{results.filter(r => r.status === 'approved').length}</div>
                </CardContent>
              </Card>
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
