import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X, UserPlus, Shield, Trash2, Edit } from 'lucide-react';

export default function AdminModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data } = await apiFetch('/api/admin/users');
      setUsers(data);
    } catch (e) {
      toast.error('Erro ao listar usuários: ' + e.message);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('user');
    setEditId(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!email) {
      toast.error('Email é obrigatório!');
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        await apiFetch(`/api/admin/users/${editId}`, {
          method: 'PUT',
          body: { email, password, role }
        });
        toast.success('Usuário atualizado!');
      } else {
        await apiFetch('/api/admin/users', {
          method: 'POST',
          body: { email, password, role }
        });
        toast.success('Usuário criado!');
      }
      resetForm();
      fetchUsers();
    } catch (e) {
      toast.error('Erro ao salvar usuário: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, userEmail) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast.success('Usuário excluído!');
      fetchUsers();
    } catch (e) {
      toast.error('Erro ao excluir: ' + e.message);
    }
  };

  const handleEdit = (u) => {
    setEditId(u.id);
    setEmail(u.email);
    setRole(u.role);
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b bg-card">
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="text-primary" />
            Painel de Usuários
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="bg-muted/50 border rounded-xl p-6 mb-8">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <UserPlus size={16} />
              {editId ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
            </h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
              </div>
              <div className="w-32 space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <div className="w-32 space-y-2">
                <Label>Nível</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateOrUpdate} disabled={loading}>
                  {editId ? 'Salvar' : 'Criar'}
                </Button>
                {editId && (
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                )}
              </div>
            </div>
            {editId && <p className="text-xs text-muted-foreground mt-2">Deixe a senha em branco se não quiser alterar.</p>}
          </div>
          
          <h3 className="text-sm font-bold mb-3">Usuários Cadastrados</h3>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold">{u.email}</TableCell>
                    <TableCell>
                      {u.role === 'admin' 
                        ? <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-md text-xs font-bold">Admin</span> 
                        : <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded-md text-xs font-bold">Usuário</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.isMain ? (
                        <span className="text-xs text-muted-foreground mr-4">Principal (Não editável)</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(u)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(u.id, u.email)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
