import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Plus,
  Search,
  Send,
  Trash2,
  Archive,
} from 'lucide-react';
import type { ContractStatus, RolePermissions, TravelContract } from '../types/contract';
import { formatEuro } from '../utils/contractLogic';

interface ContractsListViewProps {
  contracts: TravelContract[];
  permissions?: RolePermissions;
  onOpenContract: (contractId: string, initialMode?: 'split' | 'form' | 'preview') => void;
  onDuplicateContract: (contract: TravelContract) => void;
  onDeleteContract: (contractId: string) => void;
  onNewContract: () => void;
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  signed: 'Firmado',
  archived: 'Archivado',
};

function StatusLabel({ status }: { status: ContractStatus }) {
  if (status === 'signed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        {STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        {STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Archive className="w-3.5 h-3.5" aria-hidden="true" />
        {STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export const ContractsListView: React.FC<ContractsListViewProps> = ({
  contracts,
  permissions,
  onOpenContract,
  onDuplicateContract,
  onDeleteContract,
  onNewContract,
}) => {
  const canEditContracts = permissions?.canEditContracts ?? true;
  const canDeleteRecords = permissions?.canDeleteRecords ?? true;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contracts.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        c.contractNumber.toLowerCase().includes(q) ||
        c.clientFullName.toLowerCase().includes(q) ||
        c.clientDni.toLowerCase().includes(q) ||
        c.tripTitle.toLowerCase().includes(q)
      );
    });
  }, [contracts, searchQuery, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: contracts.length,
      draft: contracts.filter((c) => c.status === 'draft').length,
      sent: contracts.filter((c) => c.status === 'sent').length,
      signed: contracts.filter((c) => c.status === 'signed').length,
      archived: contracts.filter((c) => c.status === 'archived').length,
    };
  }, [contracts]);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Contratos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{counts.all}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Borradores activos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{counts.draft}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Enviados / Pendientes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{counts.sent}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Firmados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{counts.signed}</p>
        </div>
      </div>

      {/* Toolbar: Search + Status segmented filter */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="contracts-search" className="sr-only">
              Buscar contratos por número, cliente, DNI o destino
            </label>
            <input
              id="contracts-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nº contrato, cliente, DNI o viaje..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
            role="tablist"
            aria-label="Filtrar contratos por estado"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'draft', label: 'Borrador' },
                { id: 'sent', label: 'Enviado' },
                { id: 'signed', label: 'Firmado' },
                { id: 'archived', label: 'Archivado' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {contracts.length === 0
                ? 'Todavía no hay contratos guardados'
                : 'No hay contratos que coincidan con el filtro'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {contracts.length === 0
                ? 'Crea tu primer contrato seleccionando una plantilla de viaje editable y un cliente.'
                : 'Prueba limpiando el buscador o cambiando el estado seleccionado.'}
            </p>
            <div className="pt-2">
              {contracts.length === 0 ? (
                canEditContracts ? (
                  <button
                    type="button"
                    onClick={onNewContract}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Crear primer contrato
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Nº Contrato</th>
                  <th className="py-3 px-4">Contratante Principal</th>
                  <th className="py-3 px-4">Viaje y Fechas</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenContract(contract.id, 'split')}
                        className="font-mono text-xs font-semibold text-blue-700 hover:underline tabular-nums"
                      >
                        {contract.contractNumber}
                      </button>
                      <div className="text-xs text-slate-500 mt-0.5">{contract.contractDateText}</div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-900">{contract.clientFullName}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {contract.clientDni} · {contract.clientLocality}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-800">{contract.tripTitle}</div>
                      <div className="text-xs text-slate-500">
                        {contract.startDateText} — {contract.endDateText}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      <StatusLabel status={contract.status} />
                    </td>
                    <td className="py-3 px-4 align-middle text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatEuro(contract.totalAmount)}
                    </td>
                    <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenContract(contract.id, canEditContracts ? 'split' : 'preview')
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          {canEditContracts ? 'Editar' : 'Consultar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenContract(contract.id, 'preview')}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          Documento A4
                        </button>
                        {canEditContracts && (
                          <button
                            type="button"
                            onClick={() => onDuplicateContract(contract)}
                            aria-label={`Duplicar contrato ${contract.contractNumber}`}
                            title="Duplicar contrato"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                        {canDeleteRecords &&
                          (pendingDeleteId === contract.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteContract(contract.id);
                                  setPendingDeleteId(null);
                                }}
                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap shrink-0"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(contract.id)}
                              aria-label={`Eliminar contrato ${contract.contractNumber}`}
                              title="Eliminar contrato"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
