import React, { useState } from 'react';
import { Copy, FilePlus2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { RolePermissions, TripTemplate } from '../types/contract';
import { formatEuro, validateTemplateInput } from '../utils/contractLogic';

interface TemplatesViewProps {
  templates: TripTemplate[];
  permissions?: RolePermissions;
  onSaveTemplate: (template: TripTemplate, isNew: boolean) => void;
  onDeleteTemplate: (templateId: string) => void;
  onCreateContractFromTemplate: (templateId: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  permissions,
  onSaveTemplate,
  onDeleteTemplate,
  onCreateContractFromTemplate,
}) => {
  const canEditTemplates = permissions?.canEditTemplates ?? true;
  const canEditContracts = permissions?.canEditContracts ?? true;
  const canDeleteRecords = permissions?.canDeleteRecords ?? true;
  const [editingTemplate, setEditingTemplate] = useState<TripTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const startNewTemplate = () => {
    const fresh: TripTemplate = {
      id: `tpl-${Date.now()}`,
      ownerId: 'local-demo',
      name: 'Nuevo Viaje de Buceo',
      tripTitle: 'NUEVO DESTINO - Buceo',
      destinationLabel: 'DESTINO',
      defaultStartDateText: '1 de mayo de 2026',
      defaultEndDateText: '5 de mayo de 2026',
      diverPrice: 650,
      nonDiverPrice: 320,
      priceSummaryText:
        '650,00 euros por persona buceador, + Suplementos (no incluidos), persona no buceadora 320€ + Suplementos (no incluidos).',
      bankConceptPrefix: 'BUCEO26',
      minGroupSize: 8,
      cancellationNoticeDays: 15,
      itineraryDays: [
        {
          title: 'Día 1 (Llegada).',
          description: 'Llegada al alojamiento y encuentro del grupo.',
        },
        {
          title: 'Día 2 (Inmersiones).',
          description: 'Desayuno y dos inmersiones guiadas por la mañana.',
        },
      ],
      destinationPayments: ['Comidas no mencionadas en el itinerario.', 'Gastos personales.'],
      optionalServices: [
        {
          id: 'srv-15l',
          label: 'Botella 15 Litros',
          note: '(Se abona en destino).',
          price: 0,
          selected: false,
        },
        {
          id: 'srv-ind',
          label: 'Habitación de uso INDIVIDUAL',
          note: '(+120€).',
          price: 120,
          selected: false,
        },
      ],
      transportIncluded: false,
      transportSummary: 'En el viaje combinado NO están incluidos los traslados hasta el destino.',
      transportCheckboxLabel: 'El cliente se trasladará por sus medios hasta el lugar de inicio del paquete.',
      insuranceBasicLabel:
        'El cliente DESEA contratar el Seguro Básico de Reembolso de Vacaciones NO Disfrutadas hasta 15.000€ - Asistencia Médica ILIMITADA (+25€)',
      insuranceBasicPrice: 25,
      insuranceCancellationLabel: 'El cliente DESEA contratar la cobertura adicional de anulación (+10€).',
      insuranceCancellationPrice: 10,
      maeDestinationUrl: 'https://www.exteriores.gob.es',
      anexoTransportDetail: 'Origen hasta destino',
      anexoManagementDetail: 'Gestión de pagos.',
      anexoAccommodationDetail: '5 días/4 noches en régimen alojamiento y desayuno.',
      anexoIncludedServices: ['Inmersiones según programa'],
      anexoHealthContacts: [
        'www.mae.es Consultar Sanidad Exterior;',
        'Centro de Atención Primaria Drassanes (Avda. Drassanes, 17-21 Tel. 93 443 05 07)',
      ],
      generalConditionsDate: '14 de septiembre de 2026',
    };
    setFormErrors({});
    setIsNewTemplate(true);
    setEditingTemplate(fresh);
  };

  const duplicateTemplate = (tpl: TripTemplate) => {
    const copy: TripTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      name: `${tpl.name} (Copia)`,
      itineraryDays: tpl.itineraryDays.map((d) => ({ ...d })),
      destinationPayments: [...tpl.destinationPayments],
      optionalServices: tpl.optionalServices.map((s) => ({ ...s })),
      anexoIncludedServices: [...tpl.anexoIncludedServices],
      anexoHealthContacts: [...tpl.anexoHealthContacts],
    };
    onSaveTemplate(copy, true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    const errs = validateTemplateInput(editingTemplate);
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    onSaveTemplate(editingTemplate, isNewTemplate);
    setEditingTemplate(null);
    setIsNewTemplate(false);
    setFormErrors({});
  };

  if (editingTemplate) {
    return (
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isNewTemplate ? 'Nueva plantilla de viaje' : `Editar plantilla: ${editingTemplate.name}`}
            </h2>
            <p className="text-xs text-slate-500">
              Los cambios que guardes estarán disponibles al instante al crear nuevos contratos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setFormErrors({});
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
            >
              Guardar plantilla
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="tpl-name" className="block text-xs font-medium text-slate-700 mb-1">
              Nombre interno de la plantilla
            </label>
            <input
              id="tpl-name"
              type="text"
              value={editingTemplate.name}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="tpl-title" className="block text-xs font-medium text-slate-700 mb-1">
              Título oficial en contrato (Punto II)
            </label>
            <input
              id="tpl-title"
              type="text"
              value={editingTemplate.tripTitle}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, tripTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {formErrors.tripTitle && <p className="text-xs text-red-600 mt-1">{formErrors.tripTitle}</p>}
          </div>
          <div>
            <label htmlFor="tpl-dest" className="block text-xs font-medium text-slate-700 mb-1">
              Destino (Tabla Punto XIV)
            </label>
            <input
              id="tpl-dest"
              type="text"
              value={editingTemplate.destinationLabel}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, destinationLabel: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {formErrors.destinationLabel && (
              <p className="text-xs text-red-600 mt-1">{formErrors.destinationLabel}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="tpl-start" className="block text-xs font-medium text-slate-700 mb-1">
              Fecha inicio por defecto
            </label>
            <input
              id="tpl-start"
              type="text"
              value={editingTemplate.defaultStartDateText}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, defaultStartDateText: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="tpl-end" className="block text-xs font-medium text-slate-700 mb-1">
              Fecha fin por defecto
            </label>
            <input
              id="tpl-end"
              type="text"
              value={editingTemplate.defaultEndDateText}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, defaultEndDateText: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="tpl-diver" className="block text-xs font-medium text-slate-700 mb-1">
              Precio buceador (€)
            </label>
            <input
              id="tpl-diver"
              type="number"
              step="0.01"
              min={0}
              value={editingTemplate.diverPrice}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, diverPrice: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="tpl-nondiver" className="block text-xs font-medium text-slate-700 mb-1">
              Precio no buceador (€)
            </label>
            <input
              id="tpl-nondiver"
              type="number"
              step="0.01"
              min={0}
              value={editingTemplate.nonDiverPrice}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, nonDiverPrice: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="tpl-prefix" className="block text-xs font-medium text-slate-700 mb-1">
              Prefijo concepto banco
            </label>
            <input
              id="tpl-prefix"
              type="text"
              value={editingTemplate.bankConceptPrefix}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, bankConceptPrefix: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="tpl-price-text" className="block text-xs font-medium text-slate-700 mb-1">
              Texto económico destacado (Punto III)
            </label>
            <input
              id="tpl-price-text"
              type="text"
              value={editingTemplate.priceSummaryText}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, priceSummaryText: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tpl-mingroup" className="block text-xs font-medium text-slate-700 mb-1">
                Mín. personas
              </label>
              <input
                id="tpl-mingroup"
                type="number"
                min={1}
                value={editingTemplate.minGroupSize}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    minGroupSize: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="tpl-days" className="block text-xs font-medium text-slate-700 mb-1">
                Preaviso días
              </label>
              <input
                id="tpl-days"
                type="number"
                min={0}
                value={editingTemplate.cancellationNoticeDays}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    cancellationNoticeDays: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Itinerary Days */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Itinerario por días</h3>
            <button
              type="button"
              onClick={() =>
                setEditingTemplate({
                  ...editingTemplate,
                  itineraryDays: [
                    ...editingTemplate.itineraryDays,
                    {
                      title: `Día ${editingTemplate.itineraryDays.length + 1}`,
                      description: 'Descripción de actividades e inmersiones.',
                    },
                  ],
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Añadir día
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editingTemplate.itineraryDays.map((day, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={day.title}
                    aria-label={`Título día ${idx + 1}`}
                    onChange={(e) => {
                      const next = [...editingTemplate.itineraryDays];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setEditingTemplate({ ...editingTemplate, itineraryDays: next });
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar día ${idx + 1}`}
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        itineraryDays: editingTemplate.itineraryDays.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={day.description}
                  aria-label={`Texto día ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...editingTemplate.itineraryDays];
                    next[idx] = { ...next[idx], description: e.target.value };
                    setEditingTemplate({ ...editingTemplate, itineraryDays: next });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Optional services + Anexo I */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Servicios opcionales (Punto VII)</h3>
              <button
                type="button"
                onClick={() =>
                  setEditingTemplate({
                    ...editingTemplate,
                    optionalServices: [
                      ...editingTemplate.optionalServices,
                      {
                        id: `srv-${Date.now()}`,
                        label: 'Nuevo suplemento',
                        note: '(Opcional)',
                        price: 0,
                        selected: false,
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Añadir servicio
              </button>
            </div>
            {editingTemplate.optionalServices.map((srv, idx) => (
              <div key={srv.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={srv.label}
                  aria-label={`Servicio ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...editingTemplate.optionalServices];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setEditingTemplate({ ...editingTemplate, optionalServices: next });
                  }}
                  className="col-span-5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={srv.note}
                  aria-label={`Nota servicio ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...editingTemplate.optionalServices];
                    next[idx] = { ...next[idx], note: e.target.value };
                    setEditingTemplate({ ...editingTemplate, optionalServices: next });
                  }}
                  className="col-span-4 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                />
                <input
                  type="number"
                  min={0}
                  value={srv.price}
                  aria-label={`Precio servicio ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...editingTemplate.optionalServices];
                    next[idx] = { ...next[idx], price: Number(e.target.value) || 0 };
                    setEditingTemplate({ ...editingTemplate, optionalServices: next });
                  }}
                  className="col-span-2 px-2 py-1.5 text-xs text-right font-mono tabular-nums border border-slate-200 rounded-md"
                />
                <button
                  type="button"
                  aria-label={`Eliminar servicio ${srv.label}`}
                  onClick={() =>
                    setEditingTemplate({
                      ...editingTemplate,
                      optionalServices: editingTemplate.optionalServices.filter((_, i) => i !== idx),
                    })
                  }
                  className="col-span-1 p-1 text-slate-400 hover:text-red-600 flex justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Ficha Técnica (Anexo I)</h3>
            <div>
              <label htmlFor="tpl-anexo-trans" className="block text-xs font-medium text-slate-700 mb-1">
                Transporte
              </label>
              <input
                id="tpl-anexo-trans"
                type="text"
                value={editingTemplate.anexoTransportDetail}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, anexoTransportDetail: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="tpl-anexo-aloj" className="block text-xs font-medium text-slate-700 mb-1">
                Alojamiento
              </label>
              <input
                id="tpl-anexo-aloj"
                type="text"
                value={editingTemplate.anexoAccommodationDetail}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, anexoAccommodationDetail: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="tpl-mae" className="block text-xs font-medium text-slate-700 mb-1">
                URL Ministerio de Asuntos Exteriores
              </label>
              <input
                id="tpl-mae"
                type="text"
                value={editingTemplate.maeDestinationUrl}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, maeDestinationUrl: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Plantillas editables de viajes ({templates.length})
          </h2>
          <p className="text-xs text-slate-500">
            Prepara itinerarios, precios base y fichas técnicas reutilizables para emitir contratos en segundos.
          </p>
        </div>
        {canEditTemplates && (
          <button
            type="button"
            onClick={startNewTemplate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Nueva plantilla
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">{tpl.name}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {tpl.destinationLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  Mín. {tpl.minGroupSize} pax
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{tpl.itineraryDays.length} bloques</span>
              </div>

              <p className="text-xs text-slate-600">
                {tpl.defaultStartDateText} — {tpl.defaultEndDateText}
              </p>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Buceador</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatEuro(tpl.diverPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No buceador</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatEuro(tpl.nonDiverPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {canEditContracts ? (
                <button
                  type="button"
                  onClick={() => onCreateContractFromTemplate(tpl.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Crear contrato
                </button>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">Solo lectura</span>
              )}

              <div className="flex items-center gap-1">
                {canEditTemplates && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewTemplate(false);
                        setFormErrors({});
                        setEditingTemplate({
                          ...tpl,
                          itineraryDays: tpl.itineraryDays.map((d) => ({ ...d })),
                          destinationPayments: [...tpl.destinationPayments],
                          optionalServices: tpl.optionalServices.map((s) => ({ ...s })),
                          anexoIncludedServices: [...tpl.anexoIncludedServices],
                          anexoHealthContacts: [...tpl.anexoHealthContacts],
                        });
                      }}
                      aria-label={`Editar plantilla ${tpl.name}`}
                      title="Editar plantilla"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateTemplate(tpl)}
                      aria-label={`Duplicar plantilla ${tpl.name}`}
                      title="Duplicar plantilla"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </>
                )}
                {canDeleteRecords &&
                  (pendingDeleteId === tpl.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTemplate(tpl.id);
                        setPendingDeleteId(null);
                      }}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap shrink-0"
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(tpl.id)}
                      aria-label={`Eliminar plantilla ${tpl.name}`}
                      title="Eliminar plantilla"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
