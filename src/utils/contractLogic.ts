import type {
  AccessUser,
  AgencyProfile,
  Client,
  ConceptLine,
  InstallmentLine,
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
  maxArrayInstallments: 10,
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
    insuranceBasicLabel: 500,
    insuranceCancellationLabel: 300,
    maeUrl: 300,
    installmentIntro: 350,
    anexoTransport: 200,
    anexoManagement: 200,
    anexoAccommodation: 250,
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

export function formatSpanishLongDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = SPANISH_MONTHS[date.getMonth()] ?? 'enero';
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
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

export function clampNumber(value: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
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

/**
 * Syncs optional services & insurance summary rows inside conceptLines & installmentLines
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
  const insuranceTotal = insuranceBasic + insuranceCancel;

  const updatedConcepts = contract.conceptLines.map((line) => {
    if (line.id === 'extra-optional') {
      return {
        ...line,
        label: selectedOptionalNames
          ? `Extras opcionales (${selectedOptionalNames})`
          : 'Extra habitación Individual / Servicios opcionales',
        amount: Math.round(optionalSelectedTotal * 100) / 100,
      };
    }
    if (line.id === 'insurance') {
      return {
        ...line,
        amount: Math.round(insuranceTotal * 100) / 100,
      };
    }
    return line;
  });

  const totalAmount = calculateConceptTotal(updatedConcepts);
  const packageSubtotal = Math.max(0, Math.round((totalAmount - insuranceTotal) * 100) / 100);

  const updatedInstallments = contract.installmentLines.map((line) => {
    if (line.id === 'inst-package') {
      return { ...line, amount: packageSubtotal };
    }
    if (line.id === 'inst-basic-ins') {
      return { ...line, amount: insuranceBasic };
    }
    if (line.id === 'inst-cancel-ins') {
      return { ...line, amount: insuranceCancel };
    }
    return line;
  });

  return {
    ...contract,
    conceptLines: updatedConcepts,
    installmentLines: updatedInstallments,
    totalAmount,
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
    template,
    client,
    agency,
    contractNumber,
    contractDateText = formatSpanishLongDate(),
    travelerRole = 'diver',
  } = params;

  const diverAmount = travelerRole === 'diver' ? template.diverPrice : 0;
  const nonDiverAmount = travelerRole === 'non-diver' ? template.nonDiverPrice : 0;

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
    {
      id: 'services-extra',
      label: 'Servicios (Botella 15L, etc)',
      amount: 0,
    },
  ];

  const basePackage = diverAmount + nonDiverAmount;
  const installmentLines: InstallmentLine[] = [
    {
      id: 'inst-package',
      label: 'Reserva y Primer pago del Paquete de Viaje',
      amount: basePackage,
    },
    {
      id: 'inst-basic-ins',
      label: 'Seguro Básico VIP',
      amount: 0,
    },
    {
      id: 'inst-cancel-ins',
      label: 'Cobertura ANULACIÓN Seguro',
      amount: 0,
    },
  ];

  return {
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
    insuranceBasicSelected: false,
    insuranceBasicLabel: template.insuranceBasicLabel,
    insuranceBasicPrice: template.insuranceBasicPrice,
    insuranceCancellationSelected: false,
    insuranceCancellationLabel: template.insuranceCancellationLabel,
    insuranceCancellationPrice: template.insuranceCancellationPrice,
    declineAssistanceInsurance: true,
    declineCancellationInsurance: true,
    maeDestinationUrl: template.maeDestinationUrl,
    conceptLines,
    installmentIntro:
      'Momento de la firma del presente contrato y en concepto de Reserva y Pago inicial más vuelos y seguro si desea el CONTRATANTE PRINCIPAL la cantidad de:',
    installmentLines,
    totalAmount: basePackage,
    anexoTransportDetail: template.anexoTransportDetail,
    anexoManagementDetail: template.anexoManagementDetail,
    anexoAccommodationDetail: template.anexoAccommodationDetail,
    anexoIncludedServices: [...template.anexoIncludedServices],
    anexoHealthContacts: [...template.anexoHealthContacts],
    generalConditionsDate: template.generalConditionsDate,
    imageAuthorization: 'authorized',
  };
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

export function validateContractInput(
  contract: Pick<TravelContract, 'contractNumber' | 'clientFullName' | 'clientDni' | 'clientLocality' | 'tripTitle' | 'bankIban'>
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!BLUEPRINT_LIMITS.contractNumberPattern.test(contract.contractNumber.trim()) || contract.contractNumber.trim().length < 2) {
    errors.contractNumber = 'Usa solo letras, números y guiones (ej. C-2026-055).';
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
  const normalizedDomain = normalizePublicationDomain(profile.publicDomain ?? '');
  const safeDomain =
    normalizedDomain && !validatePublicationDomain(normalizedDomain) ? normalizedDomain : '';

  return {
    ownerId: clampString(ownerId, BLUEPRINT_LIMITS.maxStr.ownerId),
    commercialName: clampString(profile.commercialName || 'VIAJES MAR DE HIELO', 120),
    legalHolderName: clampString(profile.legalHolderName || 'MARIA DEL PILAR JIMENEZ REINA', 120),
    cif: clampString(profile.cif || '15.405.540-W', 32),
    licenseNote: clampString(profile.licenseNote || 'Licencia de Agencia de Viajes en Cataluña', 200),
    addressLine1: clampString(profile.addressLine1 || 'Port Esportiu de Tarragona Local LD4', 150),
    addressLine2: clampString(profile.addressLine2 || '43004 – Tarragona (ESPAÑA)', 150),
    phone: clampString(profile.phone || '(+34) 644 53 36 86', 40),
    email: clampString(profile.email || 'Info@ofertasviajesbuceo.com', 120),
    iban: clampString(profile.iban || 'ES4300496703012116041736', 64),
    bic: clampString(profile.bic || 'BSCHESMMXXX', 32),
    bankBeneficiary: clampString(profile.bankBeneficiary || 'María del Pilar Jiménez Reina', 120),
    footerText: clampString(
      profile.footerText || 'María del Pilar Jiménez Reina – 15405540W – Licencia de Agencia de Viajes en Cataluña (España)',
      220
    ),
    jurisdictionCity: clampString(profile.jurisdictionCity || 'Tarragona', 80),
    publicDomain: clampString(safeDomain, BLUEPRINT_LIMITS.maxStr.publicDomain),
  };
}

export function sanitizeClientPayload(client: Client, ownerId: string) {
  return {
    ownerId: clampString(ownerId, BLUEPRINT_LIMITS.maxStr.ownerId),
    fullName: clampString(client.fullName.trim(), BLUEPRINT_LIMITS.maxStr.fullName),
    dni: clampString(client.dni.trim(), BLUEPRINT_LIMITS.maxStr.dni),
    locality: clampString(client.locality.trim(), BLUEPRINT_LIMITS.maxStr.locality),
    email: clampString(client.email.trim(), BLUEPRINT_LIMITS.maxStr.email),
    phone: clampString(client.phone.trim(), BLUEPRINT_LIMITS.maxStr.phone),
    notes: clampString(client.notes.trim(), BLUEPRINT_LIMITS.maxStr.notes),
    defaultRepresented: sanitizeStringArray(client.defaultRepresented, BLUEPRINT_LIMITS.maxArrayRepresented, 150),
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
  return {
    ownerId: clampString(ownerId, BLUEPRINT_LIMITS.maxStr.ownerId),
    name: clampString(template.name.trim() || 'Plantilla sin nombre', BLUEPRINT_LIMITS.maxStr.templateName),
    tripTitle: clampString(template.tripTitle.trim() || 'Viaje combinado', BLUEPRINT_LIMITS.maxStr.tripTitle),
    destinationLabel: clampString(template.destinationLabel.trim() || 'Destino', BLUEPRINT_LIMITS.maxStr.destinationLabel),
    defaultStartDateText: clampString(template.defaultStartDateText.trim() || 'Por definir', BLUEPRINT_LIMITS.maxStr.dateText),
    defaultEndDateText: clampString(template.defaultEndDateText.trim() || 'Por definir', BLUEPRINT_LIMITS.maxStr.dateText),
    diverPrice: clampNumber(template.diverPrice, 0, 100000),
    nonDiverPrice: clampNumber(template.nonDiverPrice, 0, 100000),
    priceSummaryText: clampString(template.priceSummaryText.trim() || '-', BLUEPRINT_LIMITS.maxStr.priceSummaryText),
    bankConceptPrefix: clampString(template.bankConceptPrefix.trim() || 'VIAJE', BLUEPRINT_LIMITS.maxStr.bankConceptPrefix),
    minGroupSize: clampNumber(template.minGroupSize, 1, 500),
    cancellationNoticeDays: clampNumber(template.cancellationNoticeDays, 0, 365),
    itineraryDays: sanitizeItinerary(template.itineraryDays),
    destinationPayments: sanitizeStringArray(template.destinationPayments, BLUEPRINT_LIMITS.maxArrayPayments, 200),
    optionalServices: sanitizeOptionalServices(template.optionalServices),
    transportIncluded: Boolean(template.transportIncluded),
    transportSummary: clampString(template.transportSummary.trim() || '-', BLUEPRINT_LIMITS.maxStr.transportSummary),
    transportCheckboxLabel: clampString(template.transportCheckboxLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.transportCheckbox),
    insuranceBasicLabel: clampString(template.insuranceBasicLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.insuranceBasicLabel),
    insuranceBasicPrice: clampNumber(template.insuranceBasicPrice, 0, 10000),
    insuranceCancellationLabel: clampString(template.insuranceCancellationLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.insuranceCancellationLabel),
    insuranceCancellationPrice: clampNumber(template.insuranceCancellationPrice, 0, 10000),
    maeDestinationUrl: clampString(template.maeDestinationUrl.trim() || 'https://www.exteriores.gob.es', BLUEPRINT_LIMITS.maxStr.maeUrl),
    anexoTransportDetail: clampString(template.anexoTransportDetail.trim() || '-', BLUEPRINT_LIMITS.maxStr.anexoTransport),
    anexoManagementDetail: clampString(template.anexoManagementDetail.trim() || 'Gestión de pagos.', BLUEPRINT_LIMITS.maxStr.anexoManagement),
    anexoAccommodationDetail: clampString(template.anexoAccommodationDetail.trim() || '-', BLUEPRINT_LIMITS.maxStr.anexoAccommodation),
    anexoIncludedServices: sanitizeStringArray(template.anexoIncludedServices, BLUEPRINT_LIMITS.maxArrayServices, 200),
    anexoHealthContacts: sanitizeStringArray(template.anexoHealthContacts, BLUEPRINT_LIMITS.maxArrayHealth, 250),
    generalConditionsDate: clampString(template.generalConditionsDate.trim() || '14 de septiembre de 2026', BLUEPRINT_LIMITS.maxStr.dateText),
  };
}

export function sanitizeContractPayload(contract: TravelContract, ownerId: string) {
  const conceptLines = contract.conceptLines.slice(0, BLUEPRINT_LIMITS.maxArrayConcepts).map((c) => ({
    id: clampString(c.id || 'c', 64),
    label: clampString(c.label, 180),
    amount: clampNumber(c.amount, 0, 1000000),
  }));

  const installmentLines = contract.installmentLines.slice(0, BLUEPRINT_LIMITS.maxArrayInstallments).map((i) => ({
    id: clampString(i.id || 'i', 64),
    label: clampString(i.label, 180),
    amount: clampNumber(i.amount, 0, 1000000),
  }));

  const cleanContractNumber = clampString(
    contract.contractNumber.trim().replace(/[^A-Za-z0-9-]/g, '-') || 'C-2026-001',
    BLUEPRINT_LIMITS.maxStr.contractNumber
  );

  return {
    ownerId: clampString(ownerId, BLUEPRINT_LIMITS.maxStr.ownerId),
    contractNumber: cleanContractNumber,
    contractDateText: clampString(contract.contractDateText.trim() || formatSpanishLongDate(), BLUEPRINT_LIMITS.maxStr.dateText),
    status: contract.status,
    templateId: clampString(contract.templateId, 128),
    templateName: clampString(contract.templateName, BLUEPRINT_LIMITS.maxStr.templateName),
    clientId: clampString(contract.clientId, 128),
    clientFullName: clampString(contract.clientFullName.trim() || 'Cliente', BLUEPRINT_LIMITS.maxStr.fullName),
    clientDni: clampString(contract.clientDni.trim() || '00000000A', BLUEPRINT_LIMITS.maxStr.dni),
    clientLocality: clampString(contract.clientLocality.trim() || 'España', BLUEPRINT_LIMITS.maxStr.locality),
    representedPeople: sanitizeStringArray(contract.representedPeople, BLUEPRINT_LIMITS.maxArrayRepresented, 150),
    tripTitle: clampString(contract.tripTitle.trim() || 'Viaje combinado', BLUEPRINT_LIMITS.maxStr.tripTitle),
    startDateText: clampString(contract.startDateText.trim() || 'Por definir', BLUEPRINT_LIMITS.maxStr.dateText),
    endDateText: clampString(contract.endDateText.trim() || 'Por definir', BLUEPRINT_LIMITS.maxStr.dateText),
    diverPrice: clampNumber(contract.diverPrice, 0, 100000),
    nonDiverPrice: clampNumber(contract.nonDiverPrice, 0, 100000),
    priceSummaryText: clampString(contract.priceSummaryText.trim() || '-', BLUEPRINT_LIMITS.maxStr.priceSummaryText),
    bankIban: clampString(contract.bankIban.trim() || 'ES4300496703012116041736', BLUEPRINT_LIMITS.maxStr.iban),
    bankBeneficiary: clampString(contract.bankBeneficiary.trim() || 'María del Pilar Jiménez Reina', BLUEPRINT_LIMITS.maxStr.beneficiary),
    bankConcept: clampString(contract.bankConcept.trim() || 'VIAJE', BLUEPRINT_LIMITS.maxStr.bankConcept),
    bankBic: clampString(contract.bankBic.trim(), BLUEPRINT_LIMITS.maxStr.bic),
    minGroupSize: clampNumber(contract.minGroupSize, 1, 500),
    cancellationNoticeDays: clampNumber(contract.cancellationNoticeDays, 0, 365),
    clientSpecialRequest: clampString(contract.clientSpecialRequest.trim(), BLUEPRINT_LIMITS.maxStr.specialRequest),
    itineraryDays: sanitizeItinerary(contract.itineraryDays),
    destinationPayments: sanitizeStringArray(contract.destinationPayments, BLUEPRINT_LIMITS.maxArrayPayments, 200),
    optionalServices: sanitizeOptionalServices(contract.optionalServices),
    transportIncluded: Boolean(contract.transportIncluded),
    transportSummary: clampString(contract.transportSummary.trim() || '-', BLUEPRINT_LIMITS.maxStr.transportSummary),
    transportCheckboxLabel: clampString(contract.transportCheckboxLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.transportCheckbox),
    transportChecked: Boolean(contract.transportChecked),
    insuranceBasicSelected: Boolean(contract.insuranceBasicSelected),
    insuranceBasicLabel: clampString(contract.insuranceBasicLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.insuranceBasicLabel),
    insuranceBasicPrice: clampNumber(contract.insuranceBasicPrice, 0, 10000),
    insuranceCancellationSelected: Boolean(contract.insuranceCancellationSelected),
    insuranceCancellationLabel: clampString(contract.insuranceCancellationLabel.trim() || '-', BLUEPRINT_LIMITS.maxStr.insuranceCancellationLabel),
    insuranceCancellationPrice: clampNumber(contract.insuranceCancellationPrice, 0, 10000),
    declineAssistanceInsurance: Boolean(contract.declineAssistanceInsurance),
    declineCancellationInsurance: Boolean(contract.declineCancellationInsurance),
    maeDestinationUrl: clampString(contract.maeDestinationUrl.trim() || 'https://www.exteriores.gob.es', BLUEPRINT_LIMITS.maxStr.maeUrl),
    conceptLines,
    installmentIntro: clampString(contract.installmentIntro.trim() || '-', BLUEPRINT_LIMITS.maxStr.installmentIntro),
    installmentLines,
    totalAmount: calculateConceptTotal(conceptLines),
    anexoTransportDetail: clampString(contract.anexoTransportDetail.trim() || '-', BLUEPRINT_LIMITS.maxStr.anexoTransport),
    anexoManagementDetail: clampString(contract.anexoManagementDetail.trim() || 'Gestión de pagos.', BLUEPRINT_LIMITS.maxStr.anexoManagement),
    anexoAccommodationDetail: clampString(contract.anexoAccommodationDetail.trim() || '-', BLUEPRINT_LIMITS.maxStr.anexoAccommodation),
    anexoIncludedServices: sanitizeStringArray(contract.anexoIncludedServices, BLUEPRINT_LIMITS.maxArrayServices, 200),
    anexoHealthContacts: sanitizeStringArray(contract.anexoHealthContacts, BLUEPRINT_LIMITS.maxArrayHealth, 250),
    generalConditionsDate: clampString(contract.generalConditionsDate.trim() || '14 de septiembre de 2026', BLUEPRINT_LIMITS.maxStr.dateText),
    imageAuthorization: contract.imageAuthorization === 'declined' ? 'declined' : 'authorized',
  };
}
