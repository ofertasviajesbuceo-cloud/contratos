import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalUrl,
  buildClientSignatureUrl,
  buildInstallmentSchedule,
  calculateConceptTotal,
  createContractFromTemplate,
  decodeSigningEnvelope,
  DEFAULT_INSTALLMENT_INTRO,
  DEFAULT_INSURANCE_POLICIES,
  encodeSigningEnvelope,
  extractDefaultPolicyFromLabel,
  formatEuro,
  formatFirestoreErrorForUser,
  formatInsuranceLabelWithPolicyAndCert,
  generateNextContractNumber,
  generateSignatureRequestIds,
  normalizeInsurancePolicies,
  normalizePublicationDomain,
  normalizeUsername,
  parseClientSignatureParams,
  parseSpanishDate,
  sanitizeAccessUserPayload,
  sanitizeAgencyProfilePayload,
  sanitizeContractPayload,
  sanitizeTemplatePayload,
  subtractMonthsFromSpanishDate,
  syncContractFinancialLines,
  validateAccessUserInput,
  validateClientInput,
  validateContractInput,
  validateContractNumberInput,
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

test('createContractFromTemplate survives partial legacy data and sanitizes contractNumber', () => {
  const partialTemplate = {
    id: 'tpl-partial',
    name: 'Escapada Parcial',
    tripTitle: 'Escapada',
    destinationLabel: 'Medas',
    diverPrice: 400,
    nonDiverPrice: 200,
    priceSummaryText: '-',
  } as unknown as TripTemplate;

  const partialClient = {
    id: 'cli-partial',
    fullName: 'ANA PÉREZ',
    dni: '99887766A',
    locality: 'VALENCIA',
  } as unknown as Client;

  const contract = createContractFromTemplate({
    id: 'ctr-partial',
    ownerId: 'user-1',
    template: partialTemplate,
    client: partialClient,
    agency: {} as AgencyProfile,
    contractNumber: '2026/056!',
  });

  assert.equal(contract.contractNumber, '2026-056');
  assert.deepEqual(contract.representedPeople, []);
  assert.deepEqual(contract.itineraryDays, []);
  assert.deepEqual(contract.destinationPayments, []);
  assert.deepEqual(contract.optionalServices, []);
  assert.equal(contract.totalAmount, 400);

  const sanitizedContract = sanitizeContractPayload(
    { ...contract, contractNumber: '1', priceSummaryText: '-', bankIban: '12' },
    'user-1'
  );
  assert.ok(sanitizedContract.contractNumber.length >= 2);
  assert.match(sanitizedContract.contractNumber, /^[A-Za-z0-9-]+$/);
  assert.ok(sanitizedContract.priceSummaryText.length >= 2);
  assert.ok(sanitizedContract.bankIban.length >= 5);

  const sanitizedTemplate = sanitizeTemplatePayload(partialTemplate, 'user-1');
  assert.ok(sanitizedTemplate.priceSummaryText.length >= 2);
  assert.ok(sanitizedTemplate.defaultStartDateText.length >= 2);
  assert.ok(sanitizedTemplate.generalConditionsDate.length >= 2);
});

test('validateContractNumberInput and formatFirestoreErrorForUser handle invalid inputs and cloud errors', () => {
  assert.equal(validateContractNumberInput('C-2026-056'), null);
  assert.ok(validateContractNumberInput('1'));
  assert.ok(validateContractNumberInput('2026/056'));

  const permJson = JSON.stringify({ error: 'Missing or insufficient permissions (permission-denied)' });
  assert.match(formatFirestoreErrorForUser(new Error(permJson)), /permisos o validación/i);
  assert.match(formatFirestoreErrorForUser(new Error('network unavailable')), /conexión/i);
  assert.match(formatFirestoreErrorForUser(new Error('resource-exhausted quota')), /límite/i);
});

test('parseSpanishDate and subtractMonthsFromSpanishDate calculate 2-month and 4-month deadlines accurately', () => {
  const parsed = parseSpanishDate('4 de diciembre de 2026');
  assert.ok(parsed);
  assert.equal(parsed?.getFullYear(), 2026);
  assert.equal(parsed?.getMonth(), 11);
  assert.equal(parsed?.getDate(), 4);

  assert.equal(subtractMonthsFromSpanishDate('4 de diciembre de 2026', 2), '4 de octubre de 2026');
  assert.equal(subtractMonthsFromSpanishDate('4 de diciembre de 2026', 4), '4 de agosto de 2026');
  assert.equal(subtractMonthsFromSpanishDate('31 de agosto de 2026', 2), '30 de junio de 2026');
  assert.equal(subtractMonthsFromSpanishDate('15/06/2026', 2), '15 de abril de 2026');
  assert.equal(subtractMonthsFromSpanishDate('Por definir', 2), null);
});

test('buildInstallmentSchedule splits 1, 2, and 3 plazos keeping insurances fixed in Plazo 1 and exact cent totals', () => {
  const baseContract = createContractFromTemplate({
    id: 'ctr-inst',
    ownerId: 'user-1',
    template: mockTemplate,
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-060',
    travelerRole: 'diver',
  });

  const withExtras = syncContractFinancialLines({
    ...baseContract,
    optionalServices: baseContract.optionalServices.map((s) => ({ ...s, selected: true })),
    insuranceBasicSelected: true,
    insuranceCancellationSelected: true,
  });
  // Trip = 699.50 + 130 = 829.50; Insurances = 25 + 10 = 35; Total = 864.50
  assert.equal(withExtras.totalAmount, 864.5);

  // 1 plazo
  const oneStage = buildInstallmentSchedule({ ...withExtras, installmentCount: 1 });
  assert.equal(oneStage.length, 1);
  assert.equal(oneStage[0].introText, DEFAULT_INSTALLMENT_INTRO);
  assert.equal(oneStage[0].subtotal, 864.5);

  // 2 plazos: 829.50 / 2 = 414.75 each; Plazo 1 = 414.75 + 35 = 449.75; Plazo 2 = 414.75
  const twoStages = buildInstallmentSchedule({ ...withExtras, installmentCount: 2 });
  assert.equal(twoStages.length, 2);
  assert.equal(twoStages[0].introText, DEFAULT_INSTALLMENT_INTRO);
  assert.equal(twoStages[0].subtotal, 449.75);
  assert.match(twoStages[0].lines[0].label, /Habitación de uso INDIVIDUAL/);
  assert.equal(
    twoStages[1].introText,
    'El Cliente abonará el 4 de octubre de 2026 (2 meses antes de la fecha de inicio del viaje) la cantidad de:'
  );
  assert.equal(twoStages[1].subtotal, 414.75);

  // 3 plazos: 829.50 / 3 = 276.50 each; Plazo 1 = 276.50 + 35 = 311.50; Plazo 2 = 276.50 (4m); Plazo 3 = 276.50 (2m)
  const threeStages = buildInstallmentSchedule({ ...withExtras, installmentCount: 3 });
  assert.equal(threeStages.length, 3);
  assert.equal(threeStages[0].subtotal, 311.5);
  assert.equal(
    threeStages[1].introText,
    'El Cliente abonará el 4 de agosto de 2026 (4 meses antes de la fecha de inicio del viaje) la cantidad de:'
  );
  assert.equal(threeStages[1].subtotal, 276.5);
  assert.equal(
    threeStages[2].introText,
    'El Cliente abonará el 4 de octubre de 2026 (2 meses antes de la fecha de inicio del viaje) la cantidad de:'
  );
  assert.equal(threeStages[2].subtotal, 276.5);

  // Cent remainder handling (100.01 across 3 plazos)
  const oddContract = {
    ...baseContract,
    insuranceBasicSelected: false,
    insuranceCancellationSelected: false,
    conceptLines: [{ id: 'pkg-diver', label: 'Paquete', amount: 100.01 }],
    totalAmount: 100.01,
    installmentCount: 3 as const,
  };
  const oddStages = buildInstallmentSchedule(oddContract);
  const oddSum = Math.round(oddStages.reduce((s, st) => s + st.subtotal, 0) * 100) / 100;
  assert.equal(oddSum, 100.01);

  const sanitizedThree = sanitizeContractPayload({ ...withExtras, installmentCount: 3 }, 'user-1');
  assert.equal(sanitizedThree.installmentCount, 3);
});

test('insurance policy catalog normalization, label formatting, and payload sanitization work accurately', () => {
  const defaults = normalizeInsurancePolicies(undefined);
  assert.equal(defaults.length, DEFAULT_INSURANCE_POLICIES.length);
  assert.equal(defaults[0].policyNumber, '14095000359200');

  const custom = normalizeInsurancePolicies([
    { id: 'p1', insurer: 'Allianz', policyNumber: '  ALZ-9901 ', name: 'Allianz Buceo' },
    { id: 'p2', insurer: 'AXA', policyNumber: '   ', name: 'Invalid empty policy' },
  ]);
  assert.equal(custom.length, 1);
  assert.equal(custom[0].insurer, 'Allianz');
  assert.equal(custom[0].policyNumber, 'ALZ-9901');

  const baseLabel =
    'Seguro Básico de Asistencia en Viaje VIP con la aseguradora AXA y número de Póliza 14095000359200 y Nº de Certificado 000.';
  assert.equal(extractDefaultPolicyFromLabel(baseLabel), '14095000359200');

  const formatted = formatInsuranceLabelWithPolicyAndCert(
    baseLabel,
    'Intermundial',
    'IM-BUCEO-2026',
    'CERT-2026-889'
  );
  assert.match(formatted, /aseguradora Intermundial/);
  assert.match(formatted, /número de Póliza IM-BUCEO-2026/);
  assert.match(formatted, /Nº de Certificado CERT-2026-889/);

  const sanitizedAgency = sanitizeAgencyProfilePayload(
    { ...mockAgency, insurancePolicies: custom },
    'user-1'
  );
  assert.equal(sanitizedAgency.insurancePolicies.length, 1);
  assert.equal(sanitizedAgency.insurancePolicies[0].policyNumber, 'ALZ-9901');

  const contract = createContractFromTemplate({
    id: 'ctr-ins',
    ownerId: 'user-1',
    template: { ...mockTemplate, insuranceBasicLabel: baseLabel },
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-061',
  });
  assert.equal(contract.insurancePolicyNumber, '14095000359200');
  assert.equal(contract.insuranceCertificateNumber, '');

  const sanitizedContract = sanitizeContractPayload(
    {
      ...contract,
      insuranceBasicSelected: true,
      insurancePolicyNumber: '  IM-BUCEO-2026  ',
      insuranceCertificateNumber: '  CERT-2026-889  ',
    },
    'user-1'
  );
  assert.equal(sanitizedContract.insurancePolicyNumber, 'IM-BUCEO-2026');
  assert.equal(sanitizedContract.insuranceCertificateNumber, 'CERT-2026-889');
});

test('signature request IDs, signing envelope encode/decode, URL parsing, and signature sanitization work cleanly', async () => {
  const ids = generateSignatureRequestIds();
  assert.ok(ids.requestId.startsWith('sig_'));
  assert.ok(ids.requestId.length >= 20);
  assert.ok(ids.accessToken.length >= 20);

  const contract = createContractFromTemplate({
    id: 'ctr-sig-1',
    ownerId: 'user-1',
    template: mockTemplate,
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-077',
  });

  const encoded = await encodeSigningEnvelope({ contract, agency: mockAgency });
  assert.ok(encoded.startsWith('z.') || encoded.startsWith('u.'));

  const decoded = await decodeSigningEnvelope(encoded);
  assert.ok(decoded);
  assert.equal(decoded?.contract.contractNumber, 'C-2026-077');
  assert.equal(decoded?.contract.clientFullName, 'CARLOS MENDOZA RUIZ');
  assert.equal(decoded?.agency.commercialName, 'VIAJES MAR DE HIELO');

  const url = buildClientSignatureUrl({
    baseOrigin: 'https://contratos.ofertasviajesbuceo.com/',
    basePath: '/app',
    requestId: ids.requestId,
    envelope: encoded,
  });
  const parsedUrl = new URL(url);
  assert.equal(parsedUrl.pathname, '/app');

  const parsedParams = parseClientSignatureParams(parsedUrl.search);
  assert.ok(parsedParams);
  assert.equal(parsedParams?.requestId, ids.requestId);
  assert.equal(parsedParams?.envelope, encoded);
  assert.equal(parseClientSignatureParams('?foo=bar'), null);

  const sanitizedWithSig = sanitizeContractPayload(
    {
      ...contract,
      clientSignatureDataUrl: 'data:image/png;base64,' + 'A'.repeat(70000),
      clientSignerName: '  CARLOS MENDOZA RUIZ  ',
      clientSignedAt: '  24/11/2026 15:00  ',
      signatureRequestId: `  ${ids.requestId}  `,
      agencyCopySentAt: '  24/11/2026 15:01  ',
      agencyCopyEmail: '  Info@ofertasviajesbuceo.com  ',
    },
    'user-1'
  );
  assert.equal(sanitizedWithSig.clientSignatureDataUrl.length, 60000);
  assert.equal(sanitizedWithSig.clientSignerName, 'CARLOS MENDOZA RUIZ');
  assert.equal(sanitizedWithSig.clientSignedAt, '24/11/2026 15:00');
  assert.equal(sanitizedWithSig.signatureRequestId, ids.requestId);
  assert.equal(sanitizedWithSig.agencyCopySentAt, '24/11/2026 15:01');
  assert.equal(sanitizedWithSig.agencyCopyEmail, 'Info@ofertasviajesbuceo.com');
});

test('buildInstallmentSchedule supports 4, 5, and 6 plazos and separate flight payment modes (1st payment vs prorated)', () => {
  const baseContract = createContractFromTemplate({
    id: 'ctr-flights-6',
    ownerId: 'user-1',
    template: mockTemplate,
    client: mockClient,
    agency: mockAgency,
    contractNumber: 'C-2026-090',
    travelerRole: 'diver',
  });

  // Switch to Opción 2 with 360 € flights + basic & cancellation insurance (25 + 10)
  // Trip package = 699.50; Flights = 360.00; Insurances = 35.00; Total = 1094.50
  const withFlightsFirst = syncContractFinancialLines({
    ...baseContract,
    transportIncluded: false,
    flightDetails: 'Ida 04/12 BCN-RMU 09:00 · Vuelta 08/12 RMU-BCN 19:30',
    flightPrice: 360,
    flightPaymentMode: 'first_installment',
    insuranceBasicSelected: true,
    insuranceCancellationSelected: true,
    installmentCount: 6,
  });

  assert.equal(withFlightsFirst.totalAmount, 1094.5);
  const flightConcept = withFlightsFirst.conceptLines.find((c) => c.id === 'flights');
  assert.ok(flightConcept);
  assert.equal(flightConcept?.amount, 360);

  // 6 plazos + flights in 1st payment:
  // 699.50 / 6 -> 116.59, 116.59, 116.58, 116.58, 116.58, 116.58
  // Plazo 1 = 116.59 + 360 + 35 = 511.59
  const stagesFirst = buildInstallmentSchedule(withFlightsFirst);
  assert.equal(stagesFirst.length, 6);
  assert.equal(stagesFirst[0].subtotal, 511.59);
  assert.equal(stagesFirst[1].dueLabel, '4 de febrero de 2026 (10 meses antes)');
  assert.equal(stagesFirst[2].dueLabel, '4 de abril de 2026 (8 meses antes)');
  assert.equal(stagesFirst[3].dueLabel, '4 de junio de 2026 (6 meses antes)');
  assert.equal(stagesFirst[4].dueLabel, '4 de agosto de 2026 (4 meses antes)');
  assert.equal(stagesFirst[5].dueLabel, '4 de octubre de 2026 (2 meses antes)');
  assert.equal(stagesFirst[1].subtotal, 116.59);
  assert.equal(stagesFirst[5].subtotal, 116.58);
  const sumFirst = Math.round(stagesFirst.reduce((s, st) => s + st.subtotal, 0) * 100) / 100;
  assert.equal(sumFirst, 1094.5);

  // 6 plazos + prorated flights (360 / 6 = 60 per stage):
  // Plazo 1 = 116.59 + 60 + 35 = 211.59; Plazo 2 = 176.59; Plazos 3..6 = 176.58
  const withFlightsProrated = syncContractFinancialLines({
    ...withFlightsFirst,
    flightPaymentMode: 'prorated',
  });
  const stagesProrated = buildInstallmentSchedule(withFlightsProrated);
  assert.equal(stagesProrated.length, 6);
  assert.equal(stagesProrated[0].subtotal, 211.59);
  assert.equal(stagesProrated[1].subtotal, 176.59);
  assert.equal(stagesProrated[5].subtotal, 176.58);
  assert.equal(
    stagesProrated[3].lines.find((l) => l.id === 'inst-p4-flights')?.amount,
    60
  );
  const sumProrated = Math.round(stagesProrated.reduce((s, st) => s + st.subtotal, 0) * 100) / 100;
  assert.equal(sumProrated, 1094.5);

  // 4 & 5 plazos check
  const stagesFour = buildInstallmentSchedule({ ...withFlightsFirst, installmentCount: 4 });
  assert.equal(stagesFour.length, 4);
  assert.equal(stagesFour[1].dueLabel, '4 de junio de 2026 (6 meses antes)');
  const stagesFive = buildInstallmentSchedule({ ...withFlightsFirst, installmentCount: 5 });
  assert.equal(stagesFive.length, 5);
  assert.equal(stagesFive[1].dueLabel, '4 de abril de 2026 (8 meses antes)');

  // Switching back to Opción 1 (transportIncluded: true) zeroes flightPrice & removes 'flights' line
  const backToIncluded = syncContractFinancialLines({
    ...withFlightsProrated,
    transportIncluded: true,
  });
  assert.equal(backToIncluded.flightPrice, 0);
  assert.equal(backToIncluded.conceptLines.some((c) => c.id === 'flights'), false);
  assert.equal(backToIncluded.totalAmount, 734.5);

  // Sanitization enforces blueprint limits and preserves 6 plazos + flight fields
  const sanitized = sanitizeContractPayload(
    {
      ...withFlightsProrated,
      flightDetails: 'V'.repeat(900),
    },
    'user-1'
  );
  assert.equal(sanitized.installmentCount, 6);
  assert.equal(sanitized.flightDetails.length, 600);
  assert.equal(sanitized.flightPrice, 360);
  assert.equal(sanitized.flightPaymentMode, 'prorated');
  assert.ok(sanitized.installmentLines.length > 10);
});

test('formatFirestoreErrorForUser surfaces operation context and unverified email guidance', () => {
  const unverifiedJson = JSON.stringify({
    error: 'Missing or insufficient permissions.',
    operationType: 'create',
    path: 'contracts/ctr-123',
    authInfo: { emailVerified: false },
  });
  const unverifiedMsg = formatFirestoreErrorForUser(new Error(unverifiedJson));
  assert.match(unverifiedMsg, /no tiene el correo verificado/i);

  const verifiedPermJson = JSON.stringify({
    error: 'Missing or insufficient permissions.',
    operationType: 'write',
    path: 'signatureRequests/sig_abc1234567890123456789',
    authInfo: { emailVerified: true },
  });
  const permMsg = formatFirestoreErrorForUser(new Error(verifiedPermJson));
  assert.match(permMsg, /permisos o validación/i);
  assert.match(permMsg, /operación write en signatureRequests/i);
});


