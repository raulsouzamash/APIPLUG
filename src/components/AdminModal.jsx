import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X, Trash2, CreditCard as Edit, Users, Loader as Loader2, Shield, User } from 'lucide-react';

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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Usuários do Sistema
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto space-y-6">
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-4">
              {editId ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  disabled={!!editId}
                />
              </div>
              <div className="w-full sm:w-36 space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <div className="w-full sm:w-32 space-y-2">
                <Label htmlFor="admin-role">Nível</Label>
                <select
                  id="admin-role"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreateOrUpdate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editId ? 'Salvar' : 'Criar'}
              </Button>
              {editId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
            {editId && <p className="text-xs text-muted-foreground mt-2">Deixe a senha em branco para manter a atual.</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Usuários Cadastrados</h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Email</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border">
                            <User className="h-3 w-3" />
                            Usuário
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.isMain ? (
                          <span className="text-xs text-muted-foreground italic">Principal</span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id, u.email)}>
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </div>
  );
}
