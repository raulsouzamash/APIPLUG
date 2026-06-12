import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Download, Calendar, Loader as Loader2, Search } from 'lucide-react';

export default function BufferedPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchBuffered = async () => {
    setLoading(true);
    setResults([]);
    toast.info('Buscando agendamentos...');

    try {
      const response = await apiFetch('/api/orders/buffered');
      const data = response.orders || [];
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
    const map = {
      shipping_informed: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Enviado' },
      approved: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Aprovado' },
      buffered: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Em Agendamento' },
    };
    const { className, label } = map[status] || { className: 'bg-muted text-muted-foreground border-border', label: status || 'N/A' };
    return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${className}`}>{label}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const filtered = results.filter(r => {
    if (!filterDate) return true;
    if (!r.buffering_date) return false;
    return r.buffering_date.startsWith(filterDate);
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
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button
            className="gap-2"
            onClick={fetchBuffered}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading ? 'Buscando...' : 'Buscar Agendamentos'}
          </Button>
          {results.length > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={downloadXlsx}
            >
              <Download className="h-4 w-4" />
              Baixar Excel
            </Button>
          )}
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="filterDate" className="text-sm whitespace-nowrap">Filtrar por data:</Label>
                  <Input
                    id="filterDate"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-44"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-foreground">{results.length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Total Encontrados</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-primary/20 bg-primary/5">
                <div className="text-3xl font-bold text-primary">{results.filter(r => r.status === 'shipping_informed').length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Enviados</div>
              </div>
              <div className="border rounded-lg p-4 text-center border-amber-500/20 bg-amber-500/5">
                <div className="text-3xl font-bold text-amber-600">{results.filter(r => r.status === 'approved').length}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Aprovados</div>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID Interno</TableHead>
                    <TableHead>ID Externo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead className="font-bold">Data Agendamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id || i}>
                      <TableCell className="font-mono text-muted-foreground">{r.id || '-'}</TableCell>
                      <TableCell className="font-mono font-medium">{r.ext || '-'}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.created)}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatDate(r.buffering_date)}</TableCell>
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
