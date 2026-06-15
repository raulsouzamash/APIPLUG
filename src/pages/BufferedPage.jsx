import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Download, Calendar, Loader as Loader2, Search, RefreshCw, Link as LinkIcon } from 'lucide-react';

export default function BufferedPage() {
  const [results, setResults] = useState(() => {
    try {
      const cached = localStorage.getItem('bufferedOrdersCache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [filterDateType, setFilterDateType] = useState('buffering_date');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('sheetUrl') || 'https://sheetdb.io/api/v1/qzli5h96oqz4z');
  const [syncing, setSyncing] = useState(false);

  const fetchBuffered = async () => {
    setLoading(true);
    setResults([]);
    toast.info('Buscando agendamentos...');

    try {
      let allOrders = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        toast.info(`Buscando página ${page}...`);
        const response = await apiFetch(`/api/orders/buffered?page=${page}`);
        const data = response.orders || [];
        allOrders = [...allOrders, ...data];
        
        hasMore = response.hasMore;
        if (hasMore) page++;
        
        // Limite de segurança para não rodar infinito (20 páginas = 2000 pedidos recentes)
        if (page > 20) break;
      }

      setResults(allOrders);
      try {
        localStorage.setItem('bufferedOrdersCache', JSON.stringify(allOrders));
      } catch (e) {
        console.warn('Falha ao salvar no cache', e);
      }

      if (allOrders.length === 0) {
        toast.warning('Nenhum agendamento encontrado.');
      } else {
        toast.success(`${allOrders.length} agendamentos encontrados e salvos no cache!`);
        // Sincroniza automaticamente após a busca, sem precisar clicar
        if (sheetUrl) {
          syncGoogleSheets(allOrders);
        }
      }
    } catch (e) {
      toast.error(e.message || 'Erro ao buscar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const downloadXlsx = () => {
    const data = results.map(r => ({
      ID_Interno: r.id || '',
      ID_Externo: r.ext || '',
      Status_Plataforma: r.status || '',
      Status_Calculado: getDaysDiff(r.buffering_date) < 0 ? 'Enviado' : 'Agendado',
      Data_Criacao: r.created || '',
      Data_Agendamento: r.buffering_date || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendados");
    XLSX.writeFile(wb, "agendados.xlsx");
  };

  const getDaysDiff = (dateStr) => {
    if (!dateStr) return null;
    
    // Pega apenas YYYY-MM-DD para evitar problemas de fuso horário (UTC)
    const [year, month, day] = dateStr.substring(0, 10).split('-');
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (r) => {
    const diffDays = getDaysDiff(r.buffering_date);
    if (diffDays === null) {
      return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border bg-muted text-muted-foreground border-border`}>N/A</span>;
    }
    
    if (diffDays < 0) {
      return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}>Enviado</span>;
    } else {
      return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border bg-amber-500/10 text-amber-600 border-amber-500/20`}>Agendado</span>;
    }
  };

  const renderDateWithBadge = (dateStr) => {
    if (!dateStr) return <span className="text-muted-foreground">-</span>;
    
    const [year, month, day] = dateStr.substring(0, 10).split('-');
    const formatted = `${day}/${month}/${year}`;
    const diffDays = getDaysDiff(dateStr);
    
    let badge = '';
    let badgeClass = '';
    if (diffDays === 0) {
      badge = 'Hoje';
      badgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    } else if (diffDays === 1) {
      badge = 'Amanhã';
      badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    } else if (diffDays > 1) {
      badge = `+ ${diffDays} dias`;
      badgeClass = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    } else if (diffDays === -1) {
      badge = 'Ontem';
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    } else {
      badge = `${diffDays} dias`;
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-200">{formatted}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeClass}`}>{badge}</span>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return <span className="text-muted-foreground">-</span>;
    const [year, month, day] = dateStr.substring(0, 10).split('-');
    return `${day}/${month}/${year}`;
  };

  const syncGoogleSheets = async (dataToSync = results) => {
    if (!sheetUrl) {
      toast.error('Cole a URL do Google Sheets primeiro!');
      return;
    }
    setSyncing(true);
    toast.info('Sincronizando agendamentos...');

    try {
      // 1. Busca os dados que já existem na planilha
      const existingRes = await fetch(sheetUrl);
      if (!existingRes.ok) throw new Error('Falha ao buscar dados antigos');
      const existingData = await existingRes.json();
      
      const existingMap = new Map();
      existingData.forEach(row => existingMap.set(row.id, row));

      const toCreate = [];
      const toUpdate = [];

      dataToSync.forEach(r => {
        const calculated = getDaysDiff(r.buffering_date) < 0 ? 'Enviado' : 'Agendado';
        
        let formattedDate = '';
        if (r.buffering_date) {
          const [year, month, day] = r.buffering_date.substring(0, 10).split('-');
          formattedDate = `${day}/${month}/${year}`;
        }

        let createdDate = '';
        if (r.created) {
          const [year, month, day] = r.created.substring(0, 10).split('-');
          createdDate = `${day}/${month}/${year}`;
        }
        
        const payload = {
          id: r.id || '',
          ext: r.ext || '',
          status: r.status || '',
          calculated_status: calculated,
          created: createdDate,
          buffering_date: formattedDate
        };

        const existingRow = existingMap.get(payload.id);
        
        if (!existingRow) {
          // É novo, vamos inserir
          toCreate.push(payload);
        } else {
          // Já existe, vamos verificar se mudou o status
          if (existingRow.status !== payload.status || existingRow.calculated_status !== payload.calculated_status) {
            toUpdate.push(payload);
          }
        }
      });

      // 2. Insere os novos todos de uma vez (Bulk POST)
      if (toCreate.length > 0) {
        await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: toCreate })
        });
      }

      // 3. Atualiza os que mudaram (PATCH individual para cada um alterado)
      // Fazemos isso em série para não sobrecarregar a API
      for (const update of toUpdate) {
        await fetch(`${sheetUrl}/id/${update.id}`, {
          method: 'PATCH',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: update })
        });
      }
      
      toast.success(`Sincronização concluída! ${toCreate.length} novos, ${toUpdate.length} atualizados.`);
    } catch (e) {
      toast.error('Erro ao sincronizar com a planilha.');
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = results.filter(r => {
    if (filterDate) {
      const targetDateStr = r[filterDateType]; // r.buffering_date, r.created, r.nfeDate
      if (!targetDateStr || !targetDateStr.startsWith(filterDate)) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchExt = r.ext && String(r.ext).toLowerCase().includes(term);
      const matchOther = r.other_ids && r.other_ids.some(id => String(id).toLowerCase().includes(term));
      const matchNfeKey = r.nfeKey && String(r.nfeKey).toLowerCase().includes(term);
      const matchNfeNum = r.nfNumber && String(r.nfNumber).toLowerCase().includes(term);
      if (!matchExt && !matchOther && !matchNfeKey && !matchNfeNum) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Exportar Agendamentos Pendentes
          </CardTitle>
          <CardDescription>
            Busca e exporta uma planilha com todos os pedidos dos últimos 30 dias que possuem data de agendamento definida.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
              onClick={fetchBuffered}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {loading ? 'Buscando...' : 'Buscar Agendamentos da API'}
            </Button>
            
            {results.length > 0 && (
              <Button
                variant="outline"
                className="gap-2 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                onClick={downloadXlsx}
              >
                <Download className="h-4 w-4" />
                Baixar Excel
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center mt-4 border-t border-slate-800 pt-6">
            <div className="relative flex-1 max-w-lg w-full">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cole a URL do Google Apps Script (Web App) aqui..."
                value={sheetUrl}
                onChange={(e) => {
                  setSheetUrl(e.target.value);
                  localStorage.setItem('sheetUrl', e.target.value);
                }}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap"
              onClick={() => syncGoogleSheets(results)}
              disabled={syncing || results.length === 0}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar com Planilha'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Agendamentos Encontrados</CardTitle>
                <CardDescription>{filtered.length} de {results.length} pedidos</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Buscar por ID Externo, NF ou Chave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <Label htmlFor="filterDate" className="text-sm whitespace-nowrap">Filtrar por data:</Label>
                  <div className="flex gap-2">
                    <select 
                      className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={filterDateType}
                      onChange={(e) => setFilterDateType(e.target.value)}
                    >
                      <option value="buffering_date">Agendamento</option>
                      <option value="created">Criação</option>
                      <option value="nfeDate">Faturamento</option>
                    </select>
                    <Input
                      id="filterDate"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full sm:w-40"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="border rounded-lg p-4 text-center border-slate-800 bg-slate-900/50">
                <div className="text-3xl font-bold text-white">{results.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Total</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-amber-500/20 bg-amber-500/5">
                <div className="text-3xl font-bold text-amber-500">{results.filter(r => getDaysDiff(r.buffering_date) >= 0).length}</div>
                <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mt-2">Agendados</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-emerald-500/20 bg-emerald-500/5">
                <div className="text-3xl font-bold text-emerald-500">{results.filter(r => getDaysDiff(r.buffering_date) < 0).length}</div>
                <div className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-2">Enviados</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-blue-500/20 bg-blue-500/5">
                <div className="text-3xl font-bold text-blue-400">{results.filter(r => getDaysDiff(r.buffering_date) === 1).length}</div>
                <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mt-2">Para Amanhã</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-indigo-500/20 bg-indigo-500/5 lg:col-span-1 col-span-2">
                <div className="text-3xl font-bold text-indigo-400">{results.filter(r => {
                  const d = getDaysDiff(r.buffering_date);
                  return d > 0 && d <= 3;
                }).length}</div>
                <div className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-widest mt-2">Próx. 3 dias</div>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID Interno</TableHead>
                    <TableHead>ID Externo</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead className="font-bold">Data Agendamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id || i} className="hover:bg-white/5 transition-colors border-slate-800">
                      <TableCell className="font-mono text-slate-400">{r.id || '-'}</TableCell>
                      <TableCell className="font-mono font-medium text-slate-300">{r.ext || '-'}</TableCell>
                      <TableCell className="font-mono text-slate-400">
                        {r.nfNumber ? (
                          <div title={r.nfeKey}>{r.nfNumber}</div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(r)}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(r.created)}</TableCell>
                      <TableCell className="font-medium text-blue-400">{renderDateWithBadge(r.buffering_date)}</TableCell>
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
