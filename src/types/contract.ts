export type ContractStatus = 'draft' | 'sent' | 'signed' | 'archived';
export type ImageAuthorization = 'authorized' | 'declined';
export type InstallmentCount = 1 | 2 | 3 | 4 | 5 | 6;
export type FlightPaymentMode = 'first_installment' | 'prorated';

export interface ItineraryDay {
  title: string;
  description: string;
}

export interface OptionalServiceItem {
  id: string;
  label: string;
  note: string;
  price: number;
  selected: boolean;
}

export interface ConceptLine {
  id: string;
  label: string;
  amount: number;
}

export interface InstallmentLine {
  id: string;
  label: string;
  amount: number;
}

export interface InstallmentStage {
  id: string;
  title: string;
  dueLabel: string;
  introText: string;
  lines: InstallmentLine[];
  subtotal: number;
}

export interface InsurancePolicyOption {
  id: string;
  insurer: string;
  policyNumber: string;
  name: string;
}

export interface AgencyProfile {
  id?: string;
  ownerId: string;
  commercialName: string;
  legalHolderName: string;
  cif: string;
  licenseNote: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  iban: string;
  bic: string;
  bankBeneficiary: string;
  footerText: string;
  jurisdictionCity: string;
  publicDomain?: string;
  insurancePolicies?: InsurancePolicyOption[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Client {
  id: string;
  ownerId: string;
  fullName: string;
  dni: string;
  locality: string;
  email: string;
  phone: string;
  notes: string;
  defaultRepresented: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TripTemplate {
  id: string;
  ownerId: string;
  name: string;
  tripTitle: string;
  destinationLabel: string;
  defaultStartDateText: string;
  defaultEndDateText: string;
  diverPrice: number;
  nonDiverPrice: number;
  priceSummaryText: string;
  bankConceptPrefix: string;
  minGroupSize: number;
  cancellationNoticeDays: number;
  itineraryDays: ItineraryDay[];
  destinationPayments: string[];
  optionalServices: OptionalServiceItem[];
  transportIncluded: boolean;
  transportSummary: string;
  transportCheckboxLabel: string;
  flightDetails?: string;
  flightPrice?: number;
  flightPaymentMode?: FlightPaymentMode;
  insuranceBasicLabel: string;
  insuranceBasicPrice: number;
  insuranceCancellationLabel: string;
  insuranceCancellationPrice: number;
  maeDestinationUrl: string;
  anexoTransportDetail: string;
  anexoManagementDetail: string;
  anexoAccommodationDetail: string;
  anexoIncludedServices: string[];
  anexoHealthContacts: string[];
  generalConditionsDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TravelContract {
  id: string;
  ownerId: string;
  contractNumber: string;
  contractDateText: string;
  status: ContractStatus;
  templateId: string;
  templateName: string;
  clientId: string;
  clientFullName: string;
  clientDni: string;
  clientLocality: string;
  representedPeople: string[];
  tripTitle: string;
  startDateText: string;
  endDateText: string;
  diverPrice: number;
  nonDiverPrice: number;
  priceSummaryText: string;
  bankIban: string;
  bankBeneficiary: string;
  bankConcept: string;
  bankBic: string;
  minGroupSize: number;
  cancellationNoticeDays: number;
  clientSpecialRequest: string;
  itineraryDays: ItineraryDay[];
  destinationPayments: string[];
  optionalServices: OptionalServiceItem[];
  transportIncluded: boolean;
  transportSummary: string;
  transportCheckboxLabel: string;
  transportChecked: boolean;
  flightDetails?: string;
  flightPrice?: number;
  flightPaymentMode?: FlightPaymentMode;
  insuranceBasicSelected: boolean;
  insuranceBasicLabel: string;
  insuranceBasicPrice: number;
  insuranceCancellationSelected: boolean;
  insuranceCancellationLabel: string;
  insuranceCancellationPrice: number;
  insurancePolicyNumber?: string;
  insuranceCertificateNumber?: string;
  declineAssistanceInsurance: boolean;
  declineCancellationInsurance: boolean;
  maeDestinationUrl: string;
  conceptLines: ConceptLine[];
  installmentCount?: InstallmentCount;
  installmentIntro: string;
  installmentLines: InstallmentLine[];
  totalAmount: number;
  anexoTransportDetail: string;
  anexoManagementDetail: string;
  anexoAccommodationDetail: string;
  anexoIncludedServices: string[];
  anexoHealthContacts: string[];
  generalConditionsDate: string;
  imageAuthorization: ImageAuthorization;
  clientSignatureDataUrl?: string;
  clientSignerName?: string;
  clientSignedAt?: string;
  signatureRequestId?: string;
  agencyCopySentAt?: string;
  agencyCopyEmail?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SignatureRequest {
  id: string;
  ownerId: string;
  contractId: string;
  contractNumber: string;
  accessToken: string;
  status: 'pending' | 'signed';
  contractData: Record<string, unknown>;
  agencyData: {
    commercialName: string;
    legalHolderName: string;
    cif: string;
    licenseNote: string;
    addressLine1: string;
    addressLine2: string;
    phone: string;
    email: string;
    iban: string;
    bic: string;
    bankBeneficiary: string;
    footerText: string;
    jurisdictionCity: string;
  };
  clientSignatureDataUrl: string;
  clientSignerName: string;
  clientSignedAt: string;
  agencyCopySentAt?: string;
  agencyCopyEmail?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SaveSyncState = 'idle' | 'saving' | 'saved' | 'error' | 'local';

export type AccessRole = 'admin' | 'editor' | 'viewer';

export interface AccessUser {
  id: string;
  ownerId: string;
  username: string;
  displayName: string;
  email: string;
  role: AccessRole;
  active: boolean;
  isPrimary: boolean;
  passwordHash: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActiveSession {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: AccessRole;
  authSource: 'local-user' | 'google' | 'firebase-email';
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageAgency: boolean;
  canManageDomain: boolean;
  canEditContracts: boolean;
  canEditTemplates: boolean;
  canEditClients: boolean;
  canDeleteRecords: boolean;
  isReadOnly: boolean;
}

