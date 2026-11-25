import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { AgencyProfile, InsurancePolicyOption } from '../types/contract';
import { normalizeInsurancePolicies } from '../utils/contractLogic';

interface AgencySettingsModalProps {
  open: boolean;
  agency: AgencyProfile;
  onClose: () => void;
  onSave: (updated: AgencyProfile) => void;
}

export const AgencySettingsModal: React.FC<AgencySettingsModalProps> = ({
  open,
  agency,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<AgencyProfile>(() => ({
    ...agency,
    insurancePolicies: normalizeInsurancePolicies(agency.insurancePolicies),
  }));
  const [newInsurer, setNewInsurer] = useState('');
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');

  React.useEffect(() => {
    if (open) {
      setDraft({
        ...agency,
        insurancePolicies: normalizeInsurancePolicies(agency.insurancePolicies),
      });
      setNewInsurer('');
      setNewPolicyNumber('');
      setNewPolicyName('');
    }
  }, [open, agency]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agency-settings-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="agency-settings-title" className="text-base font-semibold text-slate-900">
              Datos legales y bancarios de la Agencia
            </h2>
            <p className="text-xs text-slate-500">
              Se reflejan automáticamente en la cabecera, cláusulas y pie de página de todos los contratos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración de agencia"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[72vh] overflow-y-auto">
          <div>
            <label htmlFor="ag-name" className="block text-xs font-medium text-slate-700 mb-1">
              Nombre comercial
            </label>
            <input
              id="ag-name"
              type="text"
              required
              value={draft.commercialName}
              onChange={(e) => setDraft({ ...draft, commercialName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-holder" className="block text-xs font-medium text-slate-700 mb-1">
              Titular legal / Organizador
            </label>
            <input
              id="ag-holder"
              type="text"
              required
              value={draft.legalHolderName}
              onChange={(e) => setDraft({ ...draft, legalHolderName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-cif" className="block text-xs font-medium text-slate-700 mb-1">
              CIF / NIF
            </label>
            <input
              id="ag-cif"
              type="text"
              required
              value={draft.cif}
              onChange={(e) => setDraft({ ...draft, cif: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-license" className="block text-xs font-medium text-slate-700 mb-1">
              Licencia de Agencia
            </label>
            <input
              id="ag-license"
              type="text"
              required
              value={draft.licenseNote}
              onChange={(e) => setDraft({ ...draft, licenseNote: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-addr1" className="block text-xs font-medium text-slate-700 mb-1">
              Dirección línea 1
            </label>
            <input
              id="ag-addr1"
              type="text"
              required
              value={draft.addressLine1}
              onChange={(e) => setDraft({ ...draft, addressLine1: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-addr2" className="block text-xs font-medium text-slate-700 mb-1">
              Dirección línea 2
            </label>
            <input
              id="ag-addr2"
              type="text"
              required
              value={draft.addressLine2}
              onChange={(e) => setDraft({ ...draft, addressLine2: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-phone" className="block text-xs font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              id="ag-phone"
              type="text"
              required
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-email" className="block text-xs font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="ag-email"
              type="email"
              required
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-iban" className="block text-xs font-medium text-slate-700 mb-1">
              IBAN por defecto
            </label>
            <input
              id="ag-iban"
              type="text"
              required
              value={draft.iban}
              onChange={(e) => setDraft({ ...draft, iban: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="ag-bic" className="block text-xs font-medium text-slate-700 mb-1">
              BIC
            </label>
            <input
              id="ag-bic"
              type="text"
              value={draft.bic}
              onChange={(e) => setDraft({ ...draft, bic: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ag-beneficiary" className="block text-xs font-medium text-slate-700 mb-1">
              Beneficiario de cuenta
            </label>
            <input
              id="ag-beneficiary"
              type="text"
              required
              value={draft.bankBeneficiary}
              onChange={(e) => setDraft({ ...draft, bankBeneficiary: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ag-footer" className="block text-xs font-medium text-slate-700 mb-1">
              Texto de pie de página (todas las hojas A4)
            </label>
            <input
              id="ag-footer"
              type="text"
              required
              value={draft.footerText}
              onChange={(e) => setDraft({ ...draft, footerText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="sm:col-span-2 border-t border-slate-200 pt-4 space-y-2.5">
            <div>
              <span className="block text-xs font-semibold text-slate-800">
                Listado de pólizas de seguro disponibles (Punto IX)
              </span>
              <p className="text-[11px] text-slate-500">
                Estas pólizas aparecerán en el desplegable al habilitar Seguros dentro de cada contrato.
              </p>
            </div>

            <div className="space-y-2">
              {(draft.insurancePolicies ?? []).map((policy, idx) => (
                <div
                  key={policy.id}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  <input
                    type="text"
                    aria-label={`Aseguradora póliza ${idx + 1}`}
                    value={policy.insurer}
                    placeholder="Aseguradora"
                    onChange={(e) => {
                      const next = [...(draft.insurancePolicies ?? [])];
                      next[idx] = { ...next[idx], insurer: e.target.value };
                      setDraft({ ...draft, insurancePolicies: next });
                    }}
                    className="col-span-3 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    aria-label={`Número póliza ${idx + 1}`}
                    value={policy.policyNumber}
                    placeholder="Nº Póliza"
                    onChange={(e) => {
                      const next = [...(draft.insurancePolicies ?? [])];
                      next[idx] = { ...next[idx], policyNumber: e.target.value };
                      setDraft({ ...draft, insurancePolicies: next });
                    }}
                    className="col-span-4 px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    aria-label={`Descripción póliza ${idx + 1}`}
                    value={policy.name}
                    placeholder="Descripción"
                    onChange={(e) => {
                      const next = [...(draft.insurancePolicies ?? [])];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setDraft({ ...draft, insurancePolicies: next });
                    }}
                    className="col-span-4 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                  <button
                    type="button"
                    disabled={(draft.insurancePolicies?.length ?? 0) <= 1}
                    aria-label={`Eliminar póliza ${policy.policyNumber}`}
                    onClick={() => {
                      const next = (draft.insurancePolicies ?? []).filter((_, i) => i !== idx);
                      setDraft({ ...draft, insurancePolicies: next });
                    }}
                    className="col-span-1 p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-40 flex justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                aria-label="Nueva aseguradora"
                placeholder="Aseguradora (ej. AXA)"
                value={newInsurer}
                onChange={(e) => setNewInsurer(e.target.value)}
                className="col-span-3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
              />
              <input
                type="text"
                aria-label="Nuevo número de póliza"
                placeholder="Nº de póliza"
                value={newPolicyNumber}
                onChange={(e) => setNewPolicyNumber(e.target.value)}
                className="col-span-4 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
              />
              <input
                type="text"
                aria-label="Descripción nueva póliza"
                placeholder="Descripción de cobertura"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                className="col-span-3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
              />
              <button
                type="button"
                disabled={!newPolicyNumber.trim() || (draft.insurancePolicies?.length ?? 0) >= 20}
                onClick={() => {
                  const num = newPolicyNumber.trim();
                  if (!num) return;
                  const insurer = newInsurer.trim() || 'AXA';
                  const option: InsurancePolicyOption = {
                    id: `pol-${Date.now()}`,
                    insurer,
                    policyNumber: num,
                    name: newPolicyName.trim() || `${insurer} · ${num}`,
                  };
                  setDraft({
                    ...draft,
                    insurancePolicies: [...(draft.insurancePolicies ?? []), option],
                  });
                  setNewInsurer('');
                  setNewPolicyNumber('');
                  setNewPolicyName('');
                }}
                className="col-span-2 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Añadir
              </button>
            </div>
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
            Guardar datos de agencia
          </button>
        </div>
      </form>
    </div>
  );
};
