import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Columns2,
  Eye,
  FileEdit,
  PenTool,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import type {
  AgencyProfile,
  Client,
  ContractStatus,
  FlightPaymentMode,
  InstallmentCount,
  InsurancePolicyOption,
  SaveSyncState,
  TravelContract,
  TripTemplate,
} from '../types/contract';
import {
  buildInstallmentSchedule,
  calculateConceptTotal,
  extractDefaultPolicyFromLabel,
  formatEuro,
  normalizeFlightPaymentMode,
  normalizeInstallmentCount,
  normalizeInsurancePolicies,
  syncContractFinancialLines,
  validateContractInput,
} from '../utils/contractLogic';
import { ContractDocumentPreview } from './ContractDocumentPreview';

interface ContractEditorViewProps {
  contract: TravelContract;
  agency: AgencyProfile;
  clients: Client[];
  templates: TripTemplate[];
  initialViewMode?: 'split' | 'form' | 'preview';
  readOnly?: boolean;
  saveState: SaveSyncState;
  lastSavedAt: string | null;
  remoteError?: string | null;
  onChange: (updated: TravelContract) => void;
  onUpdateAgency?: (updated: AgencyProfile) => void;
  onSendForSignature?: () => void;
  onBack: () => void;
}

type EditorSection = 'cliente' | 'itinerario' | 'economico' | 'anexos';

export const ContractEditorView: React.FC<ContractEditorViewProps> = ({
  contract,
  agency,
  clients,
  templates,
  initialViewMode = 'split',
  readOnly = false,
  saveState,
  lastSavedAt,
  remoteError,
  onChange,
  onUpdateAgency,
  onSendForSignature,
  onBack,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'form' | 'preview'>(initialViewMode);
  const [activeSection, setActiveSection] = useState<EditorSection>('cliente');
  const [newRepresented, setNewRepresented] = useState('');
  const [newDestPayment, setNewDestPayment] = useState('');
  const [addingPolicy, setAddingPolicy] = useState(false);
  const [newPolicyInsurer, setNewPolicyInsurer] = useState('AXA');
  const [newPolicyNum, setNewPolicyNum] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (viewMode === 'form') return;
    const container = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!container || !content) return;

    const A4_PX_WIDTH = 794; // 210mm at 96dpi
    const updateScale = () => {
      const availableWidth = Math.max(280, container.clientWidth - 24);
      const nextScale = Math.min(1, availableWidth / A4_PX_WIDTH);
      setPreviewScale(nextScale);
      setScaledHeight(Math.ceil(content.scrollHeight * nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [viewMode, contract]);

  const isArchived = contract.status === 'archived' || readOnly;
  const errors = validateContractInput(contract);

  const updateField = <K extends keyof TravelContract>(key: K, value: TravelContract[K]) => {
    if (isArchived) return;
    onChange({ ...contract, [key]: value });
  };

  const handleSelectClient = (clientId: string) => {
    if (isArchived) return;
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    const prefix = contract.bankConcept.split(',')[0] || 'VIAJE';
    onChange({
      ...contract,
      clientId: found.id,
      clientFullName: found.fullName,
      clientDni: found.dni,
      clientLocality: found.locality,
      representedPeople: [...found.defaultRepresented],
      bankConcept: `${prefix}, ${found.fullName}`,
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (isArchived) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const next = syncContractFinancialLines({
      ...contract,
      templateId: tpl.id,
      templateName: tpl.name,
      tripTitle: tpl.tripTitle,
      startDateText: tpl.defaultStartDateText,
      endDateText: tpl.defaultEndDateText,
      diverPrice: tpl.diverPrice,
      nonDiverPrice: tpl.nonDiverPrice,
      priceSummaryText: tpl.priceSummaryText,
      bankConcept: `${tpl.bankConceptPrefix}, ${contract.clientFullName}`,
      minGroupSize: tpl.minGroupSize,
      cancellationNoticeDays: tpl.cancellationNoticeDays,
      itineraryDays: tpl.itineraryDays.map((d) => ({ ...d })),
      destinationPayments: [...tpl.destinationPayments],
      optionalServices: tpl.optionalServices.map((s) => ({ ...s, selected: false })),
      transportIncluded: tpl.transportIncluded,
      transportSummary: tpl.transportSummary,
      transportCheckboxLabel: tpl.transportCheckboxLabel,
      transportChecked: !tpl.transportIncluded,
      flightDetails: tpl.flightDetails ?? '',
      flightPrice: !tpl.transportIncluded ? tpl.flightPrice ?? 0 : 0,
      flightPaymentMode: normalizeFlightPaymentMode(tpl.flightPaymentMode),
      insuranceBasicLabel: tpl.insuranceBasicLabel,
      insuranceBasicPrice: tpl.insuranceBasicPrice,
      insuranceCancellationLabel: tpl.insuranceCancellationLabel,
      insuranceCancellationPrice: tpl.insuranceCancellationPrice,
      maeDestinationUrl: tpl.maeDestinationUrl,
      anexoTransportDetail: tpl.anexoTransportDetail,
      anexoManagementDetail: tpl.anexoManagementDetail,
      anexoAccommodationDetail: tpl.anexoAccommodationDetail,
      anexoIncludedServices: [...tpl.anexoIncludedServices],
      anexoHealthContacts: [...tpl.anexoHealthContacts],
      generalConditionsDate: tpl.generalConditionsDate,
    });
    onChange(next);
  };

  const handleToggleOptionalService = (serviceId: string) => {
    if (isArchived) return;
    const nextServices = contract.optionalServices.map((s) =>
      s.id === serviceId ? { ...s, selected: !s.selected } : s
    );
    onChange(
      syncContractFinancialLines({
        ...contract,
        optionalServices: nextServices,
      })
    );
  };

  const insurancePolicies = normalizeInsurancePolicies(agency.insurancePolicies);
  const anyInsuranceSelected =
    contract.insuranceBasicSelected || contract.insuranceCancellationSelected;

  const handleToggleInsurance = (
    field: 'insuranceBasicSelected' | 'insuranceCancellationSelected'
  ) => {
    if (isArchived) return;
    const nextBasic =
      field === 'insuranceBasicSelected'
        ? !contract.insuranceBasicSelected
        : contract.insuranceBasicSelected;
    const nextCancel =
      field === 'insuranceCancellationSelected'
        ? !contract.insuranceCancellationSelected
        : contract.insuranceCancellationSelected;

    const defaultPolicy =
      contract.insurancePolicyNumber?.trim() ||
      extractDefaultPolicyFromLabel(contract.insuranceBasicLabel) ||
      insurancePolicies[0]?.policyNumber ||
      '';

    onChange(
      syncContractFinancialLines({
        ...contract,
        insuranceBasicSelected: nextBasic,
        insuranceCancellationSelected: nextCancel,
        insurancePolicyNumber: nextBasic || nextCancel ? defaultPolicy : contract.insurancePolicyNumber,
        declineAssistanceInsurance: !nextBasic,
        declineCancellationInsurance: !nextCancel,
      })
    );
  };

  const handleSaveNewPolicy = () => {
    const cleanNum = newPolicyNum.trim();
    if (!cleanNum || !onUpdateAgency) return;
    const cleanInsurer = newPolicyInsurer.trim() || 'AXA';
    const createdPolicy: InsurancePolicyOption = {
      id: `pol-${Date.now()}`,
      insurer: cleanInsurer,
      policyNumber: cleanNum,
      name: newPolicyName.trim() || `${cleanInsurer} · ${cleanNum}`,
    };
    const nextPolicies = [...insurancePolicies, createdPolicy].slice(0, 20);
    onUpdateAgency({ ...agency, insurancePolicies: nextPolicies });
    onChange({ ...contract, insurancePolicyNumber: cleanNum });
    setAddingPolicy(false);
    setNewPolicyNum('');
    setNewPolicyName('');
  };

  const handleConceptAmountChange = (conceptId: string, amountStr: string) => {
    if (isArchived) return;
    const amount = Number(amountStr);
    const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    const updatedLines = contract.conceptLines.map((line) =>
      line.id === conceptId ? { ...line, amount: safeAmount } : line
    );
    const totalAmount = calculateConceptTotal(updatedLines);
    const nextDraft: TravelContract = {
      ...contract,
      ...(conceptId === 'flights' ? { flightPrice: safeAmount } : {}),
      conceptLines: updatedLines,
      totalAmount,
    };
    const updatedInstallments = buildInstallmentSchedule(nextDraft).flatMap((stage) => stage.lines);
    onChange({
      ...nextDraft,
      installmentLines: updatedInstallments,
    });
  };

  const handleConceptLabelChange = (conceptId: string, label: string) => {
    if (isArchived) return;
    const updatedLines = contract.conceptLines.map((line) =>
      line.id === conceptId ? { ...line, label } : line
    );
    const nextDraft: TravelContract = {
      ...contract,
      conceptLines: updatedLines,
    };
    onChange({
      ...nextDraft,
      installmentLines: buildInstallmentSchedule(nextDraft).flatMap((stage) => stage.lines),
    });
  };

  const handleInstallmentCountChange = (count: InstallmentCount) => {
    if (isArchived) return;
    const nextDraft: TravelContract = {
      ...contract,
      installmentCount: count,
    };
    onChange({
      ...nextDraft,
      installmentLines: buildInstallmentSchedule(nextDraft).flatMap((stage) => stage.lines),
    });
  };

  const handleTransportOptionChange = (included: boolean) => {
    if (isArchived) return;
    const currentSummary = (contract.transportSummary ?? '').trim();
    let nextSummary = currentSummary;
    if (included) {
      if (
        !currentSummary ||
        /\bno\s+est[aá]n\s+incluido/i.test(currentSummary) ||
        /no\s+incluidos/i.test(currentSummary)
      ) {
        nextSummary =
          'En el viaje combinado SÍ están incluidos los vuelos según las fechas y datos detallados.';
      }
    } else if (
      !currentSummary ||
      /\bs[ií]\s+est[aá]n\s+incluido/i.test(currentSummary)
    ) {
      nextSummary =
        'En el viaje combinado NO están incluidos los vuelos en el paquete base (detalle aparte).';
    }

    const currentCheckbox = (contract.transportCheckboxLabel ?? '').trim();
    let nextCheckbox = currentCheckbox;
    if (included) {
      if (
        !currentCheckbox ||
        /vuelos\s+aparte/i.test(currentCheckbox) ||
        /no\s+incluidos/i.test(currentCheckbox)
      ) {
        nextCheckbox = 'Vuelos incluidos y condiciones de transporte confirmadas según ficha técnica.';
      }
    } else if (
      !currentCheckbox ||
      /vuelos.*incluidos/i.test(currentCheckbox)
    ) {
      nextCheckbox = 'El cliente conoce las condiciones de transporte y los datos/importe de los vuelos aparte.';
    }

    onChange(
      syncContractFinancialLines({
        ...contract,
        transportIncluded: included,
        transportSummary: nextSummary,
        transportCheckboxLabel: nextCheckbox,
        flightPrice: included ? 0 : contract.flightPrice ?? 0,
      })
    );
  };

  const handleFlightPriceChange = (priceStr: string) => {
    if (isArchived) return;
    const parsed = Number(priceStr);
    const safePrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    onChange(
      syncContractFinancialLines({
        ...contract,
        transportIncluded: false,
        flightPrice: safePrice,
      })
    );
  };

  const handleFlightPaymentModeChange = (mode: FlightPaymentMode) => {
    if (isArchived) return;
    onChange(
      syncContractFinancialLines({
        ...contract,
        flightPaymentMode: mode,
      })
    );
  };

  const activeFlightMode = normalizeFlightPaymentMode(contract.flightPaymentMode);

  const renderTransportFlightsBlock = (showAnexoDetailInput: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="block text-xs font-semibold text-slate-700">
          Transporte y Vuelos (Punto VIII y Anexo I)
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          {contract.transportIncluded ? 'Opción 1: Incluidos' : 'Opción 2: Aparte'}
        </span>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        role="radiogroup"
        aria-label="Modalidad de vuelos en Punto VIII y Anexo I"
      >
        <button
          type="button"
          role="radio"
          aria-checked={contract.transportIncluded}
          disabled={isArchived}
          onClick={() => handleTransportOptionChange(true)}
          className={`flex items-start gap-2 p-2.5 text-left rounded-lg border transition-colors ${
            contract.transportIncluded
              ? 'bg-blue-50 border-blue-600 text-blue-900'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span
            className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              contract.transportIncluded ? 'border-blue-700' : 'border-slate-400'
            }`}
          >
            {contract.transportIncluded && (
              <span className="w-2 h-2 rounded-full bg-blue-700" />
            )}
          </span>
          <span className="text-xs leading-snug">
            <span className="font-semibold block">Opción 1 · Vuelos incluidos</span>
            <span className="text-[11px] opacity-80">
              Incluidos en el precio del viaje. Añade fechas y datos de vuelo.
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={!contract.transportIncluded}
          disabled={isArchived}
          onClick={() => handleTransportOptionChange(false)}
          className={`flex items-start gap-2 p-2.5 text-left rounded-lg border transition-colors ${
            !contract.transportIncluded
              ? 'bg-blue-50 border-blue-600 text-blue-900'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span
            className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              !contract.transportIncluded ? 'border-blue-700' : 'border-slate-400'
            }`}
          >
            {!contract.transportIncluded && (
              <span className="w-2 h-2 rounded-full bg-blue-700" />
            )}
          </span>
          <span className="text-xs leading-snug">
            <span className="font-semibold block">Opción 2 · Vuelos aparte</span>
            <span className="text-[11px] opacity-80">
              Añade datos de vuelos y su precio aparte al Punto XIV.
            </span>
          </span>
        </button>
      </div>

      <div>
        <label
          htmlFor="ctr-flight-details"
          className="block text-xs font-medium text-slate-700 mb-1"
        >
          Fechas y datos de los vuelos
        </label>
        <textarea
          id="ctr-flight-details"
          rows={2}
          disabled={isArchived}
          value={contract.flightDetails ?? ''}
          onChange={(e) => updateField('flightDetails', e.target.value)}
          placeholder="Ej. Ida 10/10 BCN 08:30 -> HRG 14:15 (IB3412) · Vuelta 17/10 HRG 15:20 -> BCN 19:45"
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {!contract.transportIncluded && (
        <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label
                htmlFor="ctr-flight-price"
                className="block text-xs font-medium text-slate-800 mb-1"
              >
                Precio de los vuelos aparte (€)
              </label>
              <input
                id="ctr-flight-price"
                type="number"
                step="0.01"
                min={0}
                disabled={isArchived}
                value={contract.flightPrice ?? 0}
                onChange={(e) => handleFlightPriceChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {(contract.flightPrice ?? 0) > 0
                ? 'Se suma automáticamente en el Resumen de Conceptos y Pagos (Punto XIV).'
                : 'Si indicas un importe mayor que 0 €, se añadirá al Punto XIV.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">
              Forma de abono de los vuelos aparte
            </span>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Forma de pago de los vuelos aparte"
            >
              <button
                type="button"
                role="radio"
                aria-checked={activeFlightMode === 'first_installment'}
                disabled={isArchived}
                onClick={() => handleFlightPaymentModeChange('first_installment')}
                className={`px-2.5 py-2 text-xs font-medium rounded-md border text-left transition-colors ${
                  activeFlightMode === 'first_installment'
                    ? 'bg-white border-blue-600 text-blue-800 shadow-sm'
                    : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Abonar íntegramente en el 1º pago
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={activeFlightMode === 'prorated'}
                disabled={isArchived}
                onClick={() => handleFlightPaymentModeChange('prorated')}
                className={`px-2.5 py-2 text-xs font-medium rounded-md border text-left transition-colors ${
                  activeFlightMode === 'prorated'
                    ? 'bg-white border-blue-600 text-blue-800 shadow-sm'
                    : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Prorratear en los plazos seleccionados
              </button>
            </div>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          disabled={isArchived}
          checked={contract.transportChecked}
          onChange={(e) => updateField('transportChecked', e.target.checked)}
          className="rounded border-slate-300 text-blue-700"
        />
        <span>{contract.transportCheckboxLabel}</span>
      </label>

      {showAnexoDetailInput && (
        <div>
          <label htmlFor="ctr-anexo-trans" className="block text-xs font-medium text-slate-700 mb-1">
            Detalle Transporte (Anexo I - A)
          </label>
          <input
            id="ctr-anexo-trans"
            type="text"
            disabled={isArchived}
            value={contract.anexoTransportDetail}
            onChange={(e) => updateField('anexoTransportDetail', e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
          />
        </div>
      )}
    </div>
  );

  const handlePrint = () => {
    if (viewMode === 'form') {
      setViewMode('split');
      setTimeout(() => window.print(), 100);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Volver a contratos
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 truncate">
              <span className="font-mono tabular-nums">{contract.contractNumber}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="truncate">{contract.clientFullName}</span>
            </div>
            <p className="text-xs text-slate-500">
              {saveState === 'saving' && 'Guardando cambios automáticamente...'}
              {saveState === 'saved' &&
                `Guardado automático en base de datos${lastSavedAt ? ` · ${lastSavedAt}` : ''}`}
              {saveState === 'local' &&
                `Guardado local automático${lastSavedAt ? ` · ${lastSavedAt}` : ''}`}
              {saveState === 'error' && (
                <span className="text-red-700 font-medium">
                  {remoteError || 'Error al guardar cambios en la nube'}
                </span>
              )}
              {saveState === 'idle' && `Plantilla: ${contract.templateName || 'Personalizada'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Modo de visualización del editor"
          >
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'form'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" aria-hidden="true" />
              Formulario
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
              Dividido
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Vista A4 (7 págs.)
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Imprimir / Guardar PDF
          </button>

          {!readOnly && onSendForSignature && (
            <button
              type="button"
              onClick={onSendForSignature}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
              Enviar a la firma
            </button>
          )}
        </div>
      </div>

      {contract.status === 'archived' ? (
        <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
          Este contrato está <strong>Archivado</strong> y bloqueado contra ediciones para conservar su registro histórico. Puedes duplicarlo si necesitas generar una nueva versión.
        </div>
      ) : readOnly ? (
        <div className="no-print bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm">
          Modo <strong>Solo lectura</strong>: tu usuario puede consultar todos los datos e imprimir el documento en PDF, pero no realizar modificaciones.
        </div>
      ) : null}

      {/* Main Split Area */}
      <div
        className={`grid gap-6 items-start ${
          viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {/* Left Form Column */}
        {viewMode !== 'preview' && (
          <div
            className={`no-print bg-white border border-slate-200 rounded-xl overflow-hidden ${
              viewMode === 'split' ? 'xl:col-span-5' : ''
            }`}
          >
            {/* Section Tabs */}
            <div className="border-b border-slate-200 px-2 pt-2 grid grid-cols-4 gap-1">
              {(
                [
                  { id: 'cliente', label: '1. Cliente' },
                  { id: 'itinerario', label: '2. Itinerario' },
                  { id: 'economico', label: '3. Precios' },
                  { id: 'anexos', label: '4. Anexos' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-2 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap text-center ${
                    activeSection === tab.id
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
              {activeSection === 'cliente' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ctr-number" className="block text-xs font-medium text-slate-700 mb-1">
                        Nº Contrato
                      </label>
                      <input
                        id="ctr-number"
                        type="text"
                        disabled={isArchived}
                        value={contract.contractNumber}
                        onChange={(e) => updateField('contractNumber', e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      {errors.contractNumber && (
                        <p className="text-xs text-red-600 mt-1">{errors.contractNumber}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="ctr-date" className="block text-xs font-medium text-slate-700 mb-1">
                        Fecha del contrato
                      </label>
                      <input
                        id="ctr-date"
                        type="text"
                        disabled={isArchived}
                        value={contract.contractDateText}
                        onChange={(e) => updateField('contractDateText', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ctr-status" className="block text-xs font-medium text-slate-700 mb-1">
                        Estado del contrato
                      </label>
                      <select
                        id="ctr-status"
                        disabled={isArchived}
                        value={contract.status}
                        onChange={(e) => updateField('status', e.target.value as ContractStatus)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviado al cliente</option>
                        <option value="signed">Firmado</option>
                        <option value="archived">Archivado (bloqueado)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ctr-template-switch" className="block text-xs font-medium text-slate-700 mb-1">
                        Aplicar plantilla de viaje
                      </label>
                      <select
                        id="ctr-template-switch"
                        disabled={isArchived}
                        value={contract.templateId}
                        onChange={(e) => handleApplyTemplate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Seleccionar plantilla...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <div>
                      <label htmlFor="ctr-client-pick" className="block text-xs font-medium text-slate-700 mb-1">
                        Cargar cliente existente
                      </label>
                      <select
                        id="ctr-client-pick"
                        disabled={isArchived}
                        value={contract.clientId}
                        onChange={(e) => handleSelectClient(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Cliente personalizado...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.dni})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ctr-client-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Nombre y apellidos del Contratante Principal
                      </label>
                      <input
                        id="ctr-client-name"
                        type="text"
                        disabled={isArchived}
                        value={contract.clientFullName}
                        onChange={(e) => updateField('clientFullName', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      {errors.clientFullName && (
                        <p className="text-xs text-red-600 mt-1">{errors.clientFullName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ctr-client-dni" className="block text-xs font-medium text-slate-700 mb-1">
                          DNI / NIE / Pasaporte
                        </label>
                        <input
                          id="ctr-client-dni"
                          type="text"
                          disabled={isArchived}
                          value={contract.clientDni}
                          onChange={(e) => updateField('clientDni', e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        {errors.clientDni && (
                          <p className="text-xs text-red-600 mt-1">{errors.clientDni}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="ctr-client-loc" className="block text-xs font-medium text-slate-700 mb-1">
                          Localidad / Domicilio
                        </label>
                        <input
                          id="ctr-client-loc"
                          type="text"
                          disabled={isArchived}
                          value={contract.clientLocality}
                          onChange={(e) => updateField('clientLocality', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        {errors.clientLocality && (
                          <p className="text-xs text-red-600 mt-1">{errors.clientLocality}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-slate-700 mb-1.5">
                        Lista de representados por el Contratante Principal
                      </span>
                      <div className="space-y-2">
                        {contract.representedPeople.map((person, idx) => (
                          <div key={`${person}-${idx}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              disabled={isArchived}
                              value={person}
                              aria-label={`Representado ${idx + 1}`}
                              onChange={(e) => {
                                const next = [...contract.representedPeople];
                                next[idx] = e.target.value;
                                updateField('representedPeople', next);
                              }}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                            />
                            <button
                              type="button"
                              disabled={isArchived}
                              aria-label={`Eliminar representado ${person}`}
                              onClick={() =>
                                updateField(
                                  'representedPeople',
                                  contract.representedPeople.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={isArchived}
                            value={newRepresented}
                            onChange={(e) => setNewRepresented(e.target.value)}
                            placeholder="Añadir nombre de representado..."
                            aria-label="Nuevo representado"
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            disabled={isArchived || !newRepresented.trim()}
                            onClick={() => {
                              if (!newRepresented.trim()) return;
                              updateField('representedPeople', [
                                ...contract.representedPeople,
                                newRepresented.trim(),
                              ]);
                              setNewRepresented('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            Añadir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'itinerario' && (
                <>
                  <div>
                    <label htmlFor="ctr-trip-title" className="block text-xs font-medium text-slate-700 mb-1">
                      Identificación del viaje (Punto II)
                    </label>
                    <input
                      id="ctr-trip-title"
                      type="text"
                      disabled={isArchived}
                      value={contract.tripTitle}
                      onChange={(e) => updateField('tripTitle', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {errors.tripTitle && (
                      <p className="text-xs text-red-600 mt-1">{errors.tripTitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ctr-start" className="block text-xs font-medium text-slate-700 mb-1">
                        Fecha de inicio (Punto I)
                      </label>
                      <input
                        id="ctr-start"
                        type="text"
                        disabled={isArchived}
                        value={contract.startDateText}
                        onChange={(e) => updateField('startDateText', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="ctr-end" className="block text-xs font-medium text-slate-700 mb-1">
                        Fecha de finalización (Punto I)
                      </label>
                      <input
                        id="ctr-end"
                        type="text"
                        disabled={isArchived}
                        value={contract.endDateText}
                        onChange={(e) => updateField('endDateText', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ctr-min-group" className="block text-xs font-medium text-slate-700 mb-1">
                        Mínimo personas grupo (Punto IV)
                      </label>
                      <input
                        id="ctr-min-group"
                        type="number"
                        min={1}
                        disabled={isArchived}
                        value={contract.minGroupSize}
                        onChange={(e) => updateField('minGroupSize', Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="ctr-cancel-days" className="block text-xs font-medium text-slate-700 mb-1">
                        Días preaviso cancelación
                      </label>
                      <input
                        id="ctr-cancel-days"
                        type="number"
                        min={0}
                        disabled={isArchived}
                        value={contract.cancellationNoticeDays}
                        onChange={(e) =>
                          updateField('cancellationNoticeDays', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ctr-special-req" className="block text-xs font-medium text-slate-700 mb-1">
                      Solicitud especial del cliente (Punto IV)
                    </label>
                    <textarea
                      id="ctr-special-req"
                      rows={2}
                      disabled={isArchived}
                      value={contract.clientSpecialRequest}
                      onChange={(e) => updateField('clientSpecialRequest', e.target.value)}
                      placeholder="Ej. Alergias alimentarias, botella 15L DIN, cama doble..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Itinerario día a día ({contract.itineraryDays.length})
                      </span>
                      <button
                        type="button"
                        disabled={isArchived || contract.itineraryDays.length >= 30}
                        onClick={() =>
                          updateField('itineraryDays', [
                            ...contract.itineraryDays,
                            {
                              title: `Día ${contract.itineraryDays.length + 1}`,
                              description: 'Descripción de la jornada...',
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        Añadir día
                      </button>
                    </div>

                    {contract.itineraryDays.map((day, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={isArchived}
                            aria-label={`Título del día ${idx + 1}`}
                            value={day.title}
                            onChange={(e) => {
                              const next = [...contract.itineraryDays];
                              next[idx] = { ...next[idx], title: e.target.value };
                              updateField('itineraryDays', next);
                            }}
                            className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md"
                          />
                          <button
                            type="button"
                            disabled={isArchived}
                            aria-label={`Eliminar día ${idx + 1}`}
                            onClick={() =>
                              updateField(
                                'itineraryDays',
                                contract.itineraryDays.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          disabled={isArchived}
                          aria-label={`Descripción del día ${idx + 1}`}
                          value={day.description}
                          onChange={(e) => {
                            const next = [...contract.itineraryDays];
                            next[idx] = { ...next[idx], description: e.target.value };
                            updateField('itineraryDays', next);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeSection === 'economico' && (
                <>
                  <div>
                    <label htmlFor="ctr-price-text" className="block text-xs font-medium text-slate-700 mb-1">
                      Texto destacado de precios (Punto III)
                    </label>
                    <textarea
                      id="ctr-price-text"
                      rows={2}
                      disabled={isArchived}
                      value={contract.priceSummaryText}
                      onChange={(e) => updateField('priceSummaryText', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ctr-iban" className="block text-xs font-medium text-slate-700 mb-1">
                        IBAN transferencia
                      </label>
                      <input
                        id="ctr-iban"
                        type="text"
                        disabled={isArchived}
                        value={contract.bankIban}
                        onChange={(e) => updateField('bankIban', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="ctr-concept" className="block text-xs font-medium text-slate-700 mb-1">
                        Concepto bancario
                      </label>
                      <input
                        id="ctr-concept"
                        type="text"
                        disabled={isArchived}
                        value={contract.bankConcept}
                        onChange={(e) => updateField('bankConcept', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Punto VII Optional Services */}
                  <div className="border-t border-slate-200 pt-4 space-y-2.5">
                    <span className="block text-xs font-semibold text-slate-700">
                      Servicios Opcionales (Punto VII)
                    </span>
                    {contract.optionalServices.map((srv) => (
                      <label
                        key={srv.id}
                        className="flex items-start justify-between gap-3 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            disabled={isArchived}
                            checked={srv.selected}
                            onChange={() => handleToggleOptionalService(srv.id)}
                            className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                          />
                          <div className="text-xs">
                            <span className="font-medium text-slate-900">{srv.label}</span>
                            {srv.note && <span className="block text-slate-500">{srv.note}</span>}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
                          {srv.price > 0 ? `+${formatEuro(srv.price)}` : 'En destino'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Punto IX Insurance */}
                  <div className="border-t border-slate-200 pt-4 space-y-2.5">
                    <span className="block text-xs font-semibold text-slate-700">
                      Seguros (Punto IX)
                    </span>
                    <label className="flex items-start justify-between gap-3 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          disabled={isArchived}
                          checked={contract.insuranceBasicSelected}
                          onChange={() => handleToggleInsurance('insuranceBasicSelected')}
                          className="mt-0.5 rounded border-slate-300 text-blue-700"
                        />
                        <span className="text-xs text-slate-800">
                          Seguro Básico AXA (Reembolso / Asistencia / Equipaje)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
                        +{formatEuro(contract.insuranceBasicPrice)}
                      </span>
                    </label>

                    <label className="flex items-start justify-between gap-3 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          disabled={isArchived}
                          checked={contract.insuranceCancellationSelected}
                          onChange={() => handleToggleInsurance('insuranceCancellationSelected')}
                          className="mt-0.5 rounded border-slate-300 text-blue-700"
                        />
                        <span className="text-xs text-slate-800">
                          Cobertura adicional de anulación
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
                        +{formatEuro(contract.insuranceCancellationPrice)}
                      </span>
                    </label>

                    {/* Enabled box when at least one insurance is selected */}
                    <div
                      className={`p-3 rounded-lg border transition-colors space-y-3 ${
                        anyInsuranceSelected
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-slate-50 border-slate-200 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          Póliza y Nº de Certificado
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {anyInsuranceSelected
                            ? 'Habilitado para este contrato'
                            : 'Selecciona un seguro para habilitar'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="ctr-insurance-policy"
                            className="block text-[11px] font-medium text-slate-700 mb-1"
                          >
                            Póliza de seguro
                          </label>
                          <select
                            id="ctr-insurance-policy"
                            disabled={isArchived || !anyInsuranceSelected}
                            value={
                              addingPolicy
                                ? '__add__'
                                : contract.insurancePolicyNumber ?? ''
                            }
                            onChange={(e) => {
                              if (e.target.value === '__add__') {
                                setAddingPolicy(true);
                              } else {
                                setAddingPolicy(false);
                                updateField('insurancePolicyNumber', e.target.value);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">Seleccionar póliza...</option>
                            {insurancePolicies.map((pol) => (
                              <option key={pol.id} value={pol.policyNumber}>
                                {pol.insurer} · {pol.policyNumber} ({pol.name})
                              </option>
                            ))}
                            {contract.insurancePolicyNumber &&
                              !insurancePolicies.some(
                                (p) => p.policyNumber === contract.insurancePolicyNumber
                              ) && (
                                <option value={contract.insurancePolicyNumber}>
                                  Póliza {contract.insurancePolicyNumber}
                                </option>
                              )}
                            {onUpdateAgency && insurancePolicies.length < 20 && (
                              <option value="__add__">+ Añadir nueva póliza al listado...</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="ctr-insurance-cert"
                            className="block text-[11px] font-medium text-slate-700 mb-1"
                          >
                            Número de certificado
                          </label>
                          <input
                            id="ctr-insurance-cert"
                            type="text"
                            disabled={isArchived || !anyInsuranceSelected}
                            value={contract.insuranceCertificateNumber ?? ''}
                            onChange={(e) =>
                              updateField('insuranceCertificateNumber', e.target.value)
                            }
                            placeholder={
                              anyInsuranceSelected
                                ? 'Ej. 000 o CERT-2026-042'
                                : 'Habilitado al elegir seguro'
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {addingPolicy && anyInsuranceSelected && onUpdateAgency && (
                        <div className="p-2.5 bg-white border border-blue-200 rounded-md space-y-2">
                          <span className="block text-[11px] font-semibold text-slate-700">
                            Añadir nueva póliza al listado de la agencia
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              aria-label="Aseguradora"
                              placeholder="Aseguradora (ej. AXA)"
                              value={newPolicyInsurer}
                              onChange={(e) => setNewPolicyInsurer(e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded"
                            />
                            <input
                              type="text"
                              aria-label="Número de póliza"
                              placeholder="Nº de póliza"
                              value={newPolicyNum}
                              onChange={(e) => setNewPolicyNum(e.target.value)}
                              className="px-2 py-1 text-xs font-mono border border-slate-200 rounded"
                            />
                            <input
                              type="text"
                              aria-label="Nombre descriptivo de póliza"
                              placeholder="Nombre / Cobertura"
                              value={newPolicyName}
                              onChange={(e) => setNewPolicyName(e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setAddingPolicy(false)}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={!newPolicyNum.trim()}
                              onClick={handleSaveNewPolicy}
                              className="px-2.5 py-1 text-[11px] font-medium text-white bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50"
                            >
                              Guardar póliza
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Punto VIII & Anexo I Flights / Transport */}
                  <div className="border-t border-slate-200 pt-4">
                    {renderTransportFlightsBlock(false)}
                  </div>

                  {/* Punto XIV Economic Lines */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Resumen de Conceptos y Pagos (Punto XIV)
                      </span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        Total: {formatEuro(contract.totalAmount)}
                      </span>
                    </div>

                    {contract.conceptLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          disabled={isArchived}
                          aria-label={`Concepto ${line.label}`}
                          value={line.label}
                          onChange={(e) => handleConceptLabelChange(line.id, e.target.value)}
                          className="col-span-8 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          disabled={isArchived}
                          aria-label={`Importe ${line.label}`}
                          value={line.amount}
                          onChange={(e) => handleConceptAmountChange(line.id, e.target.value)}
                          className="col-span-4 px-2.5 py-1.5 text-xs text-right font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </div>
                    ))}

                    {/* Installment Count Selector */}
                    <div className="pt-2 space-y-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Número de plazos de pago
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Inicio: {contract.startDateText}
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-100 rounded-lg"
                        role="group"
                        aria-label="Número de plazos de pago"
                      >
                        {([1, 2, 3, 4, 5, 6] as const).map((count) => {
                          const isSelected =
                            normalizeInstallmentCount(contract.installmentCount) === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              disabled={isArchived}
                              aria-pressed={isSelected}
                              onClick={() => handleInstallmentCountChange(count)}
                              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                isSelected
                                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {count === 1 ? '1 plazo' : `${count} plazos`}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2 pt-1">
                        {buildInstallmentSchedule(contract).map((stage) => (
                          <div
                            key={stage.id}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800">
                                {stage.title}
                              </span>
                              <span className="text-xs font-bold font-mono tabular-nums text-blue-800">
                                {formatEuro(stage.subtotal)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug italic">
                              {stage.introText}
                            </p>
                            <ul className="space-y-0.5 text-[11px] text-slate-700">
                              {stage.lines.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">{item.label}</span>
                                  <span className="font-mono tabular-nums shrink-0">
                                    {formatEuro(item.amount)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'anexos' && (
                <>
                  <div className="space-y-3">
                    {renderTransportFlightsBlock(true)}
                    <div>
                      <label htmlFor="ctr-anexo-aloj" className="block text-xs font-medium text-slate-700 mb-1">
                        Detalle Alojamiento (Anexo I - C)
                      </label>
                      <input
                        id="ctr-anexo-aloj"
                        type="text"
                        disabled={isArchived}
                        value={contract.anexoAccommodationDetail}
                        onChange={(e) => updateField('anexoAccommodationDetail', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="ctr-mae-url" className="block text-xs font-medium text-slate-700 mb-1">
                        Enlace MAE País de destino (Punto X)
                      </label>
                      <input
                        id="ctr-mae-url"
                        type="text"
                        disabled={isArchived}
                        value={contract.maeDestinationUrl}
                        onChange={(e) => updateField('maeDestinationUrl', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pagos directos en destino (Punto VI)
                    </span>
                    {contract.destinationPayments.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled={isArchived}
                          value={p}
                          aria-label={`Pago en destino ${idx + 1}`}
                          onChange={(e) => {
                            const next = [...contract.destinationPayments];
                            next[idx] = e.target.value;
                            updateField('destinationPayments', next);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                        />
                        <button
                          type="button"
                          disabled={isArchived}
                          aria-label={`Eliminar pago en destino ${idx + 1}`}
                          onClick={() =>
                            updateField(
                              'destinationPayments',
                              contract.destinationPayments.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        disabled={isArchived}
                        value={newDestPayment}
                        onChange={(e) => setNewDestPayment(e.target.value)}
                        placeholder="Añadir pago en destino..."
                        aria-label="Nuevo pago en destino"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                      />
                      <button
                        type="button"
                        disabled={isArchived || !newDestPayment.trim()}
                        onClick={() => {
                          if (!newDestPayment.trim()) return;
                          updateField('destinationPayments', [
                            ...contract.destinationPayments,
                            newDestPayment.trim(),
                          ]);
                          setNewDestPayment('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <span className="block text-xs font-semibold text-slate-700">
                      Autorización para publicación de imágenes (Página 7)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => updateField('imageAuthorization', 'authorized')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          contract.imageAuthorization === 'authorized'
                            ? 'bg-blue-50 border-blue-600 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {contract.imageAuthorization === 'authorized' && (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        Autorizo a Mar de Hielo
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => updateField('imageAuthorization', 'declined')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          contract.imageAuthorization === 'declined'
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {contract.imageAuthorization === 'declined' && (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        Desestimo la Autorización
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Right A4 Preview Column */}
        {viewMode !== 'form' && (
          <div
            ref={previewContainerRef}
            className={`${
              viewMode === 'split' ? 'xl:col-span-7' : ''
            } bg-slate-200/70 border border-slate-200 rounded-xl p-3 overflow-y-auto max-h-[82vh] print:bg-white print:border-0 print:p-0 print:max-h-none print:overflow-visible`}
          >
            <div
              className="mx-auto print:!w-full print:!h-auto"
              style={{
                width: `${Math.round(794 * previewScale)}px`,
                height: scaledHeight ? `${scaledHeight}px` : 'auto',
              }}
            >
              <div
                ref={previewContentRef}
                className="origin-top-left print:!transform-none"
                style={{
                  width: '794px',
                  transform: previewScale < 1 ? `scale(${previewScale})` : undefined,
                }}
              >
                <ContractDocumentPreview contract={contract} agency={agency} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
