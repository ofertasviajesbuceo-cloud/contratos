export type ContractStatus = 'draft' | 'sent' | 'signed' | 'archived';
export type ImageAuthorization = 'authorized' | 'declined';

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
  insuranceBasicSelected: boolean;
  insuranceBasicLabel: string;
  insuranceBasicPrice: number;
  insuranceCancellationSelected: boolean;
  insuranceCancellationLabel: string;
  insuranceCancellationPrice: number;
  declineAssistanceInsurance: boolean;
  declineCancellationInsurance: boolean;
  maeDestinationUrl: string;
  conceptLines: ConceptLine[];
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

