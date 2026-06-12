import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function BufferedPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchBuffered = async () => {
    setLoading(true);
    setResults([]);
    toast.info('Buscando agendamentos...');

    try {
      const { data } = await apiFetch('/api/orders/buffered', { method: 'POST' });
      setResults(data);
      if (data.length === 0) {
        toast.warning('Nenhum agendamento encontrado.');
      } else {
        toast.success(`${data.length} agendamentos encontrados!`);
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
      Status: r.status || '',
      Data_Criacao: r.created || '',
      Data_Agendamento: r.buffering_date || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendados");
    XLSX.writeFile(wb, "agendados.xlsx");
  };

  const getStatusBadge = (status) => {
    if (status === 'shipping_informed') return <span className="px-2 py-1 rounded text-xs font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Embalado</span>;
    if (status === 'approved') return <span className="px-2 py-1 rounded text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20">Aprovado</span>;
    return <span className="px-2 py-1 rounded text-xs font-bold border bg-muted text-muted-foreground border-border">{status}</span>;
  };

  const filtered = results.filter(r => {
    if (!filterDate) return true;
    if (!r.buffering_date) return false;
    return r.buffering_date.startsWith(filterDate);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-lg border-l-4 border-l-blue-500 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-xl">📅 Exportar Agendamentos Pendentes</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Busca e exporta uma planilha com todos os pedidos dos últimos 30 dias que não foram enviados e possuem data de agendamento (buffering_date).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full sm:w-auto text-base gap-2" 
            onClick={fetchBuffered} 
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Buscando...' : 'Buscar e Baixar (.xlsx)'}
          </Button>
          {results.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto text-base gap-2 mt-4 sm:mt-0 sm:ml-4" 
              onClick={downloadXlsx}
            >
              Baixar Novamente
            </Button>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="shadow-lg animate-slide-up">
          <CardHeader>
            <CardTitle>Agendamentos Encontrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="bg-muted/50 border p-5 rounded-xl text-center w-full sm:w-auto min-w-[160px]">
                <div className="text-3xl font-black">{filtered.length}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Total Encontrados</div>
              </div>
              <div className="flex flex-col justify-center max-w-sm w-full">
                <label className="text-sm font-semibold mb-2">Filtrar por Dia de Agendamento:</label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Interno</TableHead>
                    <TableHead>ID Externo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Data Agendamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id || i}>
                      <TableCell className="font-mono text-muted-foreground">{r.id || '-'}</TableCell>
                      <TableCell className="font-bold">{r.ext || '-'}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.created ? new Date(r.created).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="font-bold text-primary">{r.buffering_date ? new Date(r.buffering_date).toLocaleDateString() : '-'}</TableCell>
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
