import type {
  AccessUser,
  AgencyProfile,
  Client,
  ConceptLine,
  FlightPaymentMode,
  InstallmentCount,
  InstallmentLine,
  InstallmentStage,
  InsurancePolicyOption,
  ItineraryDay,
  OptionalServiceItem,
  TravelContract,
  TripTemplate,
} from '../types/contract';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  contractNumberPattern: /^[A-Za-z0-9-]+$/,
  domainPattern: /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+)?$/,
  usernamePattern: /^[a-z0-9._-]{3,40}$/,
  maxArrayItinerary: 30,
  maxArrayRepresented: 20,
  maxArrayPayments: 15,
  maxArrayServices: 15,
  maxArrayConcepts: 20,
  maxArrayInstallments: 25,
  maxArrayHealth: 10,
  maxStr: {
    ownerId: 128,
    publicDomain: 253,
    username: 40,
    displayName: 120,
    passwordHash: 200,
    contractNumber: 40,
    dateText: 60,
    fullName: 150,
    dni: 32,
    locality: 150,
    email: 120,
    phone: 40,
    notes: 500,
    templateName: 140,
    tripTitle: 160,
    destinationLabel: 120,
    priceSummaryText: 300,
    bankConceptPrefix: 40,
    bankConcept: 140,
    iban: 64,
    bic: 32,
    beneficiary: 120,
    specialRequest: 600,
    transportSummary: 300,
    transportCheckbox: 250,
    flightDetails: 600,
    insuranceBasicLabel: 500,
    insuranceCancellationLabel: 300,
    maeUrl: 300,
    installmentIntro: 350,
    anexoTransport: 200,
    anexoManagement: 200,
    anexoAccommodation: 250,
    signatureDataUrl: 60000,
    signerName: 150,
    signedAt: 80,
    signatureRequestId: 128,
  },
} as const;

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const DEFAULT_INSTALLMENT_INTRO =
  'Momento de la firma del presente contrato y en concepto de Reserva y Pago inicial más vuelos y seguro si desea el CONTRATANTE PRINCIPAL la cantidad de:';

export function normalizeInstallmentCount(value: unknown): InstallmentCount {
  const num = Number(value);
  if (num === 2 || num === 3 || num === 4 || num === 5 || num === 6) return num;
  return 1;
}

export function normalizeFlightPaymentMode(value: unknown): FlightPaymentMode {
  return value === 'prorated' ? 'prorated' : 'first_installment';
}

export function formatSpanishLongDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = SPANISH_MONTHS[date.getMonth()] ?? 'enero';
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function formatSpanishNaturalDate(date: Date): string {
  const day = date.getDate();
  const month = SPANISH_MONTHS[date.getMonth()] ?? 'enero';
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function parseSpanishDate(dateText: string): Date | null {
  const clean = String(dateText ?? '').trim().toLowerCase();
  if (!clean) return null;

  const longMatch = /^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})$/i.exec(clean);
  if (longMatch) {
    const day = Number(longMatch[1]);
    const monthName = longMatch[2]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const monthIdx = SPANISH_MONTHS.indexOf(monthName);
    const year = Number(longMatch[3]);
    if (monthIdx >= 0 && year >= 1900 && year <= 2100 && day >= 1 && day <= 31) {
      const candidate = new Date(year, monthIdx, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
    return null;
  }

  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(clean);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const monthIdx = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3]);
    const candidate = new Date(year, monthIdx, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === monthIdx &&
      candidate.getDate() === day
    ) {
      return candidate;
    }
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(clean);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIdx = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const candidate = new Date(year, monthIdx, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === monthIdx &&
      candidate.getDate() === day
    ) {
      return candidate;
    }
  }

  return null;
}

export function subtractMonthsFromSpanishDate(
  startDateText: string,
  monthsBefore: number
): string | null {
  const parsed = parseSpanishDate(startDateText);
  if (!parsed) return null;

  const origDay = parsed.getDate();
  const totalMonths = parsed.getFullYear() * 12 + parsed.getMonth() - monthsBefore;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(origDay, maxDayInMonth);

  return formatSpanishNaturalDate(new Date(targetYear, targetMonth, targetDay));
}

export function formatEuro(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: safe % 1 === 0 && safe === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe) + ' €';
}

export function formatEuroCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (safe === 0) return '0€';
  return (
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe) + '€'
  );
}

export function clampString(value: string, maxLen: number): string {
  return String(value ?? '').slice(0, maxLen);
}

export function ensureMinMaxString(
  value: unknown,
  minLen: number,
  maxLen: number,
  fallback: string
): string {
  const trimmed = String(value ?? '').trim();
  const safeFallback = clampString(fallback, maxLen);
  if (trimmed.length < minLen) {
    return safeFallback;
  }
  return clampString(trimmed, maxLen);
}

export function clampNumber(value: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}

export const DEFAULT_INSURANCE_POLICIES: InsurancePolicyOption[] = [
  {
    id: 'pol-axa-basico',
    insurer: 'AXA',
    policyNumber: '14095000359200',
    name: 'AXA · Asistencia en Viaje y Reembolso',
  },
  {
    id: 'pol-axa-buceo',
    insurer: 'AXA',
    policyNumber: '14095000359201',
    name: 'AXA · Vida a Bordo y Buceo Internacional',
  },
  {
    id: 'pol-intermundial-buceo',
    insurer: 'Intermundial',
    policyNumber: 'IM-BUCEO-2026',
    name: 'Intermundial · TotalSports / Buceo',
  },
];

export function normalizeInsurancePolicies(raw: unknown): InsurancePolicyOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_INSURANCE_POLICIES.map((p) => ({ ...p }));
  }
  const normalized = raw
    .slice(0, 20)
    .map((p, idx) => {
      const item = (p ?? {}) as Partial<InsurancePolicyOption>;
      const policyNumber = clampString(String(item.policyNumber ?? '').trim(), 80);
      if (!policyNumber) return null;
      return {
        id: clampString(String(item.id ?? '').trim() || `pol-${idx + 1}`, 64),
        insurer: clampString(String(item.insurer ?? '').trim() || 'AXA', 60),
        policyNumber,
        name: clampString(
          String(item.name ?? '').trim() || `${item.insurer || 'Póliza'} · ${policyNumber}`,
          120
        ),
      };
    })
    .filter((p): p is InsurancePolicyOption => p !== null);

  return normalized.length > 0 ? normalized : DEFAULT_INSURANCE_POLICIES.map((p) => ({ ...p }));
}

export function extractDefaultPolicyFromLabel(label: string): string {
  const match = /número\s+de\s+P[oó]liza\s+([A-Za-z0-9._-]+)/i.exec(String(label ?? ''));
  return match?.[1] ?? '';
}

export function formatInsuranceLabelWithPolicyAndCert(
  baseLabel: string,
  insurer: string,
  policyNumber: string,
  certificateNumber: string
): string {
  let result = String(baseLabel ?? '');
  const cleanInsurer = insurer.trim();
  const cleanPolicy = policyNumber.trim();
  const cleanCert = certificateNumber.trim();

  if (cleanInsurer && /aseguradora\s+[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ._-]+/i.test(result)) {
    result = result.replace(
      /(aseguradora\s+)[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ._-]+/i,
      `$1${cleanInsurer}`
    );
  }
  if (cleanPolicy && /número\s+de\s+P[oó]liza\s+[A-Za-z0-9._-]+/i.test(result)) {
    result = result.replace(
      /(número\s+de\s+P[oó]liza\s+)[A-Za-z0-9._-]+/i,
      `$1${cleanPolicy}`
    );
  }
  if (cleanCert && /Nº\s+de\s+Certificado\s+[A-Za-z0-9._-]+/i.test(result)) {
    result = result.replace(
      /(Nº\s+de\s+Certificado\s+)[A-Za-z0-9._-]+/i,
      `$1${cleanCert}`
    );
  }
  return result;
}

export function normalizeAgencyProfile(raw: Partial<AgencyProfile> | null | undefined): AgencyProfile {
  const src = raw ?? {};
  return {
    id: src.id,
    ownerId: typeof src.ownerId === 'string' && src.ownerId ? src.ownerId : 'local-demo',
    commercialName: typeof src.commercialName === 'string' && src.commercialName ? src.commercialName : 'VIAJES MAR DE HIELO',
    legalHolderName: typeof src.legalHolderName === 'string' && src.legalHolderName ? src.legalHolderName : 'MARIA DEL PILAR JIMENEZ REINA',
    cif: typeof src.cif === 'string' && src.cif ? src.cif : '15.405.540-W',
    licenseNote: typeof src.licenseNote === 'string' && src.licenseNote ? src.licenseNote : 'Licencia de Agencia de Viajes en Cataluña',
    addressLine1: typeof src.addressLine1 === 'string' && src.addressLine1 ? src.addressLine1 : 'Port Esportiu de Tarragona Local LD4',
    addressLine2: typeof src.addressLine2 === 'string' && src.addressLine2 ? src.addressLine2 : '43004 – Tarragona (ESPAÑA)',
    phone: typeof src.phone === 'string' && src.phone ? src.phone : '(+34) 644 53 36 86',
    email: typeof src.email === 'string' && src.email ? src.email : 'Info@ofertasviajesbuceo.com',
    iban: typeof src.iban === 'string' && src.iban ? src.iban : 'ES4300496703012116041736',
    bic: typeof src.bic === 'string' ? src.bic : 'BSCHESMMXXX',
    bankBeneficiary: typeof src.bankBeneficiary === 'string' && src.bankBeneficiary ? src.bankBeneficiary : 'María del Pilar Jiménez Reina.',
    footerText: typeof src.footerText === 'string' && src.footerText ? src.footerText : 'María del Pilar Jiménez Reina – 15405540W – Licencia de Agencia de Viajes en Cataluña (España)',
    jurisdictionCity: typeof src.jurisdictionCity === 'string' && src.jurisdictionCity ? src.jurisdictionCity : 'Tarragona',
    publicDomain: typeof src.publicDomain === 'string' ? src.publicDomain : '',
    insurancePolicies: normalizeInsurancePolicies(src.insurancePolicies),
    createdAt: src.createdAt,
    updatedAt: src.updatedAt,
  };
}

export function normalizeClient(raw: Partial<Client> | null | undefined): Client {
  const src = raw ?? {};
  return {
    id: typeof src.id === 'string' && src.id ? src.id : `cli-${Date.now()}`,
    ownerId: typeof src.ownerId === 'string' && src.ownerId ? src.ownerId : 'local-demo',
    fullName: typeof src.fullName === 'string' ? src.fullName : '',
    dni: typeof src.dni === 'string' ? src.dni : '',
    locality: typeof src.locality === 'string' ? src.locality : '',
    email: typeof src.email === 'string' ? src.email : '',
    phone: typeof src.phone === 'string' ? src.phone : '',
    notes: typeof src.notes === 'string' ? src.notes : '',
    defaultRepresented: Array.isArray(src.defaultRepresented)
      ? src.defaultRepresented.filter((item): item is string => typeof item === 'string')
      : [],
    createdAt: src.createdAt,
    updatedAt: src.updatedAt,
  };
}

export function normalizeTemplate(raw: Partial<TripTemplate> | null | undefined): TripTemplate {
  const src = raw ?? {};
  return {
    id: typeof src.id === 'string' && src.id ? src.id : `tpl-${Date.now()}`,
    ownerId: typeof src.ownerId === 'string' && src.ownerId ? src.ownerId : 'local-demo',
    name: typeof src.name === 'string' && src.name ? src.name : 'Plantilla sin nombre',
    tripTitle: typeof src.tripTitle === 'string' && src.tripTitle ? src.tripTitle : 'Viaje combinado',
    destinationLabel: typeof src.destinationLabel === 'string' && src.destinationLabel ? src.destinationLabel : 'Destino',
    defaultStartDateText: typeof src.defaultStartDateText === 'string' && src.defaultStartDateText ? src.defaultStartDateText : 'Por definir',
    defaultEndDateText: typeof src.defaultEndDateText === 'string' && src.defaultEndDateText ? src.defaultEndDateText : 'Por definir',
    diverPrice: Number.isFinite(Number(src.diverPrice)) ? Number(src.diverPrice) : 0,
    nonDiverPrice: Number.isFinite(Number(src.nonDiverPrice)) ? Number(src.nonDiverPrice) : 0,
    priceSummaryText: typeof src.priceSummaryText === 'string' && src.priceSummaryText ? src.priceSummaryText : 'Según ficha técnica',
    bankConceptPrefix: typeof src.bankConceptPrefix === 'string' && src.bankConceptPrefix ? src.bankConceptPrefix : 'VIAJE',
    minGroupSize: Number.isFinite(Number(src.minGroupSize)) && Number(src.minGroupSize) >= 1 ? Number(src.minGroupSize) : 1,
    cancellationNoticeDays: Number.isFinite(Number(src.cancellationNoticeDays)) && Number(src.cancellationNoticeDays) >= 0 ? Number(src.cancellationNoticeDays) : 15,
    itineraryDays: Array.isArray(src.itineraryDays)
      ? src.itineraryDays.map((d) => ({
          title: typeof d?.title === 'string' ? d.title : 'Día',
          description: typeof d?.description === 'string' ? d.description : '',
        }))
      : [],
    destinationPayments: Array.isArray(src.destinationPayments)
      ? src.destinationPayments.filter((item): item is string => typeof item === 'string')
      : [],
    optionalServices: Array.isArray(src.optionalServices)
      ? src.optionalServices.map((s, idx) => ({
          id: typeof s?.id === 'string' && s.id ? s.id : `srv-${idx + 1}`,
          label: typeof s?.label === 'string' ? s.label : 'Servicio opcional',
          note: typeof s?.note === 'string' ? s.note : '',
          price: Number.isFinite(Number(s?.price)) ? Number(s.price) : 0,
          selected: Boolean(s?.selected),
        }))
      : [],
    transportIncluded: Boolean(src.transportIncluded),
    transportSummary: typeof src.transportSummary === 'string' && src.transportSummary ? src.transportSummary : 'Según ficha técnica',
    transportCheckboxLabel: typeof src.transportCheckboxLabel === 'string' && src.transportCheckboxLabel ? src.transportCheckboxLabel : 'El cliente conoce las condiciones de transporte.',
    flightDetails: typeof src.flightDetails === 'string' ? src.flightDetails : '',
    flightPrice:
      !src.transportIncluded && Number.isFinite(Number(src.flightPrice)) && Number(src.flightPrice) >= 0
        ? Number(src.flightPrice)
        : 0,
    flightPaymentMode: normalizeFlightPaymentMode(src.flightPaymentMode),
    insuranceBasicLabel: typeof src.insuranceBasicLabel === 'string' && src.insuranceBasicLabel ? src.insuranceBasicLabel : 'Seguro Básico de Asistencia en Viaje',
    insuranceBasicPrice: Number.isFinite(Number(src.insuranceBasicPrice)) ? Number(src.insuranceBasicPrice) : 0,
    insuranceCancellationLabel: typeof src.insuranceCancellationLabel === 'string' && src.insuranceCancellationLabel ? src.insuranceCancellationLabel : 'Cobertura adicional de anulación',
    insuranceCancellationPrice: Number.isFinite(Number(src.insuranceCancellationPrice)) ? Number(src.insuranceCancellationPrice) : 0,
    maeDestinationUrl: typeof src.maeDestinationUrl === 'string' && src.maeDestinationUrl ? src.maeDestinationUrl : 'https://www.exteriores.gob.es',
    anexoTransportDetail: typeof src.anexoTransportDetail === 'string' && src.anexoTransportDetail ? src.anexoTransportDetail : 'Según programa',
    anexoManagementDetail: typeof src.anexoManagementDetail === 'string' && src.anexoManagementDetail ? src.anexoManagementDetail : 'Gestión de pagos.',
    anexoAccommodationDetail: typeof src.anexoAccommodationDetail === 'string' && src.anexoAccommodationDetail ? src.anexoAccommodationDetail : 'Según programa',
    anexoIncludedServices: Array.isArray(src.anexoIncludedServices)
      ? src.anexoIncludedServices.filter((item): item is string => typeof item === 'string')
      : [],
    anexoHealthContacts: Array.isArray(src.anexoHealthContacts)
      ? src.anexoHealthContacts.filter((item): item is string => typeof item === 'string')
      : [],
    generalConditionsDate: typeof src.generalConditionsDate === 'string' && src.generalConditionsDate ? src.generalConditionsDate : '14 de septiembre de 2026',
    createdAt: src.createdAt,
    updatedAt: src.updatedAt,
  };
}

export function normalizeContract(raw: Partial<TravelContract> | null | undefined): TravelContract {
  const src = raw ?? {};
  const conceptLines = Array.isArray(src.conceptLines)
    ? src.conceptLines.map((c, idx) => ({
        id: typeof c?.id === 'string' && c.id ? c.id : `c-${idx + 1}`,
        label: typeof c?.label === 'string' ? c.label : 'Concepto',
        amount: Number.isFinite(Number(c?.amount)) ? Number(c.amount) : 0,
      }))
    : [];
  const installmentLines = Array.isArray(src.installmentLines)
    ? src.installmentLines.map((i, idx) => ({
        id: typeof i?.id === 'string' && i.id ? i.id : `i-${idx + 1}`,
        label: typeof i?.label === 'string' ? i.label : 'Plazo de pago',
        amount: Number.isFinite(Number(i?.amount)) ? Number(i.amount) : 0,
      }))
    : [];

  return {
    id: typeof src.id === 'string' && src.id ? src.id : `ctr-${Date.now()}`,
    ownerId: typeof src.ownerId === 'string' && src.ownerId ? src.ownerId : 'local-demo',
    contractNumber: typeof src.contractNumber === 'string' && src.contractNumber ? src.contractNumber : 'C-2026-001',
    contractDateText: typeof src.contractDateText === 'string' && src.contractDateText ? src.contractDateText : formatSpanishLongDate(),
    status: src.status === 'sent' || src.status === 'signed' || src.status === 'archived' ? src.status : 'draft',
    templateId: typeof src.templateId === 'string' ? src.templateId : '',
    templateName: typeof src.templateName === 'string' ? src.templateName : '',
    clientId: typeof src.clientId === 'string' ? src.clientId : '',
    clientFullName: typeof src.clientFullName === 'string' && src.clientFullName ? src.clientFullName : 'Cliente',
    clientDni: typeof src.clientDni === 'string' && src.clientDni ? src.clientDni : '00000000A',
    clientLocality: typeof src.clientLocality === 'string' && src.clientLocality ? src.clientLocality : 'España',
    representedPeople: Array.isArray(src.representedPeople)
      ? src.representedPeople.filter((item): item is string => typeof item === 'string')
      : [],
    tripTitle: typeof src.tripTitle === 'string' && src.tripTitle ? src.tripTitle : 'Viaje combinado',
    startDateText: typeof src.startDateText === 'string' && src.startDateText ? src.startDateText : 'Por definir',
    endDateText: typeof src.endDateText === 'string' && src.endDateText ? src.endDateText : 'Por definir',
    diverPrice: Number.isFinite(Number(src.diverPrice)) ? Number(src.diverPrice) : 0,
    nonDiverPrice: Number.isFinite(Number(src.nonDiverPrice)) ? Number(src.nonDiverPrice) : 0,
    priceSummaryText: typeof src.priceSummaryText === 'string' && src.priceSummaryText ? src.priceSummaryText : 'Según ficha técnica',
    bankIban: typeof src.bankIban === 'string' && src.bankIban ? src.bankIban : 'ES4300496703012116041736',
    bankBeneficiary: typeof src.bankBeneficiary === 'string' && src.bankBeneficiary ? src.bankBeneficiary : 'María del Pilar Jiménez Reina.',
    bankConcept: typeof src.bankConcept === 'string' && src.bankConcept ? src.bankConcept : 'VIAJE',
    bankBic: typeof src.bankBic === 'string' ? src.bankBic : '',
    minGroupSize: Number.isFinite(Number(src.minGroupSize)) && Number(src.minGroupSize) >= 1 ? Number(src.minGroupSize) : 1,
    cancellationNoticeDays: Number.isFinite(Number(src.cancellationNoticeDays)) && Number(src.cancellationNoticeDays) >= 0 ? Number(src.cancellationNoticeDays) : 15,
    clientSpecialRequest: typeof src.clientSpecialRequest === 'string' ? src.clientSpecialRequest : '',
    itineraryDays: Array.isArray(src.itineraryDays)
      ? src.itineraryDays.map((d) => ({
          title: typeof d?.title === 'string' ? d.title : 'Día',
          description: typeof d?.description === 'string' ? d.description : '',
        }))
      : [],
    destinationPayments: Array.isArray(src.destinationPayments)
      ? src.destinationPayments.filter((item): item is string => typeof item === 'string')
      : [],
    optionalServices: Array.isArray(src.optionalServices)
      ? src.optionalServices.map((s, idx) => ({
          id: typeof s?.id === 'string' && s.id ? s.id : `srv-${idx + 1}`,
          label: typeof s?.label === 'string' ? s.label : 'Servicio opcional',
          note: typeof s?.note === 'string' ? s.note : '',
          price: Number.isFinite(Number(s?.price)) ? Number(s.price) : 0,
          selected: Boolean(s?.selected),
        }))
      : [],
    transportIncluded: Boolean(src.transportIncluded),
    transportSummary: typeof src.transportSummary === 'string' && src.transportSummary ? src.transportSummary : 'Según ficha técnica',
    transportCheckboxLabel: typeof src.transportCheckboxLabel === 'string' && src.transportCheckboxLabel ? src.transportCheckboxLabel : 'El cliente conoce las condiciones de transporte.',
    transportChecked: Boolean(src.transportChecked),
    flightDetails: typeof src.flightDetails === 'string' ? src.flightDetails : '',
    flightPrice:
      !src.transportIncluded && Number.isFinite(Number(src.flightPrice)) && Number(src.flightPrice) >= 0
        ? Number(src.flightPrice)
        : 0,
    flightPaymentMode: normalizeFlightPaymentMode(src.flightPaymentMode),
    insuranceBasicSelected: Boolean(src.insuranceBasicSelected),
    insuranceBasicLabel: typeof src.insuranceBasicLabel === 'string' && src.insuranceBasicLabel ? src.insuranceBasicLabel : 'Seguro Básico de Asistencia en Viaje',
    insuranceBasicPrice: Number.isFinite(Number(src.insuranceBasicPrice)) ? Number(src.insuranceBasicPrice) : 0,
    insuranceCancellationSelected: Boolean(src.insuranceCancellationSelected),
    insuranceCancellationLabel: typeof src.insuranceCancellationLabel === 'string' && src.insuranceCancellationLabel ? src.insuranceCancellationLabel : 'Cobertura adicional de anulación',
    insuranceCancellationPrice: Number.isFinite(Number(src.insuranceCancellationPrice)) ? Number(src.insuranceCancellationPrice) : 0,
    insurancePolicyNumber:
      typeof src.insurancePolicyNumber === 'string'
        ? src.insurancePolicyNumber
        : extractDefaultPolicyFromLabel(typeof src.insuranceBasicLabel === 'string' ? src.insuranceBasicLabel : ''),
    insuranceCertificateNumber:
      typeof src.insuranceCertificateNumber === 'string' ? src.insuranceCertificateNumber : '',
    declineAssistanceInsurance: src.declineAssistanceInsurance !== undefined ? Boolean(src.declineAssistanceInsurance) : !src.insuranceBasicSelected,
    declineCancellationInsurance: src.declineCancellationInsurance !== undefined ? Boolean(src.declineCancellationInsurance) : !src.insuranceCancellationSelected,
    maeDestinationUrl: typeof src.maeDestinationUrl === 'string' && src.maeDestinationUrl ? src.maeDestinationUrl : 'https://www.exteriores.gob.es',
    conceptLines,
    installmentCount: normalizeInstallmentCount(src.installmentCount),
    installmentIntro:
      typeof src.installmentIntro === 'string' && src.installmentIntro
        ? src.installmentIntro
        : DEFAULT_INSTALLMENT_INTRO,
    installmentLines,
    totalAmount: Number.isFinite(Number(src.totalAmount)) ? Number(src.totalAmount) : calculateConceptTotal(conceptLines),
    anexoTransportDetail: typeof src.anexoTransportDetail === 'string' && src.anexoTransportDetail ? src.anexoTransportDetail : 'Según programa',
    anexoManagementDetail: typeof src.anexoManagementDetail === 'string' && src.anexoManagementDetail ? src.anexoManagementDetail : 'Gestión de pagos.',
    anexoAccommodationDetail: typeof src.anexoAccommodationDetail === 'string' && src.anexoAccommodationDetail ? src.anexoAccommodationDetail : 'Según programa',
    anexoIncludedServices: Array.isArray(src.anexoIncludedServices)
      ? src.anexoIncludedServices.filter((item): item is string => typeof item === 'string')
      : [],
    anexoHealthContacts: Array.isArray(src.anexoHealthContacts)
      ? src.anexoHealthContacts.filter((item): item is string => typeof item === 'string')
      : [],
    generalConditionsDate: typeof src.generalConditionsDate === 'string' && src.generalConditionsDate ? src.generalConditionsDate : '14 de septiembre de 2026',
    imageAuthorization: src.imageAuthorization === 'declined' ? 'declined' : 'authorized',
    clientSignatureDataUrl: typeof src.clientSignatureDataUrl === 'string' ? src.clientSignatureDataUrl : '',
    clientSignerName: typeof src.clientSignerName === 'string' ? src.clientSignerName : '',
    clientSignedAt: typeof src.clientSignedAt === 'string' ? src.clientSignedAt : '',
    signatureRequestId: typeof src.signatureRequestId === 'string' ? src.signatureRequestId : '',
    agencyCopySentAt: typeof src.agencyCopySentAt === 'string' ? src.agencyCopySentAt : '',
    agencyCopyEmail: typeof src.agencyCopyEmail === 'string' ? src.agencyCopyEmail : '',
    createdAt: src.createdAt,
    updatedAt: src.updatedAt,
  };
}

export function calculateConceptTotal(conceptLines: ConceptLine[]): number {
  const total = conceptLines.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

export function calculateInstallmentTotal(installmentLines: InstallmentLine[]): number {
  const total = installmentLines.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

export function computeInsurancePrice(contract: Pick<
  TravelContract,
  | 'insuranceBasicSelected'
  | 'insuranceBasicPrice'
  | 'insuranceCancellationSelected'
  | 'insuranceCancellationPrice'
>): number {
  let total = 0;
  if (contract.insuranceBasicSelected) total += Number(contract.insuranceBasicPrice) || 0;
  if (contract.insuranceCancellationSelected) total += Number(contract.insuranceCancellationPrice) || 0;
  return Math.round(total * 100) / 100;
}

function round2(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function splitAmountIntoStages(total: number, count: number): number[] {
  if (count <= 1) return [round2(total)];
  const totalCents = Math.max(0, Math.round(round2(total) * 100));
  const baseCents = Math.floor(totalCents / count);
  const remCents = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, idx) =>
    round2((baseCents + (idx < remCents ? 1 : 0)) / 100)
  );
}

export function summarizeTripConcepts(conceptLines: ConceptLine[]): string {
  const activeLabels = conceptLines
    .filter(
      (line) =>
        line.id !== 'insurance' &&
        line.id !== 'flights' &&
        (Number(line.amount) || 0) > 0
    )
    .map((line) => {
      if (line.id === 'pkg-diver') return 'Paquete de Viaje (Buceador)';
      if (line.id === 'pkg-non-diver') return 'Paquete de Viaje (No Buceador)';
      if (line.id === 'extra-optional') {
        const parenMatch = /\((.+)\)/.exec(line.label);
        return parenMatch?.[1] ? parenMatch[1] : 'Extras opcionales';
      }
      if (line.id === 'services-extra') {
        return line.label.trim() || 'Servicios adicionales';
      }
      return line.label.trim();
    })
    .filter((label) => label.length > 0);

  return activeLabels.length > 0 ? activeLabels.join(' + ') : 'Paquete de Viaje';
}

export function buildInstallmentSchedule(
  contract: Pick<
    TravelContract,
    | 'installmentCount'
    | 'startDateText'
    | 'conceptLines'
    | 'installmentIntro'
    | 'installmentLines'
    | 'insuranceBasicSelected'
    | 'insuranceBasicPrice'
    | 'insuranceCancellationSelected'
    | 'insuranceCancellationPrice'
    | 'totalAmount'
  > &
    Partial<Pick<TravelContract, 'transportIncluded' | 'flightPrice' | 'flightPaymentMode'>>
): InstallmentStage[] {
  const count = normalizeInstallmentCount(contract.installmentCount);
  const conceptTotal = calculateConceptTotal(contract.conceptLines);
  const effectiveTotal =
    conceptTotal > 0 || contract.conceptLines.length > 0
      ? conceptTotal
      : Math.max(0, round2(contract.totalAmount));

  const insuranceBasic = contract.insuranceBasicSelected
    ? Math.max(0, round2(contract.insuranceBasicPrice))
    : 0;
  const insuranceCancel = contract.insuranceCancellationSelected
    ? Math.max(0, round2(contract.insuranceCancellationPrice))
    : 0;

  const insuranceLineAmount = Math.max(
    0,
    round2(contract.conceptLines.find((l) => l.id === 'insurance')?.amount ?? 0)
  );
  const selectedInsuranceSum = round2(insuranceBasic + insuranceCancel);
  const manualInsurance =
    insuranceLineAmount > selectedInsuranceSum
      ? round2(insuranceLineAmount - selectedInsuranceSum)
      : 0;
  const totalInsurance = Math.min(
    effectiveTotal,
    round2(selectedInsuranceSum + manualInsurance)
  );

  const hasFlightConceptLine = contract.conceptLines.some((l) => l.id === 'flights');
  const flightLineAmount = Math.max(
    0,
    round2(contract.conceptLines.find((l) => l.id === 'flights')?.amount ?? 0)
  );
  const configuredFlightPrice = !contract.transportIncluded
    ? Math.max(0, round2(contract.flightPrice ?? 0))
    : 0;
  const rawSeparateFlight = !contract.transportIncluded
    ? hasFlightConceptLine
      ? flightLineAmount
      : configuredFlightPrice
    : flightLineAmount;

  const remainingAfterInsurance = Math.max(0, round2(effectiveTotal - totalInsurance));
  const separateFlightAmount = Math.min(remainingAfterInsurance, rawSeparateFlight);
  const packageSubtotal = Math.max(0, round2(remainingAfterInsurance - separateFlightAmount));
  const flightMode = normalizeFlightPaymentMode(contract.flightPaymentMode);

  const summary = summarizeTripConcepts(contract.conceptLines);
  const customOrDefaultIntro =
    contract.installmentIntro &&
    contract.installmentIntro.trim().length > 0 &&
    contract.installmentIntro.trim() !== 'Reserva y pago inicial según contrato.'
      ? contract.installmentIntro
      : DEFAULT_INSTALLMENT_INTRO;

  const buildInsuranceLines = (): InstallmentLine[] => {
    const list: InstallmentLine[] = [
      { id: 'inst-basic-ins', label: 'Seguro Básico VIP', amount: insuranceBasic },
      { id: 'inst-cancel-ins', label: 'Cobertura ANULACIÓN Seguro', amount: insuranceCancel },
    ];
    if (manualInsurance > 0) {
      list.push({
        id: 'inst-manual-ins',
        label: 'Seguro (Opcional)',
        amount: manualInsurance,
      });
    }
    return list;
  };

  const pkgParts = splitAmountIntoStages(packageSubtotal, count);
  const flightParts =
    separateFlightAmount > 0
      ? flightMode === 'prorated'
        ? splitAmountIntoStages(separateFlightAmount, count)
        : [separateFlightAmount, ...Array<number>(count - 1).fill(0)]
      : Array<number>(count).fill(0);

  if (count === 1) {
    const lines: InstallmentLine[] = [
      {
        id: 'inst-package',
        label: `Reserva y pago total (${summary})`,
        amount: pkgParts[0],
      },
      ...(flightParts[0] > 0
        ? [{ id: 'inst-flights', label: 'Vuelos', amount: flightParts[0] }]
        : []),
      ...buildInsuranceLines(),
    ];
    return [
      {
        id: 'stage-1',
        title: 'Plazo único (100%)',
        dueLabel: 'Firma del contrato',
        introText: customOrDefaultIntro,
        lines,
        subtotal: effectiveTotal,
      },
    ];
  }

  const shareText = count === 2 ? '50%' : `1/${count}`;
  const stage1Lines: InstallmentLine[] = [
    {
      id: 'inst-p1-trip',
      label: `Reserva y ${shareText} del viaje (${summary})`,
      amount: pkgParts[0],
    },
    ...(flightParts[0] > 0
      ? [
          {
            id: 'inst-p1-flights',
            label:
              flightMode === 'prorated'
                ? `Vuelos (1/${count} prorrateado)`
                : 'Vuelos (pago íntegro en 1º plazo)',
            amount: flightParts[0],
          },
        ]
      : []),
    ...buildInsuranceLines(),
  ];

  const stages: InstallmentStage[] = [
    {
      id: 'stage-1',
      title: `Plazo 1 (Reserva + Seguros${flightParts[0] > 0 ? ' + Vuelos' : ''} + ${shareText} viaje)`,
      dueLabel: 'Firma del contrato',
      introText: customOrDefaultIntro,
      lines: stage1Lines,
      subtotal: round2(pkgParts[0] + flightParts[0] + totalInsurance),
    },
  ];

  for (let idx = 1; idx < count; idx += 1) {
    const monthsBefore = (count - idx) * 2;
    const dueDate = subtractMonthsFromSpanishDate(contract.startDateText, monthsBefore);
    const stageLines: InstallmentLine[] = [
      {
        id: `inst-p${idx + 1}-trip`,
        label:
          count === 2
            ? `2º Pago (50% restante: ${summary})`
            : idx === count - 1
              ? `${idx + 1}º Pago (1/${count} final del viaje: ${summary})`
              : `${idx + 1}º Pago (1/${count} del viaje: ${summary})`,
        amount: pkgParts[idx],
      },
      ...(flightParts[idx] > 0
        ? [
            {
              id: `inst-p${idx + 1}-flights`,
              label: `Vuelos (${idx + 1}/${count} prorrateado)`,
              amount: flightParts[idx],
            },
          ]
        : []),
    ];

    stages.push({
      id: `stage-${idx + 1}`,
      title:
        count === 2
          ? 'Plazo 2 (50% restante)'
          : `Plazo ${idx + 1} (${monthsBefore} meses antes)`,
      dueLabel: dueDate
        ? `${dueDate} (${monthsBefore} meses antes)`
        : `${monthsBefore} meses antes del inicio`,
      introText: dueDate
        ? `El Cliente abonará el ${dueDate} (${monthsBefore} meses antes de la fecha de inicio del viaje) la cantidad de:`
        : `El Cliente abonará ${monthsBefore} meses antes de la fecha de inicio del viaje la cantidad de:`,
      lines: stageLines,
      subtotal: round2(pkgParts[idx] + flightParts[idx]),
    });
  }

  return stages;
}

/**
 * Syncs optional services, separate flight pricing & insurance summary rows inside conceptLines & installmentLines
 * while preserving user's base diver/non-diver package amounts.
 */
export function syncContractFinancialLines(contract: TravelContract): TravelContract {
  const optionalSelectedTotal = contract.optionalServices
    .filter((s) => s.selected && s.price > 0)
    .reduce((sum, s) => sum + s.price, 0);

  const selectedOptionalNames = contract.optionalServices
    .filter((s) => s.selected && s.price > 0)
    .map((s) => s.label)
    .join(', ');

  const insuranceBasic = contract.insuranceBasicSelected ? contract.insuranceBasicPrice : 0;
  const insuranceCancel = contract.insuranceCancellationSelected ? contract.insuranceCancellationPrice : 0;
  const insuranceTotal = round2(insuranceBasic + insuranceCancel);

  const separateFlightPrice = !contract.transportIncluded
    ? Math.max(0, round2(contract.flightPrice ?? 0))
    : 0;
  const flightPaymentMode = normalizeFlightPaymentMode(contract.flightPaymentMode);

  let hasFlightsRow = false;
  let updatedConcepts = contract.conceptLines
    .map((line) => {
      if (line.id === 'extra-optional') {
        return {
          ...line,
          label: selectedOptionalNames
            ? `Extras opcionales (${selectedOptionalNames})`
            : 'Extra habitación Individual / Servicios opcionales',
          amount: round2(optionalSelectedTotal),
        };
      }
      if (line.id === 'insurance') {
        return {
          ...line,
          amount: insuranceTotal,
        };
      }
      if (line.id === 'flights') {
        hasFlightsRow = true;
        return {
          ...line,
          label: line.label.trim() || 'Vuelos (importe aparte)',
          amount: separateFlightPrice,
        };
      }
      return line;
    })
    .filter((line) => line.id !== 'flights' || separateFlightPrice > 0);

  if (separateFlightPrice > 0 && !hasFlightsRow) {
    const flightLine: ConceptLine = {
      id: 'flights',
      label: 'Vuelos (importe aparte)',
      amount: separateFlightPrice,
    };
    const servicesIdx = updatedConcepts.findIndex((l) => l.id === 'services-extra');
    if (servicesIdx >= 0) {
      updatedConcepts = [
        ...updatedConcepts.slice(0, servicesIdx),
        flightLine,
        ...updatedConcepts.slice(servicesIdx),
      ];
    } else {
      updatedConcepts = [...updatedConcepts, flightLine];
    }
  }

  const totalAmount = calculateConceptTotal(updatedConcepts);
  const installmentCount = normalizeInstallmentCount(contract.installmentCount);

  const nextDraft: TravelContract = {
    ...contract,
    flightPrice: separateFlightPrice,
    flightPaymentMode,
    installmentCount,
    conceptLines: updatedConcepts,
    totalAmount,
  };

  const stages = buildInstallmentSchedule(nextDraft);
  const updatedInstallments = stages.flatMap((stage) => stage.lines);

  return {
    ...nextDraft,
    installmentLines: updatedInstallments,
  };
}

export function generateNextContractNumber(
  existingContracts: Array<Pick<TravelContract, 'contractNumber'>>,
  year: number = new Date().getFullYear()
): string {
  const prefix = `C-${year}-`;
  let maxSeq = 0;

  for (const c of existingContracts) {
    const match = /^C-(\d{4})-(\d+)$/.exec(c.contractNumber.trim());
    if (match) {
      const parsedYear = Number(match[1]);
      const seq = Number(match[2]);
      if (parsedYear === year && Number.isFinite(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

export type TravelerRole = 'diver' | 'non-diver';

export function sanitizeContractNumberValue(raw: string): string {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.length < 2 || !BLUEPRINT_LIMITS.contractNumberPattern.test(cleaned)) {
    return 'C-2026-001';
  }
  return clampString(cleaned, BLUEPRINT_LIMITS.maxStr.contractNumber);
}

export function createContractFromTemplate(params: {
  id: string;
  ownerId: string;
  template: TripTemplate;
  client: Client;
  agency: AgencyProfile;
  contractNumber: string;
  contractDateText?: string;
  travelerRole?: TravelerRole;
}): TravelContract {
  const {
    id,
    ownerId,
    contractDateText = formatSpanishLongDate(),
    travelerRole = 'diver',
  } = params;
  const template = normalizeTemplate(params.template);
  const client = normalizeClient(params.client);
  const agency = normalizeAgencyProfile(params.agency);
  const contractNumber = sanitizeContractNumberValue(params.contractNumber);

  const diverAmount = travelerRole === 'diver' ? template.diverPrice : 0;
  const nonDiverAmount = travelerRole === 'non-diver' ? template.nonDiverPrice : 0;

  const templateFlightPrice = !template.transportIncluded
    ? Math.max(0, round2(template.flightPrice ?? 0))
    : 0;
  const flightPaymentMode = normalizeFlightPaymentMode(template.flightPaymentMode);

  const initialOptional = template.optionalServices.map((s) => ({ ...s, selected: false }));
  const conceptLines: ConceptLine[] = [
    {
      id: 'pkg-diver',
      label: `Paquete Viaje a ${template.destinationLabel} desde ${template.defaultStartDateText} al ${template.defaultEndDateText}`,
      amount: diverAmount,
    },
    {
      id: 'pkg-non-diver',
      label: `Paquete Viaje a ${template.destinationLabel} desde ${template.defaultStartDateText} al ${template.defaultEndDateText} – NO BUCEADOR`,
      amount: nonDiverAmount,
    },
    {
      id: 'extra-optional',
      label: 'Extra habitación Individual / Servicios opcionales',
      amount: 0,
    },
    {
      id: 'insurance',
      label: 'Seguro (Opcional)',
      amount: 0,
    },
    ...(templateFlightPrice > 0
      ? [
          {
            id: 'flights',
            label: 'Vuelos (importe aparte)',
            amount: templateFlightPrice,
          },
        ]
      : []),
    {
      id: 'services-extra',
      label: 'Servicios (Botella 15L, etc)',
      amount: 0,
    },
  ];

  const baseDraft: TravelContract = {
    id,
    ownerId,
    contractNumber,
    contractDateText,
    status: 'draft',
    templateId: template.id,
    templateName: template.name,
    clientId: client.id,
    clientFullName: client.fullName,
    clientDni: client.dni,
    clientLocality: client.locality,
    representedPeople: [...client.defaultRepresented],
    tripTitle: template.tripTitle,
    startDateText: template.defaultStartDateText,
    endDateText: template.defaultEndDateText,
    diverPrice: template.diverPrice,
    nonDiverPrice: template.nonDiverPrice,
    priceSummaryText: template.priceSummaryText,
    bankIban: agency.iban,
    bankBeneficiary: agency.bankBeneficiary,
    bankConcept: `${template.bankConceptPrefix}, ${client.fullName}`,
    bankBic: agency.bic,
    minGroupSize: template.minGroupSize,
    cancellationNoticeDays: template.cancellationNoticeDays,
    clientSpecialRequest: '',
    itineraryDays: template.itineraryDays.map((d) => ({ ...d })),
    destinationPayments: [...template.destinationPayments],
    optionalServices: initialOptional,
    transportIncluded: template.transportIncluded,
    transportSummary: template.transportSummary,
    transportCheckboxLabel: template.transportCheckboxLabel,
    transportChecked: !template.transportIncluded,
    flightDetails: template.flightDetails ?? '',
    flightPrice: templateFlightPrice,
    flightPaymentMode,
    insuranceBasicSelected: false,
    insuranceBasicLabel: template.insuranceBasicLabel,
    insuranceBasicPrice: template.insuranceBasicPrice,
    insuranceCancellationSelected: false,
    insuranceCancellationLabel: template.insuranceCancellationLabel,
    insuranceCancellationPrice: template.insuranceCancellationPrice,
    insurancePolicyNumber:
      extractDefaultPolicyFromLabel(template.insuranceBasicLabel) ||
      agency.insurancePolicies?.[0]?.policyNumber ||
      DEFAULT_INSURANCE_POLICIES[0].policyNumber,
    insuranceCertificateNumber: '',
    declineAssistanceInsurance: true,
    declineCancellationInsurance: true,
    maeDestinationUrl: template.maeDestinationUrl,
    conceptLines,
    installmentCount: 1,
    installmentIntro: DEFAULT_INSTALLMENT_INTRO,
    installmentLines: [],
    totalAmount: diverAmount + nonDiverAmount + templateFlightPrice,
    anexoTransportDetail: template.anexoTransportDetail,
    anexoManagementDetail: template.anexoManagementDetail,
    anexoAccommodationDetail: template.anexoAccommodationDetail,
    anexoIncludedServices: [...template.anexoIncludedServices],
    anexoHealthContacts: [...template.anexoHealthContacts],
    generalConditionsDate: template.generalConditionsDate,
    imageAuthorization: 'authorized',
  };

  return syncContractFinancialLines(baseDraft);
}

export function validateClientInput(client: Pick<Client, 'fullName' | 'dni' | 'locality' | 'email'>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (client.fullName.trim().length < 2) {
    errors.fullName = 'El nombre completo debe tener al menos 2 caracteres.';
  }
  if (client.dni.trim().length < 3) {
    errors.dni = 'Introduce un DNI, NIE o pasaporte válido.';
  }
  if (client.locality.trim().length < 2) {
    errors.locality = 'Introduce la localidad o domicilio del cliente.';
  }
  if (client.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) {
    errors.email = 'El formato del correo electrónico no es válido.';
  }
  return errors;
}

export function validateTemplateInput(template: Pick<TripTemplate, 'name' | 'tripTitle' | 'destinationLabel' | 'diverPrice' | 'minGroupSize'>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (template.name.trim().length < 2) {
    errors.name = 'El nombre de la plantilla es obligatorio.';
  }
  if (template.tripTitle.trim().length < 2) {
    errors.tripTitle = 'El título del viaje combinado es obligatorio.';
  }
  if (template.destinationLabel.trim().length < 2) {
    errors.destinationLabel = 'El destino es obligatorio.';
  }
  if (template.diverPrice < 0 || !Number.isFinite(template.diverPrice)) {
    errors.diverPrice = 'El precio de buceador no puede ser negativo.';
  }
  if (template.minGroupSize < 1 || !Number.isFinite(template.minGroupSize)) {
    errors.minGroupSize = 'El mínimo de personas debe ser al menos 1.';
  }
  return errors;
}

export function validateContractNumberInput(contractNumber: string): string | null {
  const trimmed = contractNumber.trim();
  if (trimmed.length < 2 || trimmed.length > BLUEPRINT_LIMITS.maxStr.contractNumber || !BLUEPRINT_LIMITS.contractNumberPattern.test(trimmed)) {
    return 'Usa al menos 2 caracteres con letras, números y guiones (ej. C-2026-056).';
  }
  return null;
}

export function validateContractInput(
  contract: Pick<TravelContract, 'contractNumber' | 'clientFullName' | 'clientDni' | 'clientLocality' | 'tripTitle' | 'bankIban'>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const numberErr = validateContractNumberInput(contract.contractNumber);
  if (numberErr) {
    errors.contractNumber = numberErr;
  }
  if (contract.clientFullName.trim().length < 2) {
    errors.clientFullName = 'El nombre del contratante principal es obligatorio.';
  }
  if (contract.clientDni.trim().length < 2) {
    errors.clientDni = 'El DNI/NIE del contratante es obligatorio.';
  }
  if (contract.clientLocality.trim().length < 2) {
    errors.clientLocality = 'La localidad del contratante es obligatoria.';
  }
  if (contract.tripTitle.trim().length < 2) {
    errors.tripTitle = 'El nombre del viaje es obligatorio.';
  }
  if (contract.bankIban.trim().length < 5) {
    errors.bankIban = 'El IBAN bancario es obligatorio.';
  }
  return errors;
}

export function formatFirestoreErrorForUser(error: unknown): string {
  let rawMessage = error instanceof Error ? error.message : String(error ?? '');
  let parsedOperation = '';
  let parsedCollection = '';
  let emailVerified: boolean | null | undefined;

  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: string;
      operationType?: string;
      path?: string | null;
      authInfo?: { emailVerified?: boolean | null };
    };
    if (parsed && typeof parsed.error === 'string') {
      rawMessage = parsed.error;
    }
    if (parsed && typeof parsed.operationType === 'string') {
      parsedOperation = parsed.operationType;
    }
    if (parsed && typeof parsed.path === 'string' && parsed.path.trim()) {
      parsedCollection = parsed.path.split('/')[0] ?? '';
    }
    if (parsed?.authInfo && 'emailVerified' in parsed.authInfo) {
      emailVerified = parsed.authInfo.emailVerified;
    }
  } catch {
    // Plain error string
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
    if (emailVerified === false) {
      return 'Tu cuenta de Google no tiene el correo verificado en Firebase (emailVerified: false). Verifica el correo de tu cuenta o vuelve a iniciar sesión.';
    }
    const detail =
      parsedOperation && parsedCollection
        ? ` (operación ${parsedOperation} en ${parsedCollection})`
        : '';
    return `No se pudo guardar en la base de datos por permisos o validación de campos${detail}. Revisa que tu cuenta de Google tenga correo verificado y que todos los datos obligatorios estén completos.`;
  }
  if (lower.includes('quota') || lower.includes('resource-exhausted')) {
    return 'Se ha alcanzado el límite diario de operaciones de Firestore. Inténtalo de nuevo más tarde.';
  }
  if (lower.includes('offline') || lower.includes('unavailable') || lower.includes('network')) {
    return 'No hay conexión con la base de datos en la nube en este momento. Verifica tu conexión e inténtalo de nuevo.';
  }
  return 'No se pudo guardar el contrato en la base de datos. Revisa los datos e inténtalo de nuevo.';
}

function sanitizeItinerary(days: ItineraryDay[]): ItineraryDay[] {
  return days.slice(0, BLUEPRINT_LIMITS.maxArrayItinerary).map((d) => ({
    title: clampString(d.title, 120),
    description: clampString(d.description, 1500),
  }));
}

function sanitizeOptionalServices(services: OptionalServiceItem[]): OptionalServiceItem[] {
  return services.slice(0, BLUEPRINT_LIMITS.maxArrayServices).map((s) => ({
    id: clampString(s.id || 'srv', 64),
    label: clampString(s.label, 140),
    note: clampString(s.note, 200),
    price: clampNumber(s.price, 0, 100000),
    selected: Boolean(s.selected),
  }));
}

function sanitizeStringArray(arr: string[], maxItems: number, maxLen = 220): string[] {
  return arr
    .slice(0, maxItems)
    .map((s) => clampString(s, maxLen))
    .filter((s) => s.length > 0);
}

export function normalizePublicationDomain(raw: string): string {
  const trimmed = String(raw ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const hostOnly = withoutProtocol.split('/')[0]?.split('?')[0]?.split('#')[0] ?? '';
  const withoutPort = hostOnly.split(':')[0] ?? '';
  return withoutPort.replace(/\.+$/, '');
}

export function validatePublicationDomain(raw: string): string | null {
  const normalized = normalizePublicationDomain(raw);
  if (!normalized) return null;
  if (normalized.length > BLUEPRINT_LIMITS.maxStr.publicDomain) {
    return 'El dominio supera el máximo de 253 caracteres.';
  }
  if (!BLUEPRINT_LIMITS.domainPattern.test(normalized)) {
    return 'Introduce un dominio válido sin espacios ni rutas (ej. contratos.ofertasviajesbuceo.com).';
  }
  return null;
}

export function buildCanonicalUrl(domain: string | undefined, fallbackOrigin = ''): string {
  const normalized = normalizePublicationDomain(domain ?? '');
  if (normalized && !validatePublicationDomain(normalized)) {
    return `https://${normalized}`;
  }
  return fallbackOrigin;
}

export function sanitizeAgencyProfilePayload(profile: AgencyProfile, ownerId: string) {
  const normalized = normalizeAgencyProfile(profile);
  const normalizedDomain = normalizePublicationDomain(normalized.publicDomain ?? '');
  const safeDomain =
    normalizedDomain && !validatePublicationDomain(normalizedDomain) ? normalizedDomain : '';

  return {
    ownerId: ensureMinMaxString(ownerId, 1, BLUEPRINT_LIMITS.maxStr.ownerId, 'local-demo'),
    commercialName: ensureMinMaxString(normalized.commercialName, 1, 120, 'VIAJES MAR DE HIELO'),
    legalHolderName: ensureMinMaxString(normalized.legalHolderName, 1, 120, 'MARIA DEL PILAR JIMENEZ REINA'),
    cif: ensureMinMaxString(normalized.cif, 1, 32, '15.405.540-W'),
    licenseNote: ensureMinMaxString(normalized.licenseNote, 1, 200, 'Licencia de Agencia de Viajes en Cataluña'),
    addressLine1: ensureMinMaxString(normalized.addressLine1, 1, 150, 'Port Esportiu de Tarragona Local LD4'),
    addressLine2: ensureMinMaxString(normalized.addressLine2, 1, 150, '43004 – Tarragona (ESPAÑA)'),
    phone: ensureMinMaxString(normalized.phone, 1, 40, '(+34) 644 53 36 86'),
    email: ensureMinMaxString(normalized.email, 3, 120, 'Info@ofertasviajesbuceo.com'),
    iban: ensureMinMaxString(normalized.iban, 5, 64, 'ES4300496703012116041736'),
    bic: clampString(normalized.bic, 32),
    bankBeneficiary: ensureMinMaxString(normalized.bankBeneficiary, 1, 120, 'María del Pilar Jiménez Reina.'),
    footerText: ensureMinMaxString(
      normalized.footerText,
      1,
      220,
      'María del Pilar Jiménez Reina – 15405540W – Licencia de Agencia de Viajes en Cataluña (España)'
    ),
    jurisdictionCity: ensureMinMaxString(normalized.jurisdictionCity, 1, 80, 'Tarragona'),
    publicDomain: clampString(safeDomain, BLUEPRINT_LIMITS.maxStr.publicDomain),
    insurancePolicies: normalizeInsurancePolicies(normalized.insurancePolicies),
  };
}

export function sanitizeClientPayload(client: Client, ownerId: string) {
  const normalized = normalizeClient(client);
  return {
    ownerId: ensureMinMaxString(ownerId, 1, BLUEPRINT_LIMITS.maxStr.ownerId, 'local-demo'),
    fullName: ensureMinMaxString(normalized.fullName, 2, BLUEPRINT_LIMITS.maxStr.fullName, 'Cliente'),
    dni: ensureMinMaxString(normalized.dni, 3, BLUEPRINT_LIMITS.maxStr.dni, '00000000A'),
    locality: ensureMinMaxString(normalized.locality, 2, BLUEPRINT_LIMITS.maxStr.locality, 'España'),
    email: clampString(normalized.email.trim(), BLUEPRINT_LIMITS.maxStr.email),
    phone: clampString(normalized.phone.trim(), BLUEPRINT_LIMITS.maxStr.phone),
    notes: clampString(normalized.notes.trim(), BLUEPRINT_LIMITS.maxStr.notes),
    defaultRepresented: sanitizeStringArray(normalized.defaultRepresented, BLUEPRINT_LIMITS.maxArrayRepresented, 150),
  };
}

export function normalizeUsername(raw: string): string {
  return String(raw ?? '').trim().replace(/^@+/, '').toLowerCase();
}

export function validateAccessUserInput(params: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  requirePassword: boolean;
  existingUsernames: string[];
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const cleanUser = normalizeUsername(params.username);
  if (!BLUEPRINT_LIMITS.usernamePattern.test(cleanUser)) {
    errors.username =
      'Usa entre 3 y 40 caracteres en minúsculas (letras, números, punto, guion o guion bajo).';
  } else if (params.existingUsernames.includes(cleanUser)) {
    errors.username = 'Ya existe otro usuario con este nombre de acceso.';
  }

  if (params.displayName.trim().length < 2) {
    errors.displayName = 'El nombre visible debe tener al menos 2 caracteres.';
  }

  const emailTrimmed = params.email.trim();
  if (emailTrimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    errors.email = 'El formato del correo electrónico no es válido.';
  }

  if (params.requirePassword || params.password.length > 0) {
    if (params.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }
  }

  return errors;
}

export function sanitizeAccessUserPayload(accessUser: AccessUser, ownerId: string) {
  const cleanUser = normalizeUsername(accessUser.username);
  const safeUsername = BLUEPRINT_LIMITS.usernamePattern.test(cleanUser)
    ? cleanUser
    : 'usuario';
  const role =
    accessUser.role === 'admin' || accessUser.role === 'editor' || accessUser.role === 'viewer'
      ? accessUser.role
      : 'viewer';

  return {
    ownerId: clampString(ownerId, BLUEPRINT_LIMITS.maxStr.ownerId),
    username: clampString(safeUsername, BLUEPRINT_LIMITS.maxStr.username),
    displayName: clampString(
      accessUser.displayName.trim() || safeUsername,
      BLUEPRINT_LIMITS.maxStr.displayName
    ),
    email: clampString(accessUser.email.trim(), BLUEPRINT_LIMITS.maxStr.email),
    role,
    active: accessUser.isPrimary ? true : Boolean(accessUser.active),
    isPrimary: Boolean(accessUser.isPrimary),
    passwordHash: clampString(
      accessUser.passwordHash,
      BLUEPRINT_LIMITS.maxStr.passwordHash
    ),
  };
}

export function sanitizeTemplatePayload(template: TripTemplate, ownerId: string) {
  const normalized = normalizeTemplate(template);
  return {
    ownerId: ensureMinMaxString(ownerId, 1, BLUEPRINT_LIMITS.maxStr.ownerId, 'local-demo'),
    name: ensureMinMaxString(normalized.name, 2, BLUEPRINT_LIMITS.maxStr.templateName, 'Plantilla sin nombre'),
    tripTitle: ensureMinMaxString(normalized.tripTitle, 2, BLUEPRINT_LIMITS.maxStr.tripTitle, 'Viaje combinado'),
    destinationLabel: ensureMinMaxString(normalized.destinationLabel, 2, BLUEPRINT_LIMITS.maxStr.destinationLabel, 'Destino'),
    defaultStartDateText: ensureMinMaxString(normalized.defaultStartDateText, 2, BLUEPRINT_LIMITS.maxStr.dateText, 'Por definir'),
    defaultEndDateText: ensureMinMaxString(normalized.defaultEndDateText, 2, BLUEPRINT_LIMITS.maxStr.dateText, 'Por definir'),
    diverPrice: clampNumber(normalized.diverPrice, 0, 100000),
    nonDiverPrice: clampNumber(normalized.nonDiverPrice, 0, 100000),
    priceSummaryText: ensureMinMaxString(normalized.priceSummaryText, 2, BLUEPRINT_LIMITS.maxStr.priceSummaryText, 'Según ficha técnica'),
    bankConceptPrefix: ensureMinMaxString(normalized.bankConceptPrefix, 1, BLUEPRINT_LIMITS.maxStr.bankConceptPrefix, 'VIAJE'),
    minGroupSize: clampNumber(normalized.minGroupSize, 1, 500),
    cancellationNoticeDays: clampNumber(normalized.cancellationNoticeDays, 0, 365),
    itineraryDays: sanitizeItinerary(normalized.itineraryDays),
    destinationPayments: sanitizeStringArray(normalized.destinationPayments, BLUEPRINT_LIMITS.maxArrayPayments, 200),
    optionalServices: sanitizeOptionalServices(normalized.optionalServices),
    transportIncluded: Boolean(normalized.transportIncluded),
    transportSummary: ensureMinMaxString(normalized.transportSummary, 1, BLUEPRINT_LIMITS.maxStr.transportSummary, 'Según ficha técnica'),
    transportCheckboxLabel: ensureMinMaxString(normalized.transportCheckboxLabel, 1, BLUEPRINT_LIMITS.maxStr.transportCheckbox, 'El cliente conoce las condiciones de transporte.'),
    flightDetails: clampString(String(normalized.flightDetails ?? '').trim(), BLUEPRINT_LIMITS.maxStr.flightDetails),
    flightPrice: normalized.transportIncluded
      ? 0
      : clampNumber(normalized.flightPrice ?? 0, 0, 100000),
    flightPaymentMode: normalizeFlightPaymentMode(normalized.flightPaymentMode),
    insuranceBasicLabel: ensureMinMaxString(normalized.insuranceBasicLabel, 1, BLUEPRINT_LIMITS.maxStr.insuranceBasicLabel, 'Seguro Básico de Asistencia en Viaje'),
    insuranceBasicPrice: clampNumber(normalized.insuranceBasicPrice, 0, 10000),
    insuranceCancellationLabel: ensureMinMaxString(normalized.insuranceCancellationLabel, 1, BLUEPRINT_LIMITS.maxStr.insuranceCancellationLabel, 'Cobertura adicional de anulación'),
    insuranceCancellationPrice: clampNumber(normalized.insuranceCancellationPrice, 0, 10000),
    maeDestinationUrl: ensureMinMaxString(normalized.maeDestinationUrl, 1, BLUEPRINT_LIMITS.maxStr.maeUrl, 'https://www.exteriores.gob.es'),
    anexoTransportDetail: ensureMinMaxString(normalized.anexoTransportDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoTransport, 'Según programa'),
    anexoManagementDetail: ensureMinMaxString(normalized.anexoManagementDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoManagement, 'Gestión de pagos.'),
    anexoAccommodationDetail: ensureMinMaxString(normalized.anexoAccommodationDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoAccommodation, 'Según programa'),
    anexoIncludedServices: sanitizeStringArray(normalized.anexoIncludedServices, BLUEPRINT_LIMITS.maxArrayServices, 200),
    anexoHealthContacts: sanitizeStringArray(normalized.anexoHealthContacts, BLUEPRINT_LIMITS.maxArrayHealth, 250),
    generalConditionsDate: ensureMinMaxString(normalized.generalConditionsDate, 2, BLUEPRINT_LIMITS.maxStr.dateText, '14 de septiembre de 2026'),
  };
}

export function sanitizeContractPayload(contract: TravelContract, ownerId: string) {
  const normalized = normalizeContract(contract);
  const conceptLines = normalized.conceptLines.slice(0, BLUEPRINT_LIMITS.maxArrayConcepts).map((c) => ({
    id: clampString(c.id || 'c', 64),
    label: clampString(c.label, 180),
    amount: clampNumber(c.amount, 0, 1000000),
  }));

  const installmentLines = normalized.installmentLines.slice(0, BLUEPRINT_LIMITS.maxArrayInstallments).map((i) => ({
    id: clampString(i.id || 'i', 64),
    label: clampString(i.label, 180),
    amount: clampNumber(i.amount, 0, 1000000),
  }));

  const cleanContractNumber = sanitizeContractNumberValue(normalized.contractNumber);

  return {
    ownerId: ensureMinMaxString(ownerId, 1, BLUEPRINT_LIMITS.maxStr.ownerId, 'local-demo'),
    contractNumber: cleanContractNumber,
    contractDateText: ensureMinMaxString(normalized.contractDateText, 2, BLUEPRINT_LIMITS.maxStr.dateText, formatSpanishLongDate()),
    status: normalized.status,
    templateId: clampString(normalized.templateId, 128),
    templateName: clampString(normalized.templateName, BLUEPRINT_LIMITS.maxStr.templateName),
    clientId: clampString(normalized.clientId, 128),
    clientFullName: ensureMinMaxString(normalized.clientFullName, 2, BLUEPRINT_LIMITS.maxStr.fullName, 'Cliente'),
    clientDni: ensureMinMaxString(normalized.clientDni, 2, BLUEPRINT_LIMITS.maxStr.dni, '00000000A'),
    clientLocality: ensureMinMaxString(normalized.clientLocality, 2, BLUEPRINT_LIMITS.maxStr.locality, 'España'),
    representedPeople: sanitizeStringArray(normalized.representedPeople, BLUEPRINT_LIMITS.maxArrayRepresented, 150),
    tripTitle: ensureMinMaxString(normalized.tripTitle, 2, BLUEPRINT_LIMITS.maxStr.tripTitle, 'Viaje combinado'),
    startDateText: ensureMinMaxString(normalized.startDateText, 2, BLUEPRINT_LIMITS.maxStr.dateText, 'Por definir'),
    endDateText: ensureMinMaxString(normalized.endDateText, 2, BLUEPRINT_LIMITS.maxStr.dateText, 'Por definir'),
    diverPrice: clampNumber(normalized.diverPrice, 0, 100000),
    nonDiverPrice: clampNumber(normalized.nonDiverPrice, 0, 100000),
    priceSummaryText: ensureMinMaxString(normalized.priceSummaryText, 2, BLUEPRINT_LIMITS.maxStr.priceSummaryText, 'Según ficha técnica'),
    bankIban: ensureMinMaxString(normalized.bankIban, 5, BLUEPRINT_LIMITS.maxStr.iban, 'ES4300496703012116041736'),
    bankBeneficiary: ensureMinMaxString(normalized.bankBeneficiary, 1, BLUEPRINT_LIMITS.maxStr.beneficiary, 'María del Pilar Jiménez Reina.'),
    bankConcept: ensureMinMaxString(normalized.bankConcept, 1, BLUEPRINT_LIMITS.maxStr.bankConcept, 'VIAJE'),
    bankBic: clampString(normalized.bankBic.trim(), BLUEPRINT_LIMITS.maxStr.bic),
    minGroupSize: clampNumber(normalized.minGroupSize, 1, 500),
    cancellationNoticeDays: clampNumber(normalized.cancellationNoticeDays, 0, 365),
    clientSpecialRequest: clampString(normalized.clientSpecialRequest.trim(), BLUEPRINT_LIMITS.maxStr.specialRequest),
    itineraryDays: sanitizeItinerary(normalized.itineraryDays),
    destinationPayments: sanitizeStringArray(normalized.destinationPayments, BLUEPRINT_LIMITS.maxArrayPayments, 200),
    optionalServices: sanitizeOptionalServices(normalized.optionalServices),
    transportIncluded: Boolean(normalized.transportIncluded),
    transportSummary: ensureMinMaxString(normalized.transportSummary, 1, BLUEPRINT_LIMITS.maxStr.transportSummary, 'Según ficha técnica'),
    transportCheckboxLabel: ensureMinMaxString(normalized.transportCheckboxLabel, 1, BLUEPRINT_LIMITS.maxStr.transportCheckbox, 'El cliente conoce las condiciones de transporte.'),
    transportChecked: Boolean(normalized.transportChecked),
    flightDetails: clampString(String(normalized.flightDetails ?? '').trim(), BLUEPRINT_LIMITS.maxStr.flightDetails),
    flightPrice: normalized.transportIncluded
      ? 0
      : clampNumber(normalized.flightPrice ?? 0, 0, 100000),
    flightPaymentMode: normalizeFlightPaymentMode(normalized.flightPaymentMode),
    insuranceBasicSelected: Boolean(normalized.insuranceBasicSelected),
    insuranceBasicLabel: ensureMinMaxString(normalized.insuranceBasicLabel, 1, BLUEPRINT_LIMITS.maxStr.insuranceBasicLabel, 'Seguro Básico de Asistencia en Viaje'),
    insuranceBasicPrice: clampNumber(normalized.insuranceBasicPrice, 0, 10000),
    insuranceCancellationSelected: Boolean(normalized.insuranceCancellationSelected),
    insuranceCancellationLabel: ensureMinMaxString(normalized.insuranceCancellationLabel, 1, BLUEPRINT_LIMITS.maxStr.insuranceCancellationLabel, 'Cobertura adicional de anulación'),
    insuranceCancellationPrice: clampNumber(normalized.insuranceCancellationPrice, 0, 10000),
    insurancePolicyNumber: clampString(String(normalized.insurancePolicyNumber ?? '').trim(), 80),
    insuranceCertificateNumber: clampString(String(normalized.insuranceCertificateNumber ?? '').trim(), 80),
    declineAssistanceInsurance: Boolean(normalized.declineAssistanceInsurance),
    declineCancellationInsurance: Boolean(normalized.declineCancellationInsurance),
    maeDestinationUrl: ensureMinMaxString(normalized.maeDestinationUrl, 1, BLUEPRINT_LIMITS.maxStr.maeUrl, 'https://www.exteriores.gob.es'),
    conceptLines,
    installmentCount: normalizeInstallmentCount(normalized.installmentCount),
    installmentIntro: ensureMinMaxString(normalized.installmentIntro, 1, BLUEPRINT_LIMITS.maxStr.installmentIntro, DEFAULT_INSTALLMENT_INTRO),
    installmentLines,
    totalAmount: clampNumber(calculateConceptTotal(conceptLines), 0, 1000000),
    anexoTransportDetail: ensureMinMaxString(normalized.anexoTransportDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoTransport, 'Según programa'),
    anexoManagementDetail: ensureMinMaxString(normalized.anexoManagementDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoManagement, 'Gestión de pagos.'),
    anexoAccommodationDetail: ensureMinMaxString(normalized.anexoAccommodationDetail, 1, BLUEPRINT_LIMITS.maxStr.anexoAccommodation, 'Según programa'),
    anexoIncludedServices: sanitizeStringArray(normalized.anexoIncludedServices, BLUEPRINT_LIMITS.maxArrayServices, 200),
    anexoHealthContacts: sanitizeStringArray(normalized.anexoHealthContacts, BLUEPRINT_LIMITS.maxArrayHealth, 250),
    generalConditionsDate: ensureMinMaxString(normalized.generalConditionsDate, 2, BLUEPRINT_LIMITS.maxStr.dateText, '14 de septiembre de 2026'),
    imageAuthorization: normalized.imageAuthorization === 'declined' ? 'declined' : 'authorized',
    clientSignatureDataUrl: clampString(
      String(normalized.clientSignatureDataUrl ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.signatureDataUrl
    ),
    clientSignerName: clampString(
      String(normalized.clientSignerName ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.signerName
    ),
    clientSignedAt: clampString(
      String(normalized.clientSignedAt ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.signedAt
    ),
    signatureRequestId: clampString(
      String(normalized.signatureRequestId ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.signatureRequestId
    ),
    agencyCopySentAt: clampString(
      String(normalized.agencyCopySentAt ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.signedAt
    ),
    agencyCopyEmail: clampString(
      String(normalized.agencyCopyEmail ?? '').trim(),
      BLUEPRINT_LIMITS.maxStr.email
    ),
  };
}

function randomToken(length = 24): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const out: string[] = [];
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i += 1) {
      out.push(alphabet[buf[i] % alphabet.length]);
    }
    return out.join('');
  }
  for (let i = 0; i < length; i += 1) {
    out.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }
  return out.join('');
}

export function generateSignatureRequestIds(): { requestId: string; accessToken: string } {
  return {
    requestId: `sig_${randomToken(22)}`,
    accessToken: randomToken(28),
  };
}

export function extractPublicAgencyData(agency: AgencyProfile) {
  const normalized = normalizeAgencyProfile(agency);
  return {
    commercialName: normalized.commercialName,
    legalHolderName: normalized.legalHolderName,
    cif: normalized.cif,
    licenseNote: normalized.licenseNote,
    addressLine1: normalized.addressLine1,
    addressLine2: normalized.addressLine2,
    phone: normalized.phone,
    email: normalized.email,
    iban: normalized.iban,
    bic: normalized.bic,
    bankBeneficiary: normalized.bankBeneficiary,
    footerText: normalized.footerText,
    jurisdictionCity: normalized.jurisdictionCity,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeSigningEnvelope(params: {
  contract: TravelContract;
  agency: AgencyProfile;
}): Promise<string> {
  const slimContract = {
    ...normalizeContract(params.contract),
    clientSignatureDataUrl: undefined,
  };
  const payloadJson = JSON.stringify({
    c: slimContract,
    a: extractPublicAgencyData(params.agency),
  });
  const rawBytes = new TextEncoder().encode(payloadJson);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([rawBytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const compressedBuffer = await new Response(stream).arrayBuffer();
      return `z.${bytesToBase64Url(new Uint8Array(compressedBuffer))}`;
    } catch {
      // Fall back to uncompressed UTF-8 base64url
    }
  }
  return `u.${bytesToBase64Url(rawBytes)}`;
}

export async function decodeSigningEnvelope(
  encoded: string
): Promise<{ contract: TravelContract; agency: AgencyProfile } | null> {
  const clean = String(encoded ?? '').trim();
  if (!clean) return null;
  try {
    let jsonText = '';
    if (clean.startsWith('z.') && typeof DecompressionStream !== 'undefined') {
      const compressed = base64UrlToBytes(clean.slice(2));
      const arrayBuf = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      ) as ArrayBuffer;
      const stream = new Blob([arrayBuf]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      jsonText = await new Response(stream).text();
    } else if (clean.startsWith('u.')) {
      jsonText = new TextDecoder().decode(base64UrlToBytes(clean.slice(2)));
    } else {
      return null;
    }

    const parsed = JSON.parse(jsonText) as {
      c?: Partial<TravelContract>;
      a?: Partial<AgencyProfile>;
    };
    if (!parsed || !parsed.c) return null;
    return {
      contract: normalizeContract(parsed.c),
      agency: normalizeAgencyProfile(parsed.a),
    };
  } catch {
    return null;
  }
}

export function buildClientSignatureUrl(params: {
  baseOrigin: string;
  basePath?: string;
  requestId: string;
  envelope?: string;
}): string {
  const origin = params.baseOrigin.replace(/\/+$/, '');
  const path = params.basePath && params.basePath.startsWith('/') ? params.basePath : '/';
  const search = new URLSearchParams();
  search.set('sign', params.requestId);
  if (params.envelope) {
    search.set('d', params.envelope);
  }
  return `${origin}${path}?${search.toString()}`;
}

export function parseClientSignatureParams(search: string): {
  requestId: string;
  envelope: string;
} | null {
  try {
    const params = new URLSearchParams(search);
    const requestId = (params.get('sign') ?? '').trim();
    const envelope = (params.get('d') ?? '').trim();
    if (!requestId && !envelope) return null;
    return { requestId, envelope };
  } catch {
    return null;
  }
}

