import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  PenTool,
  X,
} from 'lucide-react';
import type { AgencyProfile, TravelContract } from '../types/contract';
import { formatEuro } from '../utils/contractLogic';

interface SendForSignatureModalProps {
  open: boolean;
  contract: TravelContract;
  agency: AgencyProfile;
  clientEmail?: string;
  clientPhone?: string;
  signingUrl: string;
  productionUrl?: string | null;
  preparing: boolean;
  error?: string | null;
  onClose: () => void;
  onOpenClientView: (url: string) => void;
}

export const SendForSignatureModal: React.FC<SendForSignatureModalProps> = ({
  open,
  contract,
  agency,
  clientEmail = '',
  clientPhone = '',
  signingUrl,
  productionUrl,
  preparing,
  error,
  onClose,
  onOpenClientView,
}) => {
  const [copiedKey, setCopiedKey] = useState<'active' | 'prod' | null>(null);

  if (!open) return null;

  const shareUrl = productionUrl || signingUrl;
  const isSigned = Boolean(contract.clientSignatureDataUrl);

  const handleCopy = async (key: 'active' | 'prod', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const messageText = `Hola ${contract.clientFullName},\n\nTe enviamos el contrato de viaje ${contract.contractNumber} (${contract.tripTitle}) de ${agency.commercialName} para que puedas revisarlo en formato PDF y firmarlo en las páginas 3, 4, 6 y 7 desde este enlace:\n${shareUrl}`;

  const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
  const whatsappPhone = cleanPhone.length === 9 ? `34${cleanPhone}` : cleanPhone;
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const mailSubject = `Contrato de viaje ${contract.contractNumber} — Firma del contratante (${agency.commercialName})`;
  const mailtoHref = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(
    mailSubject
  )}&body=${encodeURIComponent(messageText)}`;

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-sign-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <PenTool className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="send-sign-title" className="text-base font-semibold text-slate-900">
                Enviar contrato a la firma
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {contract.contractNumber} · {contract.clientFullName} ({formatEuro(contract.totalAmount)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de envío a la firma"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {isSigned ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-emerald-900">
                <p className="font-semibold">Este contrato ya ha sido firmado por el cliente</p>
                <p className="mt-0.5">
                  Firmante: {contract.clientSignerName || contract.clientFullName}
                  {contract.clientSignedAt ? ` · ${contract.clientSignedAt}` : ''}
                </p>
                {contract.agencyCopySentAt ? (
                  <p className="mt-1 text-emerald-800 font-medium">
                    Copia enviada a {contract.agencyCopyEmail || agency.email} · {contract.agencyCopySentAt}
                  </p>
                ) : (
                  <p className="mt-1 text-emerald-800">
                    Destino configurado para copia a la agencia: <strong>{agency.email}</strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-slate-700 leading-relaxed">
              Al abrir el enlace, el cliente podrá leer todo el contrato en formato A4, descargar o
              imprimir el PDF y firmar en las zonas de <strong>CONTRATANTE PRINCIPAL</strong> de las{' '}
              <strong>páginas 3, 4, 6 y 7</strong>. Al confirmar su firma, se tramitará una copia del
              contrato firmado para el email de la agencia (<strong>{agency.email}</strong>).
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="signing-link-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Enlace directo de firma para el cliente
            </label>
            <div className="flex items-center gap-2">
              <input
                id="signing-link-input"
                type="text"
                readOnly
                value={preparing ? 'Generando enlace de firma...' : signingUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                type="button"
                disabled={preparing || !signingUrl}
                onClick={() => handleCopy('active', signingUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
              >
                {copiedKey === 'active' ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copiar enlace
                  </>
                )}
              </button>
            </div>
          </div>

          {productionUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Enlace con tu dominio público ({agency.publicDomain})
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('prod', productionUrl)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'prod' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copiar enlace público
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                readOnly
                aria-label="Enlace público de firma"
                value={productionUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-white border border-slate-200 rounded-md text-slate-600"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Enviar WhatsApp
            </a>
            <a
              href={mailtoHref}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              Enviar Email
            </a>
            <button
              type="button"
              disabled={preparing || !signingUrl}
              onClick={() => onOpenClientView(signingUrl)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Abrir portal cliente
            </button>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
