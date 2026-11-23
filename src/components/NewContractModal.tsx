import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Client, TripTemplate } from '../types/contract';
import { formatEuro, type TravelerRole, validateClientInput } from '../utils/contractLogic';

interface NewContractModalProps {
  open: boolean;
  templates: TripTemplate[];
  clients: Client[];
  suggestedContractNumber: string;
  initialTemplateId?: string;
  initialClientId?: string;
  onClose: () => void;
  onConfirm: (params: {
    templateId: string;
    client: Client;
    isNewClient: boolean;
    contractNumber: string;
    travelerRole: TravelerRole;
  }) => void;
}

export const NewContractModal: React.FC<NewContractModalProps> = ({
  open,
  templates,
  clients,
  suggestedContractNumber,
  initialTemplateId,
  initialClientId,
  onClose,
  onConfirm,
}) => {
  const [templateId, setTemplateId] = useState(initialTemplateId || templates[0]?.id || '');
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    clients.length > 0 ? 'existing' : 'new'
  );
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || '');
  const [contractNumber, setContractNumber] = useState(suggestedContractNumber);
  const [travelerRole, setTravelerRole] = useState<TravelerRole>('diver');

  const [newName, setNewName] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newLocality, setNewLocality] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setTemplateId(initialTemplateId || templates[0]?.id || '');
      setClientId(initialClientId || clients[0]?.id || '');
      setContractNumber(suggestedContractNumber);
      setClientMode(clients.length > 0 ? 'existing' : 'new');
      setErrors({});
    }
  }, [open, initialTemplateId, initialClientId, templates, clients, suggestedContractNumber]);

  if (!open) return null;

  const selectedTemplate = templates.find((t) => t.id === templateId) || templates[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    if (clientMode === 'existing') {
      const existing = clients.find((c) => c.id === clientId);
      if (!existing) {
        setErrors({ client: 'Selecciona un cliente o crea uno nuevo.' });
        return;
      }
      onConfirm({
        templateId: selectedTemplate.id,
        client: existing,
        isNewClient: false,
        contractNumber: contractNumber.trim() || suggestedContractNumber,
        travelerRole,
      });
      return;
    }

    const candidate: Client = {
      id: `cli-${Date.now()}`,
      ownerId: 'local-demo',
      fullName: newName.trim().toUpperCase(),
      dni: newDni.trim().toUpperCase(),
      locality: newLocality.trim().toUpperCase(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      notes: '',
      defaultRepresented: [],
    };
    const errs = validateClientInput(candidate);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onConfirm({
      templateId: selectedTemplate.id,
      client: candidate,
      isNewClient: true,
      contractNumber: contractNumber.trim() || suggestedContractNumber,
      travelerRole,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-contract-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="new-contract-title" className="text-base font-semibold text-slate-900">
              Crear nuevo contrato de viaje
            </h2>
            <p className="text-xs text-slate-500">
              Elige una plantilla editable y el cliente contratante principal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de nuevo contrato"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="nc-template" className="block text-xs font-medium text-slate-700 mb-1">
                Plantilla de viaje
              </label>
              <select
                id="nc-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nc-number" className="block text-xs font-medium text-slate-700 mb-1">
                Nº Contrato
              </label>
              <input
                id="nc-number"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {selectedTemplate && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-xs font-medium text-slate-700">
                Modalidad del contratante principal
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTravelerRole('diver')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                    travelerRole === 'diver'
                      ? 'bg-blue-50 border-blue-600 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block font-semibold">Buceador</span>
                  <span className="tabular-nums text-slate-600">
                    {formatEuro(selectedTemplate.diverPrice)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTravelerRole('non-diver')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                    travelerRole === 'non-diver'
                      ? 'bg-blue-50 border-blue-600 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block font-semibold">No buceador / Acompañante</span>
                  <span className="tabular-nums text-slate-600">
                    {formatEuro(selectedTemplate.nonDiverPrice)}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Contratante Principal</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setClientMode('existing')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    clientMode === 'existing'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Cliente existente
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('new')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    clientMode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Nuevo cliente
                </button>
              </div>
            </div>

            {clientMode === 'existing' ? (
              <div>
                <label htmlFor="nc-client" className="block text-xs font-medium text-slate-700 mb-1">
                  Seleccionar cliente
                </label>
                <select
                  id="nc-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — DNI {c.dni} ({c.locality})
                    </option>
                  ))}
                </select>
                {errors.client && <p className="text-xs text-red-600 mt-1">{errors.client}</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="nc-new-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre y apellidos
                  </label>
                  <input
                    id="nc-new-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. LUCÍA FERNÁNDEZ GÓMEZ"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor="nc-new-dni" className="block text-xs font-medium text-slate-700 mb-1">
                    DNI / NIE
                  </label>
                  <input
                    id="nc-new-dni"
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="12345678Z"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                  {errors.dni && <p className="text-xs text-red-600 mt-1">{errors.dni}</p>}
                </div>
                <div>
                  <label htmlFor="nc-new-loc" className="block text-xs font-medium text-slate-700 mb-1">
                    Localidad
                  </label>
                  <input
                    id="nc-new-loc"
                    type="text"
                    value={newLocality}
                    onChange={(e) => setNewLocality(e.target.value)}
                    placeholder="TARRAGONA (TARRAGONA)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  {errors.locality && <p className="text-xs text-red-600 mt-1">{errors.locality}</p>}
                </div>
                <div>
                  <label htmlFor="nc-new-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email (opcional)
                  </label>
                  <input
                    id="nc-new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="nc-new-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    id="nc-new-phone"
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
          >
            Generar y abrir contrato
          </button>
        </div>
      </form>
    </div>
  );
};
