import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgencyMailtoFallbackUrl,
  buildSignedContractEmailContent,
  escapeHtml,
  isSafeEmailAddress,
  isSafeHttpUrl,
  isSafePdfBase64,
  isSafePngDataUrl,
  validateSignedContractEmailPayload,
} from './signedContractEmail';

const validSigPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const validPdfB64 = Buffer.from('%PDF-1.4\n%fake-pdf-body\n%%EOF', 'utf8').toString('base64');

const validPayloadInput = {
  requestId: 'sig_abcdefghijklmnopqrstuv',
  agencyEmail: 'Info@ofertasviajesbuceo.com',
  agencyName: 'VIAJES MAR DE HIELO',
  contractNumber: 'C-2026-088',
  tripTitle: 'LA AZOHIA - Murcia',
  startDateText: '4 de diciembre de 2026',
  endDateText: '8 de diciembre de 2026',
  clientFullName: 'CARLOS MENDOZA RUIZ',
  clientDni: '44556677K',
  clientLocality: 'BARCELONA',
  clientSignerName: 'CARLOS MENDOZA RUIZ',
  clientSignedAt: '24/11/2026, 15:30',
  totalAmountFormatted: '864,50 €',
  installmentSummary: 'Plazo 1: 449,75 € · Plazo 2: 414,75 €',
  insuranceSummary: 'Seguro Básico VIP · Póliza 14095000359200',
  contractUrl: 'https://contratos.ofertasviajesbuceo.com/?sign=sig_abcdefghijklmnopqrstuv',
  clientSignatureDataUrl: validSigPng,
  pdfBase64: validPdfB64,
};

test('email and attachment security validators reject malformed inputs and accept safe payloads', () => {
  assert.equal(isSafeEmailAddress('Info@ofertasviajesbuceo.com'), true);
  assert.equal(isSafeEmailAddress('bad\r\nBcc:evil@x.com'), false);
  assert.equal(isSafeEmailAddress('not-an-email'), false);

  assert.equal(isSafeHttpUrl('https://contratos.ofertasviajesbuceo.com/?sign=abc'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);

  assert.equal(isSafePngDataUrl(validSigPng), true);
  assert.equal(isSafePngDataUrl('data:image/svg+xml;base64,PHN2Zz4='), false);

  assert.equal(isSafePdfBase64(validPdfB64), true);
  assert.equal(isSafePdfBase64(''), true);
  assert.equal(isSafePdfBase64('Tm90QVBERg=='), false); // "NotAPDF"
});

test('validateSignedContractEmailPayload validates required fields and rejects bad payloads', () => {
  const okRes = validateSignedContractEmailPayload(validPayloadInput);
  assert.equal(okRes.ok, true);
  if (okRes.ok) {
    assert.equal(okRes.data.agencyEmail, 'Info@ofertasviajesbuceo.com');
    assert.equal(okRes.data.contractNumber, 'C-2026-088');
    assert.equal(okRes.data.pdfBase64, validPdfB64);
  }

  const badEmail = validateSignedContractEmailPayload({
    ...validPayloadInput,
    agencyEmail: 'invalido',
  });
  assert.equal(badEmail.ok, false);

  const badContract = validateSignedContractEmailPayload({
    ...validPayloadInput,
    contractNumber: 'C 2026/088!',
  });
  assert.equal(badContract.ok, false);

  const badPdf = validateSignedContractEmailPayload({
    ...validPayloadInput,
    pdfBase64: 'SGVsbG8=',
  });
  assert.equal(badPdf.ok, false);

  const badSig = validateSignedContractEmailPayload({
    ...validPayloadInput,
    clientSignatureDataUrl: 'https://evil.example/sig.png',
  });
  assert.equal(badSig.ok, false);
});

test('buildSignedContractEmailContent escapes HTML and builds mailto fallback safely', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');

  const validated = validateSignedContractEmailPayload({
    ...validPayloadInput,
    clientFullName: 'CARLOS <script>alert(1)</script>',
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  const content = buildSignedContractEmailContent(validated.data, {
    inlineSignatureCid: 'client-signature',
  });
  assert.equal(content.pdfFileName, 'Contrato_C-2026-088_firmado.pdf');
  assert.match(content.subject, /C-2026-088/);
  assert.match(content.textBody, /Páginas firmadas: 3, 4, 6 y 7/);
  assert.match(content.htmlBody, /cid:client-signature/);
  assert.doesNotMatch(content.htmlBody, /<script>alert\(1\)<\/script>/);
  assert.match(content.htmlBody, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

  const mailtoUrl = buildAgencyMailtoFallbackUrl(validated.data);
  assert.ok(mailtoUrl.startsWith('mailto:Info%40ofertasviajesbuceo.com?subject='));
});
