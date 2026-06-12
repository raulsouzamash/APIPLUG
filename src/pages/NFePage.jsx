import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Key, Tag, Zap, Search, Download, Printer, Loader as Loader2, Trash2 } from 'lucide-react';

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
      shipping_informed: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Enviado' },
      invoice_error: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Erro NF' },
      approved: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Aprovado' },
      delivered: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Entregue' },
      cancelled: { className: 'bg-muted text-muted-foreground border-border', label: 'Cancelado' },
    };
    const { className, label } = map[status] || { className: 'bg-muted text-muted-foreground border-border', label: status || 'N/A' };
    return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${className}`}>{label}</span>;
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              IDs dos Pedidos
            </CardTitle>
            <CardDescription>Cole os IDs um por linha para processar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="flex min-h-[200px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
              placeholder="Cole os IDs aqui...&#10;Um por linha"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{orderCount}</strong> pedidos
              </span>
              <Button variant="ghost" size="sm" onClick={() => setOrderInput('')} disabled={!orderInput}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Ações
            </CardTitle>
            <CardDescription>Escolha a operação que deseja realizar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                  onClick={() => runAction('nfe')}
                  disabled={loading || !orderCount}
                >
                  <Key className="h-6 w-6" />
                  <span className="font-semibold">Buscar Chaves</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                  onClick={() => runAction('label')}
                  disabled={loading || !orderCount}
                >
                  <Tag className="h-6 w-6" />
                  <span className="font-semibold">Baixar Etiquetas</span>
                </Button>
              </div>
              <Button
                className="h-14 gap-2"
                onClick={() => runAction('both')}
                disabled={loading || !orderCount}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                <span className="font-semibold">Ambos (NFe + Etiquetas)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>Resumo do processamento ({results.length} pedidos)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(currentMode === 'nfe' || currentMode === 'both') && (
                  <Button variant="secondary" size="sm" onClick={downloadNfeXlsx}>
                    <Download className="h-4 w-4 mr-1" />
                    Excel NFe
                  </Button>
                )}
                {(currentMode === 'label' || currentMode === 'both') && (
                  <Button variant="secondary" size="sm" onClick={downloadLabelsXlsx}>
                    <Download className="h-4 w-4 mr-1" />
                    Excel Etiquetas
                  </Button>
                )}
                {results.filter(r => r.labelUrl).length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => downloadPdfs(false)}>
                      <Download className="h-4 w-4 mr-1" />
                      PDFs
                    </Button>
                    <Button size="sm" onClick={() => downloadPdfs(true)}>
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimir
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-foreground">{results.length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Processados</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-primary/20 bg-primary/5">
                <div className="text-3xl font-bold text-primary">{results.filter(r => r.nfeKey).length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Com Chave</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-emerald-500/20 bg-emerald-500/5">
                <div className="text-3xl font-bold text-emerald-600">{results.filter(r => r.labelUrl).length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Com Etiqueta</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-amber-500/20 bg-amber-500/5">
                <div className="text-3xl font-bold text-amber-600">{results.filter(r => r.status === 'approved').length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Aprovados</div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NF ou ID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 max-w-sm"
              />
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
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
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-mono font-medium">{r.ext || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.id || '-'}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      {(currentMode === 'nfe' || currentMode === 'both') && (
                        <>
                          <TableCell className="font-mono">{r.nfNumber || '-'}</TableCell>
                          <TableCell>
                            {r.error ? (
                              <span className="text-xs text-destructive">{r.error}</span>
                            ) : (
                              <span className="font-mono text-xs text-emerald-600">{r.nfeKey || '-'}</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      {(currentMode === 'label' || currentMode === 'both') && (
                        <TableCell>
                          {r.labelError ? (
                            <span className="text-xs text-destructive">{r.labelError}</span>
                          ) : r.labelUrl ? (
                            <a href={r.labelUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium">
                              Abrir PDF
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
