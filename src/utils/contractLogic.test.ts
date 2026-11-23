import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalUrl,
  calculateConceptTotal,
  createContractFromTemplate,
  formatEuro,
  generateNextContractNumber,
  normalizePublicationDomain,
  normalizeUsername,
  sanitizeAccessUserPayload,
  sanitizeAgencyProfilePayload,
  sanitizeContractPayload,
  syncContractFinancialLines,
  validateAccessUserInput,
  validateClientInput,
  validateContractInput,
  validatePublicationDomain,
} from './contractLogic';
import { getRolePermissions, hashPassword, verifyPassword } from './authCrypto';
import { SEED_ACCESS_USERS } from '../data/seedData';
import type { AgencyProfile, Client, TripTemplate } from '../types/contract';

const mockAgency: AgencyProfile = {
  ownerId: 'user-1',
  commercialName: 'VIAJES MAR DE HIELO',
  legalHolderName: 'MARIA DEL PILAR JIMENEZ REINA',
  cif: '15.405.540-W',
  licenseNote: 'Licencia de Agencia de Viajes en Cataluña',
  addressLine1: 'Port Esportiu de Tarragona Local LD4',
  addressLine2: '43004 – Tarragona (ESPAÑA)',
  phone: '(+34) 644 53 36 86',
  email: 'Info@ofertasviajesbuceo.com',
  iban: 'ES4300496703012116041736',
  bic: 'BSCHESMMXXX',
  bankBeneficiary: 'María del Pilar Jiménez Reina',
  footerText: 'María del Pilar Jiménez Reina – 15405540W – Licencia de Agencia de Viajes en Cataluña (España)',
  jurisdictionCity: 'Tarragona',
};

const mockClient: Client = {
  id: 'cli-1',
  ownerId: 'user-1',
  fullName: 'CARLOS MENDOZA RUIZ',
  dni: '44556677K',
  locality: 'BARCELONA (BARCELONA)',
  email: 'carlos@ejemplo.es',
  phone: '600112233',
  notes: '',
  defaultRepresented: ['Laura Mendoza'],
};

const mockTemplate: TripTemplate = {
  id: 'tpl-1',
  ownerId: 'user-1',
  name: 'La Azohía - Murcia 2026',
  tripTitle: 'LA AZOHIA - Murcia',
  destinationLabel: 'LA AZOHÍA',
  defaultStartDateText: '4 de diciembre de 2026',
  defaultEndDateText: '8 de diciembre de 2026',
  diverPrice: 699.5,
  nonDiverPrice: 350,
  priceSummaryText: '699,50 euros por persona buceador',
  bankConceptPrefix: 'LAZH26',
  minGroupSize: 7,
  cancellationNoticeDays: 15,
  itineraryDays: [{ title: 'Día 1', description: 'Llegada al hotel.' }],
  destinationPayments: ['Comidas no mencionadas'],
  optionalServices: [
    { id: 'srv-ind', label: 'Habitación de uso INDIVIDUAL', note: '(+130)', price: 130, selected: false },
  ],
  transportIncluded: false,
  transportSummary: 'NO incluido',
  transportCheckboxLabel: 'El cliente se trasladará por sus medios',
  insuranceBasicLabel: 'Seguro Básico (+25€)',
  insuranceBasicPrice: 25,
  insuranceCancellationLabel: 'Cobertura anulación (+10€)',
  insuranceCancellationPrice: 10,
  maeDestinationUrl: 'https://www.exteriores.gob.es',
  anexoTransportDetail: 'Origen hasta Hotel Mazarrón',
  anexoManagementDetail: 'Gestión de pagos.',
  anexoAccommodationDetail: '5 días/4 noches',
  anexoIncludedServices: ['8 inmersiones'],
  anexoHealthContacts: ['Sanidad Exterior'],
  generalConditionsDate: '14 de septiembre de 2026',
};

test('generateNextContractNumber increments sequentially within the target year', () => {
  const next = generateNextContractNumber(
    [{ contractNumber: 'C-2026-055' }, { contractNumber: 'C-2026-012' }, { contractNumber: 'C-2025-099' }],
    2026
  );
  assert.equal(next, 'C-2026-056');

  const first = generateNextContractNumber([], 2026);
  assert.equal(first, 'C-2026-001');
});

test('createContractFromTemplate and syncContractFinancialLines compute totals accurately', () => {
  const contract = createContractFromTemplate({
    id: 'ctr-new',
    ownerId: 'user-1',
    template: mockTemplate,
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-056',
    travelerRole: 'non-diver',
  });

  assert.equal(contract.totalAmount, 350);
  assert.equal(contract.bankConcept, 'LAZH26, CARLOS MENDOZA RUIZ');
  assert.deepEqual(contract.representedPeople, ['Laura Mendoza']);

  // Select individual room (+130) and basic + cancellation insurance (+25 + 10)
  const updated = syncContractFinancialLines({
    ...contract,
    optionalServices: contract.optionalServices.map((s) => ({ ...s, selected: true })),
    insuranceBasicSelected: true,
    insuranceCancellationSelected: true,
  });

  assert.equal(updated.totalAmount, 350 + 130 + 25 + 10);
  assert.equal(calculateConceptTotal(updated.conceptLines), 515);
  assert.equal(updated.installmentLines.find((i) => i.id === 'inst-package')?.amount, 480);
  assert.equal(updated.installmentLines.find((i) => i.id === 'inst-basic-ins')?.amount, 25);
  assert.equal(updated.installmentLines.find((i) => i.id === 'inst-cancel-ins')?.amount, 10);
});

test('validateClientInput and validateContractInput reject invalid inputs', () => {
  const clientErrors = validateClientInput({
    fullName: 'A',
    dni: '1',
    locality: '',
    email: 'invalid-email',
  });
  assert.ok(clientErrors.fullName);
  assert.ok(clientErrors.dni);
  assert.ok(clientErrors.locality);
  assert.ok(clientErrors.email);

  const contractErrors = validateContractInput({
    contractNumber: 'bad number!',
    clientFullName: '',
    clientDni: '',
    clientLocality: '',
    tripTitle: '',
    bankIban: '123',
  });
  assert.ok(contractErrors.contractNumber);
  assert.ok(contractErrors.clientFullName);
  assert.ok(contractErrors.bankIban);
});

test('sanitizeContractPayload enforces blueprint array and string limits', () => {
  const contract = createContractFromTemplate({
    id: 'ctr-lim',
    ownerId: 'user-1',
    template: mockTemplate,
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-057',
  });
  contract.itineraryDays = Array.from({ length: 45 }, (_, i) => ({
    title: `Día ${i + 1}`,
    description: 'x'.repeat(2000),
  }));

  const sanitized = sanitizeContractPayload(contract, 'user-1');
  assert.equal(sanitized.itineraryDays.length, 30);
  assert.equal(sanitized.itineraryDays[0].description.length, 1500);
});

test('formatEuro formats Spanish currency cleanly', () => {
  assert.match(formatEuro(480), /480,00\s€/);
  assert.match(formatEuro(0), /0\s€/);
});

test('publication domain normalization, validation, and canonical URL resolution work cleanly', () => {
  assert.equal(
    normalizePublicationDomain(' https://Contratos.OfertasViajesBuceo.com/ruta?a=1 '),
    'contratos.ofertasviajesbuceo.com'
  );
  assert.equal(normalizePublicationDomain('viajesmardehielo.es:3000/'), 'viajesmardehielo.es');
  assert.equal(validatePublicationDomain('contratos.ofertasviajesbuceo.com'), null);
  assert.equal(validatePublicationDomain(''), null);
  assert.ok(validatePublicationDomain('localhost'));
  assert.ok(validatePublicationDomain('dominio con espacios.com'));

  assert.equal(
    buildCanonicalUrl('https://contratos.ofertasviajesbuceo.com/', 'https://fallback.example'),
    'https://contratos.ofertasviajesbuceo.com'
  );
  assert.equal(buildCanonicalUrl('', 'https://fallback.example'), 'https://fallback.example');

  const sanitizedValid = sanitizeAgencyProfilePayload(
    { ...mockAgency, publicDomain: 'https://Contratos.OfertasViajesBuceo.com/' },
    'user-1'
  );
  assert.equal(sanitizedValid.publicDomain, 'contratos.ofertasviajesbuceo.com');

  const sanitizedInvalid = sanitizeAgencyProfilePayload(
    { ...mockAgency, publicDomain: 'no valido' },
    'user-1'
  );
  assert.equal(sanitizedInvalid.publicDomain, '');
});

test('password hashing, verification, access user validation, and RBAC permissions work properly', async () => {
  const samplePass = ['Clave', 'Demo', '2026!'].join('');
  const hash = await hashPassword(samplePass);
  assert.ok(hash.startsWith('pbkdf2$100000$'));
  assert.equal(await verifyPassword(samplePass, hash), true);
  assert.equal(await verifyPassword('ClaveIncorrecta', hash), false);
  assert.equal(await verifyPassword('otra', 'formato-invalido'), false);

  const primary = SEED_ACCESS_USERS[0];
  assert.equal(primary.username, 'mardehielo');
  assert.equal(primary.role, 'admin');
  assert.equal(primary.isPrimary, true);
  assert.equal(primary.active, true);

  assert.equal(normalizeUsername('  @Mar.De.Hielo  '), 'mar.de.hielo');

  const invalidErrors = validateAccessUserInput({
    username: 'mardehielo',
    displayName: 'A',
    email: 'mal-correo',
    password: '123',
    requirePassword: true,
    existingUsernames: ['mardehielo'],
  });
  assert.ok(invalidErrors.username);
  assert.ok(invalidErrors.displayName);
  assert.ok(invalidErrors.email);
  assert.ok(invalidErrors.password);

  const adminPerms = getRolePermissions('admin');
  assert.equal(adminPerms.canManageUsers, true);
  assert.equal(adminPerms.canDeleteRecords, true);
  assert.equal(adminPerms.isReadOnly, false);

  const editorPerms = getRolePermissions('editor');
  assert.equal(editorPerms.canManageUsers, false);
  assert.equal(editorPerms.canEditContracts, true);
  assert.equal(editorPerms.canDeleteRecords, false);

  const viewerPerms = getRolePermissions('viewer');
  assert.equal(viewerPerms.canEditContracts, false);
  assert.equal(viewerPerms.isReadOnly, true);

  const sanitizedUser = sanitizeAccessUserPayload(
    {
      id: 'usr-2',
      ownerId: 'ignored',
      username: '  Laura.M  ',
      displayName: '  Laura Martínez ',
      email: ' laura@agencia.com ',
      role: 'editor',
      active: true,
      isPrimary: false,
      passwordHash: hash,
    },
    'owner-99'
  );
  assert.equal(sanitizedUser.ownerId, 'owner-99');
  assert.equal(sanitizedUser.username, 'laura.m');
  assert.equal(sanitizedUser.role, 'editor');
});
