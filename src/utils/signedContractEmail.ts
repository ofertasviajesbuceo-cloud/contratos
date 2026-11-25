export interface SignedContractEmailPayload {
  requestId: string;
  agencyEmail: string;
  agencyName: string;
  contractNumber: string;
  tripTitle: string;
  startDateText: string;
  endDateText: string;
  clientFullName: string;
  clientDni: string;
  clientLocality: string;
  clientSignerName: string;
  clientSignedAt: string;
  totalAmountFormatted: string;
  installmentSummary: string;
  insuranceSummary: string;
  contractUrl: string;
  clientSignatureDataUrl: string;
  pdfBase64: string;
}

const MAX_STR = {
  requestId: 128,
  email: 120,
  agencyName: 120,
  contractNumber: 40,
  tripTitle: 160,
  dateText: 60,
  name: 150,
  dni: 32,
  locality: 150,
  signedAt: 80,
  amount: 40,
  summary: 800,
  url: 8000,
  signatureDataUrl: 60000,
  pdfBase64: 12000000,
} as const;

export function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeEmailAddress(email: string): boolean {
  const clean = String(email ?? '').trim();
  if (!clean || clean.length > MAX_STR.email) return false;
  if (/[\r\n]/.test(clean)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function isSafeHttpUrl(url: string): boolean {
  const clean = String(url ?? '').trim();
  if (!clean || clean.length > MAX_STR.url) return false;
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafePngDataUrl(dataUrl: string): boolean {
  const clean = String(dataUrl ?? '').trim();
  if (!clean || clean.length > MAX_STR.signatureDataUrl) return false;
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(clean);
}

export function isSafePdfBase64(b64: string): boolean {
  const clean = String(b64 ?? '').trim();
  if (!clean) return true;
  if (clean.length > MAX_STR.pdfBase64) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(clean)) return false;
  // "%PDF-" base64 prefix is "JVBERi"
  return clean.startsWith('JVBERi');
}

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\r\n\0]+/g, ' ').trim().slice(0, maxLen);
}

export function validateSignedContractEmailPayload(
  raw: unknown
): { ok: true; data: SignedContractEmailPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Cuerpo de solicitud inválido.' };
  }
  const src = raw as Record<string, unknown>;

  const agencyEmail = cleanStr(src.agencyEmail, MAX_STR.email);
  if (!isSafeEmailAddress(agencyEmail)) {
    return { ok: false, error: 'El correo electrónico de la agencia no es válido.' };
  }

  const contractNumber = cleanStr(src.contractNumber, MAX_STR.contractNumber);
  if (!contractNumber || !/^[A-Za-z0-9-]+$/.test(contractNumber)) {
    return { ok: false, error: 'El número de contrato no es válido.' };
  }

  const clientSignerName = cleanStr(src.clientSignerName, MAX_STR.name);
  if (clientSignerName.length < 2) {
    return { ok: false, error: 'Falta el nombre del firmante.' };
  }

  const clientSignedAt = cleanStr(src.clientSignedAt, MAX_STR.signedAt);
  if (clientSignedAt.length < 4) {
    return { ok: false, error: 'Falta la fecha/hora de firma.' };
  }

  const clientSignatureDataUrl =
    typeof src.clientSignatureDataUrl === 'string' ? src.clientSignatureDataUrl.trim() : '';
  if (!isSafePngDataUrl(clientSignatureDataUrl)) {
    return { ok: false, error: 'La firma en formato PNG no es válida.' };
  }

  const pdfBase64 = typeof src.pdfBase64 === 'string' ? src.pdfBase64.trim() : '';
  if (!isSafePdfBase64(pdfBase64)) {
    return { ok: false, error: 'El archivo PDF adjunto no es válido.' };
  }

  const rawUrl = typeof src.contractUrl === 'string' ? src.contractUrl.trim() : '';
  const contractUrl = rawUrl && isSafeHttpUrl(rawUrl) ? rawUrl : '';

  return {
    ok: true,
    data: {
      requestId: cleanStr(src.requestId, MAX_STR.requestId),
      agencyEmail,
      agencyName: cleanStr(src.agencyName, MAX_STR.agencyName) || 'VIAJES MAR DE HIELO',
      contractNumber,
      tripTitle: cleanStr(src.tripTitle, MAX_STR.tripTitle) || 'Viaje combinado',
      startDateText: cleanStr(src.startDateText, MAX_STR.dateText),
      endDateText: cleanStr(src.endDateText, MAX_STR.dateText),
      clientFullName: cleanStr(src.clientFullName, MAX_STR.name) || clientSignerName,
      clientDni: cleanStr(src.clientDni, MAX_STR.dni),
      clientLocality: cleanStr(src.clientLocality, MAX_STR.locality),
      clientSignerName,
      clientSignedAt,
      totalAmountFormatted: cleanStr(src.totalAmountFormatted, MAX_STR.amount),
      installmentSummary: cleanStr(src.installmentSummary, MAX_STR.summary),
      insuranceSummary: cleanStr(src.insuranceSummary, MAX_STR.summary),
      contractUrl,
      clientSignatureDataUrl,
      pdfBase64,
    },
  };
}

export function buildSignedContractEmailContent(
  payload: SignedContractEmailPayload,
  options?: { inlineSignatureCid?: string }
): {
  subject: string;
  textBody: string;
  htmlBody: string;
  pdfFileName: string;
} {
  const safeFileNum = payload.contractNumber.replace(/[^A-Za-z0-9-]+/g, '_');
  const pdfFileName = `Contrato_${safeFileNum}_firmado.pdf`;
  const subject = `Copia de contrato firmado ${payload.contractNumber} — ${payload.clientFullName}`;

  const textLines = [
    `COPIA DE CONTRATO DE VIAJE FIRMADO — ${payload.agencyName}`,
    '',
    `Nº de contrato: ${payload.contractNumber}`,
    `Viaje: ${payload.tripTitle}`,
    payload.startDateText || payload.endDateText
      ? `Fechas: ${payload.startDateText} al ${payload.endDateText}`
      : '',
    `Contratante principal: ${payload.clientFullName}${payload.clientDni ? ` (DNI/NIE: ${payload.clientDni})` : ''}`,
    payload.clientLocality ? `Localidad: ${payload.clientLocality}` : '',
    `Importe total: ${payload.totalAmountFormatted}`,
    payload.installmentSummary ? `Plazos de pago: ${payload.installmentSummary}` : '',
    payload.insuranceSummary ? `Seguro: ${payload.insuranceSummary}` : '',
    '',
    `Firmado electrónicamente por: ${payload.clientSignerName}`,
    `Fecha y hora de firma: ${payload.clientSignedAt}`,
    'Páginas firmadas: 3, 4, 6 y 7.',
    payload.pdfBase64 ? `Se adjunta el documento completo en PDF (${pdfFileName}).` : '',
    payload.contractUrl ? `Enlace directo al contrato firmado:\n${payload.contractUrl}` : '',
  ].filter(Boolean);

  const sigImgHtml = options?.inlineSignatureCid
    ? `<img src="cid:${escapeHtml(options.inlineSignatureCid)}" alt="Firma del contratante" style="max-width:220px;max-height:80px;display:block;border:1px solid #e2e8f0;border-radius:6px;padding:6px;background:#ffffff;" />`
    : '';

  const htmlBody = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#1e3a8a;color:#ffffff;padding:20px 24px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;opacity:0.85;">${escapeHtml(payload.agencyName)}</p>
      <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;">Contrato firmado por el cliente: ${escapeHtml(payload.contractNumber)}</h1>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.55;">
      <p style="margin:0 0 16px;">El contratante principal ha completado la firma del contrato en las <strong>páginas 3, 4, 6 y 7</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:13px;">
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;width:38%;">Nº Contrato</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${escapeHtml(payload.contractNumber)}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Viaje</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.tripTitle)}</td>
        </tr>
        ${
          payload.startDateText || payload.endDateText
            ? `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Fechas</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.startDateText)} — ${escapeHtml(payload.endDateText)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Contratante Principal</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.clientFullName)}${payload.clientDni ? ` (${escapeHtml(payload.clientDni)})` : ''}</td>
        </tr>
        ${
          payload.clientLocality
            ? `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Localidad</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.clientLocality)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Total del contrato</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${escapeHtml(payload.totalAmountFormatted)}</td>
        </tr>
        ${
          payload.installmentSummary
            ? `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Forma de pago</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.installmentSummary)}</td>
        </tr>`
            : ''
        }
        ${
          payload.insuranceSummary
            ? `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Seguro</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.insuranceSummary)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Firmado por</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.clientSignerName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#475569;">Fecha y hora</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(payload.clientSignedAt)}</td>
        </tr>
      </table>
      ${
        sigImgHtml
          ? `<div style="margin-bottom:18px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#475569;">Firma capturada (estampada en páginas 3, 4, 6 y 7):</p>
        ${sigImgHtml}
      </div>`
          : ''
      }
      ${
        payload.pdfBase64
          ? `<p style="margin:0 0 16px;padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;font-size:13px;">Se adjunta en este correo la copia completa en PDF del contrato firmado (<strong>${escapeHtml(pdfFileName)}</strong>).</p>`
          : ''
      }
      ${
        payload.contractUrl
          ? `<p style="margin:0;">
        <a href="${escapeHtml(payload.contractUrl)}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">Ver contrato firmado online</a>
      </p>`
          : ''
      }
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    textBody: textLines.join('\n'),
    htmlBody,
    pdfFileName,
  };
}

export function buildAgencyMailtoFallbackUrl(payload: SignedContractEmailPayload): string {
  const { subject, textBody } = buildSignedContractEmailContent(payload);
  // Keep mailto body concise if URL is huge so OS mail clients handle it safely
  const safeBody = textBody.slice(0, 1800);
  return `mailto:${encodeURIComponent(payload.agencyEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(safeBody)}`;
}
