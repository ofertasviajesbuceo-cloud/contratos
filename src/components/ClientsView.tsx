import React, { useMemo, useState } from 'react';
import { FilePlus2, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import type { Client, RolePermissions } from '../types/contract';
import { validateClientInput } from '../utils/contractLogic';

interface ClientsViewProps {
  clients: Client[];
  permissions?: RolePermissions;
  onSaveClient: (client: Client, isNew: boolean) => void;
  onDeleteClient: (clientId: string) => void;
  onCreateContractForClient: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  permissions,
  onSaveClient,
  onDeleteClient,
  onCreateContractForClient,
}) => {
  const canEditClients = permissions?.canEditClients ?? true;
  const canEditContracts = permissions?.canEditContracts ?? true;
  const canDeleteRecords = permissions?.canDeleteRecords ?? true;
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [representedInput, setRepresentedInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.dni.toLowerCase().includes(q) ||
        c.locality.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openNew = () => {
    setIsNew(true);
    setErrors({});
    setRepresentedInput('');
    setEditingClient({
      id: `cli-${Date.now()}`,
      ownerId: 'local-demo',
      fullName: '',
      dni: '',
      locality: '',
      email: '',
      phone: '',
      notes: '',
      defaultRepresented: [],
    });
  };

  const openEdit = (client: Client) => {
    setIsNew(false);
    setErrors({});
    setRepresentedInput(client.defaultRepresented.join(', '));
    setEditingClient({ ...client, defaultRepresented: [...client.defaultRepresented] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const validation = validateClientInput(editingClient);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const defaultRepresented = representedInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSaveClient(
      {
        ...editingClient,
        fullName: editingClient.fullName.trim().toUpperCase(),
        dni: editingClient.dni.trim().toUpperCase(),
        locality: editingClient.locality.trim().toUpperCase(),
        defaultRepresented,
      },
      isNew
    );
    setEditingClient(null);
    setErrors({});
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Directorio de clientes ({clients.length})
          </h2>
          <p className="text-xs text-slate-500">
            Guarda los datos de contratantes habituales para rellenar sus contratos sin repetir información.
          </p>
        </div>
        {canEditClients && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Nuevo cliente
          </button>
        )}
      </div>

      {editingClient && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {isNew ? 'Registrar nuevo cliente' : `Editar ficha de ${editingClient.fullName}`}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Guardar cliente
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cli-fullname" className="block text-xs font-medium text-slate-700 mb-1">
                Nombre completo
              </label>
              <input
                id="cli-fullname"
                type="text"
                value={editingClient.fullName}
                onChange={(e) => setEditingClient({ ...editingClient, fullName: e.target.value })}
                placeholder="Ej. MARÍA PILAR LLAMAS BINABURO"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="cli-dni" className="block text-xs font-medium text-slate-700 mb-1">
                DNI / NIE / Pasaporte
              </label>
              <input
                id="cli-dni"
                type="text"
                value={editingClient.dni}
                onChange={(e) => setEditingClient({ ...editingClient, dni: e.target.value })}
                placeholder="Ej. 25187780C"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
              {errors.dni && <p className="text-xs text-red-600 mt-1">{errors.dni}</p>}
            </div>

            <div>
              <label htmlFor="cli-locality" className="block text-xs font-medium text-slate-700 mb-1">
                Localidad / Domicilio
              </label>
              <input
                id="cli-locality"
                type="text"
                value={editingClient.locality}
                onChange={(e) => setEditingClient({ ...editingClient, locality: e.target.value })}
                placeholder="Ej. TARRAGONA (TARRAGONA)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {errors.locality && <p className="text-xs text-red-600 mt-1">{errors.locality}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cli-email" className="block text-xs font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="cli-email"
                type="email"
                value={editingClient.email}
                onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="cli-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                id="cli-phone"
                type="text"
                value={editingClient.phone}
                onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="cli-rep" className="block text-xs font-medium text-slate-700 mb-1">
                Representados habituales (separados por coma)
              </label>
              <input
                id="cli-rep"
                type="text"
                value={representedInput}
                onChange={(e) => setRepresentedInput(e.target.value)}
                placeholder="Ej. Ana Pérez, Luis Pérez"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cli-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Notas de buceo / preferencias
            </label>
            <input
              id="cli-notes"
              type="text"
              value={editingClient.notes}
              onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="clients-search" className="sr-only">
              Buscar clientes por nombre, DNI o localidad
            </label>
            <input
              id="clients-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre, DNI o localidad..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              No se encontraron clientes con ese criterio
            </p>
            {canEditClients && (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Añadir cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 whitespace-nowrap">DNI / NIE</th>
                  <th className="py-3 px-4">Localidad</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{client.fullName}</div>
                      {client.notes && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          {client.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {client.dni}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{client.locality}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <div>{client.email || '—'}</div>
                      <div className="font-mono text-slate-500">{client.phone || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {canEditContracts && (
                          <button
                            type="button"
                            onClick={() => onCreateContractForClient(client.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap shrink-0"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Nuevo contrato
                          </button>
                        )}
                        {canEditClients && (
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            aria-label={`Editar cliente ${client.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                        {canDeleteRecords &&
                          (pendingDeleteId === client.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteClient(client.id);
                                setPendingDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(client.id)}
                              aria-label={`Eliminar cliente ${client.fullName}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
