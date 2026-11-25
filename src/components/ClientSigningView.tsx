import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  PenTool,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DEFAULT_AGENCY_PROFILE } from '../data/seedData';
import type { AgencyProfile, TravelContract } from '../types/contract';
import {
  buildInstallmentSchedule,
  decodeSigningEnvelope,
  formatEuro,
  normalizeAgencyProfile,
  normalizeContract,
} from '../utils/contractLogic';
import {
  generateContractPdf,
  triggerPdfDownload,
} from '../utils/contractPdf';
import {
  buildAgencyMailtoFallbackUrl,
  type SignedContractEmailPayload,
} from '../utils/signedContractEmail';
import {
  getSignatureRequestRemote,
  markSignatureRequestEmailSentRemote,
  submitClientSignatureRemote,
} from '../services/firestoreStore';
import { DiverTriangleLogo } from './AgencyBrandMarks';
import { ContractDocumentPreview } from './ContractDocumentPreview';
import { SignaturePadCanvas } from './SignaturePadCanvas';

const LS_CONTRACTS_KEY = 'mdh_contracts_v1';
const LS_SIG_REQUESTS_KEY = 'mdh_signature_requests_v1';

interface ClientSigningViewProps {
  requestId: string;
  envelope: string;
}

type EmailDeliveryState = 'idle' | 'sending' | 'sent' | 'manual_required';

function buildSignedContractEmailSummary(
  contract: TravelContract,
  agency: AgencyProfile,
  signatureDataUrl: string,
  signerName: string,
  signedAt: string,
  pdfBase64 = ''
): SignedContractEmailPayload {
  const stages = buildInstallmentSchedule(contract);
  const installmentSummary =
    stages.length > 0
      ? stages.map((st) => `${st.title}: ${formatEuro(st.subtotal)}`).join(' · ')
      : formatEuro(contract.totalAmount);

  const insuranceParts: string[] = [];
  if (contract.insuranceBasicSelected) {
    insuranceParts.push(`Asistencia (${contract.insuranceBasicLabel})`);
  }
  if (contract.insuranceCancellationSelected) {
    insuranceParts.push('Cobertura anulación');
  }
  if (contract.insurancePolicyNumber) {
    insuranceParts.push(`Póliza ${contract.insurancePolicyNumber}`);
  }
  if (contract.insuranceCertificateNumber) {
    insuranceParts.push(`Certificado ${contract.insuranceCertificateNumber}`);
  }

  return {
    requestId: contract.signatureRequestId || '',
    agencyEmail: agency.email || DEFAULT_AGENCY_PROFILE.email,
    agencyName: agency.commercialName || DEFAULT_AGENCY_PROFILE.commercialName,
    contractNumber: contract.contractNumber,
    tripTitle: contract.tripTitle,
    startDateText: contract.startDateText,
    endDateText: contract.endDateText,
    clientFullName: contract.clientFullName,
    clientDni: contract.clientDni,
    clientLocality: contract.clientLocality,
    clientSignerName: signerName,
    clientSignedAt: signedAt,
    totalAmountFormatted: formatEuro(contract.totalAmount),
    installmentSummary,
    insuranceSummary: insuranceParts.join(' · ') || 'Sin seguro contratado',
    contractUrl: typeof window !== 'undefined' ? window.location.href : '',
    clientSignatureDataUrl: signatureDataUrl,
    pdfBase64,
  };
}

export const ClientSigningView: React.FC<ClientSigningViewProps> = ({
  requestId,
  envelope,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<TravelContract | null>(null);
  const [agency, setAgency] = useState<AgencyProfile>(DEFAULT_AGENCY_PROFILE);
  const [isRemoteRequest, setIsRemoteRequest] = useState(false);

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [activeSignPage, setActiveSignPage] = useState<3 | 4 | 6 | 7>(3);
  const [signerName, setSignerName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSignedBanner, setJustSignedBanner] = useState(false);
  const [emailDeliveryState, setEmailDeliveryState] = useState<EmailDeliveryState>('idle');
  const [signedPdfFile, setSignedPdfFile] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setLoadError(null);

      let resolvedContract: TravelContract | null = null;
      let resolvedAgency: AgencyProfile = normalizeAgencyProfile(DEFAULT_AGENCY_PROFILE);
      let remoteFound = false;

      if (requestId && requestId.startsWith('sig_') && requestId.length >= 20) {
        try {
          const remote = await getSignatureRequestRemote(requestId);
          if (remote && remote.contractData) {
            remoteFound = true;
            const cData = normalizeContract(remote.contractData as Partial<TravelContract>);
            resolvedContract = {
              ...cData,
              id: String(remote.contractId || cData.id),
              status: remote.status === 'signed' ? 'signed' : cData.status,
              clientSignatureDataUrl: String(
                remote.clientSignatureDataUrl || cData.clientSignatureDataUrl || ''
              ),
              clientSignerName: String(
                remote.clientSignerName || cData.clientSignerName || ''
              ),
              clientSignedAt: String(remote.clientSignedAt || cData.clientSignedAt || ''),
              signatureRequestId: requestId,
              agencyCopySentAt: String(remote.agencyCopySentAt || cData.agencyCopySentAt || ''),
              agencyCopyEmail: String(remote.agencyCopyEmail || cData.agencyCopyEmail || ''),
            };
            if (remote.agencyData) {
              resolvedAgency = normalizeAgencyProfile(
                remote.agencyData as Partial<AgencyProfile>
              );
            }
          }
        } catch {
          // Fall back cleanly to URL envelope or local storage if offline
        }
      }

      if (!resolvedContract && envelope) {
        const decoded = await decodeSigningEnvelope(envelope);
        if (decoded) {
          resolvedContract = decoded.contract;
          resolvedAgency = decoded.agency;
        }
      }

      // Merge any local signed state saved in the same browser
      if (resolvedContract) {
        try {
          const rawLocal = window.localStorage.getItem(LS_CONTRACTS_KEY);
          if (rawLocal) {
            const list = JSON.parse(rawLocal) as Partial<TravelContract>[];
            const match = list.find(
              (item) =>
                item.id === resolvedContract?.id ||
                (requestId && item.signatureRequestId === requestId)
            );
            if (match && match.clientSignatureDataUrl) {
              resolvedContract = {
                ...resolvedContract,
                status: 'signed',
                clientSignatureDataUrl: match.clientSignatureDataUrl,
                clientSignerName: match.clientSignerName || resolvedContract.clientSignerName,
                clientSignedAt: match.clientSignedAt || resolvedContract.clientSignedAt,
                agencyCopySentAt: match.agencyCopySentAt || resolvedContract.agencyCopySentAt || '',
                agencyCopyEmail: match.agencyCopyEmail || resolvedContract.agencyCopyEmail || '',
              };
            }
          }
          const rawLocalReq = window.localStorage.getItem(LS_SIG_REQUESTS_KEY);
          if (rawLocalReq && requestId) {
            const reqMap = JSON.parse(rawLocalReq) as Record<
              string,
              {
                clientSignatureDataUrl?: string;
                clientSignerName?: string;
                clientSignedAt?: string;
                agencyCopySentAt?: string;
                agencyCopyEmail?: string;
              }
            >;
            const localSig = reqMap[requestId];
            if (localSig?.clientSignatureDataUrl && !resolvedContract.clientSignatureDataUrl) {
              resolvedContract = {
                ...resolvedContract,
                status: 'signed',
                clientSignatureDataUrl: localSig.clientSignatureDataUrl,
                clientSignerName: localSig.clientSignerName || '',
                clientSignedAt: localSig.clientSignedAt || '',
                agencyCopySentAt: localSig.agencyCopySentAt || '',
                agencyCopyEmail: localSig.agencyCopyEmail || '',
              };
            }
          }
        } catch {
          // Ignore storage read errors
        }
      }

      if (!cancelled) {
        if (!resolvedContract) {
          setLoadError(
            'El enlace de firma no es válido o ha caducado. Solicita un nuevo enlace a la agencia.'
          );
        } else {
          setContract(resolvedContract);
          setAgency(resolvedAgency);
          setIsRemoteRequest(remoteFound);
          setSignerName(
            resolvedContract.clientSignerName || resolvedContract.clientFullName || ''
          );
          if (resolvedContract.agencyCopySentAt) {
            setEmailDeliveryState('sent');
          }
        }
        setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [requestId, envelope]);

  useEffect(() => {
    const container = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!container || !content || !contract) return;

    const A4_PX_WIDTH = 794;
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
  }, [contract]);

  const scrollToContractPage = (pageNum: 3 | 4 | 6 | 7) => {
    const target = document.querySelector<HTMLElement>(`article[data-contract-page="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleOpenSignModal = (pageNum: 3 | 4 | 6 | 7 = 3) => {
    setActiveSignPage(pageNum);
    setSubmitError(null);
    setSignModalOpen(true);
  };

  const persistLocalContractFields = (updatedContract: TravelContract) => {
    try {
      const rawLocal = window.localStorage.getItem(LS_CONTRACTS_KEY);
      if (rawLocal) {
        const list = JSON.parse(rawLocal) as TravelContract[];
        const updatedList = list.map((item) =>
          item.id === updatedContract.id ||
          (requestId && item.signatureRequestId === requestId)
            ? {
                ...item,
                status: 'signed' as const,
                clientSignatureDataUrl: updatedContract.clientSignatureDataUrl,
                clientSignerName: updatedContract.clientSignerName,
                clientSignedAt: updatedContract.clientSignedAt,
                agencyCopySentAt: updatedContract.agencyCopySentAt || item.agencyCopySentAt || '',
                agencyCopyEmail: updatedContract.agencyCopyEmail || item.agencyCopyEmail || '',
              }
            : item
        );
        window.localStorage.setItem(LS_CONTRACTS_KEY, JSON.stringify(updatedList));
      }

      const rawReqMap = window.localStorage.getItem(LS_SIG_REQUESTS_KEY);
      const reqMap = rawReqMap ? (JSON.parse(rawReqMap) as Record<string, unknown>) : {};
      if (requestId) {
        reqMap[requestId] = {
          contractId: updatedContract.id,
          status: 'signed',
          clientSignatureDataUrl: updatedContract.clientSignatureDataUrl,
          clientSignerName: updatedContract.clientSignerName,
          clientSignedAt: updatedContract.clientSignedAt,
          agencyCopySentAt: updatedContract.agencyCopySentAt || '',
          agencyCopyEmail: updatedContract.agencyCopyEmail || '',
        };
        window.localStorage.setItem(LS_SIG_REQUESTS_KEY, JSON.stringify(reqMap));
      }
    } catch {
      // Ignore storage write errors
    }
  };

  const handleDownloadSignedPdf = async () => {
    if (!contract) return;
    if (signedPdfFile) {
      triggerPdfDownload(signedPdfFile.blob, signedPdfFile.fileName);
      return;
    }
    if (!previewContentRef.current || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const generated = await generateContractPdf(
        previewContentRef.current,
        contract.contractNumber
      );
      setSignedPdfFile({ blob: generated.blob, fileName: generated.fileName });
      triggerPdfDownload(generated.blob, generated.fileName);
    } catch {
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || submitting) return;

    const cleanName = signerName.trim();
    if (cleanName.length < 2) {
      setSubmitError('Introduce tu nombre completo como contratante principal.');
      return;
    }
    if (!signatureDataUrl || signatureDataUrl.length < 32) {
      setSubmitError('Dibuja tu firma en el recuadro antes de confirmar.');
      return;
    }
    if (!acceptedTerms) {
      setSubmitError('Debes confirmar la casilla de aceptación para estampar la firma.');
      return;
    }

    const signedAt = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (isRemoteRequest && requestId.startsWith('sig_')) {
        await submitClientSignatureRemote({
          requestId,
          signatureDataUrl,
          signerName: cleanName,
          signedAt,
        });
      }

      const signedContract: TravelContract = {
        ...contract,
        status: 'signed',
        clientSignatureDataUrl: signatureDataUrl,
        clientSignerName: cleanName,
        clientSignedAt: signedAt,
        signatureRequestId: requestId || contract.signatureRequestId || '',
      };

      persistLocalContractFields(signedContract);
      setContract(signedContract);
      setSignModalOpen(false);
      setJustSignedBanner(true);
      setEmailDeliveryState('sending');
      setSubmitting(false);

      // Wait two animation frames so React stamps the handwritten signature onto pages 3, 4, 6, 7
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });

      let pdfBase64 = '';
      if (previewContentRef.current) {
        try {
          const generated = await generateContractPdf(
            previewContentRef.current,
            signedContract.contractNumber
          );
          pdfBase64 = generated.base64;
          setSignedPdfFile({ blob: generated.blob, fileName: generated.fileName });
        } catch {
          // Continue sending summary email even if PDF rendering fails in constrained environments
        }
      }

      const emailPayload = buildSignedContractEmailSummary(
        signedContract,
        agency,
        signatureDataUrl,
        cleanName,
        signedAt,
        pdfBase64
      );

      let deliverySucceeded = false;
      try {
        const res = await fetch('./api/send-signed-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await res.json()) as { sent?: boolean };
          if (res.ok && data.sent === true) {
            deliverySucceeded = true;
          }
        }
      } catch {
        // Static hosting (e.g. GitHub Pages) or network fallback -> manual action buttons shown
      }

      if (deliverySucceeded) {
        const copySentAt = new Date().toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const updatedWithEmail: TravelContract = {
          ...signedContract,
          agencyCopySentAt: copySentAt,
          agencyCopyEmail: agency.email,
        };
        setContract(updatedWithEmail);
        persistLocalContractFields(updatedWithEmail);
        if (isRemoteRequest && requestId.startsWith('sig_')) {
          void markSignatureRequestEmailSentRemote({
            requestId,
            agencyCopySentAt: copySentAt,
            agencyCopyEmail: agency.email,
          }).catch(() => {});
        }
        setEmailDeliveryState('sent');
      } else {
        setEmailDeliveryState('manual_required');
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? 'No se pudo registrar la firma en la nube. Inténtalo de nuevo en unos segundos.'
          : 'No se pudo guardar la firma.'
      );
      setSubmitting(false);
    }
  };

  const mailtoAgencyHref = useMemo(() => {
    if (!contract || !contract.clientSignatureDataUrl) return '#';
    const summaryPayload = buildSignedContractEmailSummary(
      contract,
      agency,
      contract.clientSignatureDataUrl,
      contract.clientSignerName || contract.clientFullName,
      contract.clientSignedAt || ''
    );
    return buildAgencyMailtoFallbackUrl(summaryPayload);
  }, [contract, agency]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-8 text-center max-w-sm w-full shadow-sm space-y-3">
          <DiverTriangleLogo className="w-14 h-14 mx-auto" />
          <p className="text-sm font-medium text-slate-800">Cargando contrato para firma...</p>
          <p className="text-xs text-slate-500">Viajes Mar de Hielo</p>
        </div>
      </div>
    );
  }

  if (loadError || !contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <DiverTriangleLogo className="w-11 h-11 shrink-0" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">{agency.commercialName}</h1>
              <p className="text-xs text-slate-500">Portal de firma electrónica de contratos</p>
            </div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{loadError || 'No se pudo cargar el contrato.'}</span>
          </div>
        </div>
      </div>
    );
  }

  const isSigned = Boolean(contract.clientSignatureDataUrl);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Client Bar */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <DiverTriangleLogo className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  Contrato {contract.contractNumber} · {contract.tripTitle}
                </h1>
                {isSigned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    Firmado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                    Pendiente de firma
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {contract.clientFullName} · Total: {formatEuro(contract.totalAmount)} · Firma en
                páginas 3, 4, 6 y 7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isSigned && (
              <button
                type="button"
                onClick={() => handleOpenSignModal(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
                Firmar contrato (Págs. 3, 4, 6 y 7)
              </button>
            )}
            {isSigned && (
              <button
                type="button"
                disabled={pdfGenerating}
                onClick={() => void handleDownloadSignedPdf()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {pdfGenerating ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              {isSigned ? 'Imprimir PDF firmado' : 'Abrir / Guardar PDF'}
            </button>
          </div>
        </div>

        {/* Quick Jump to Signature Zones */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 font-medium">
              Zonas de firma del Contratante Principal:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([3, 4, 6, 7] as const).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => scrollToContractPage(pNum)}
                  className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Ir a Pág. {pNum}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4 print:p-0 print:max-w-none">
        {justSignedBanner && isSigned && (
          <div
            role="status"
            className="no-print bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <CheckCircle2
                className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-semibold">
                  Contrato firmado correctamente en las páginas 3, 4, 6 y 7
                </p>
                <p className="text-emerald-800 text-xs">
                  Tu firma y la marca temporal ({contract.clientSignedAt}) ya aparecen en todas las
                  páginas de firma.
                </p>

                {emailDeliveryState === 'sending' && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Generando PDF y enviando copia automática a {agency.email}...
                  </p>
                )}

                {emailDeliveryState === 'sent' && (
                  <p className="text-xs font-medium text-emerald-900 bg-white/80 border border-emerald-300 rounded-md px-2.5 py-1 inline-block">
                    Se ha enviado automáticamente una copia del contrato firmado en PDF a{' '}
                    <strong>{contract.agencyCopyEmail || agency.email}</strong>.
                  </p>
                )}

                {emailDeliveryState === 'manual_required' && (
                  <p className="text-xs text-slate-700 bg-white/90 border border-emerald-200 rounded-md px-2.5 py-1.5">
                    El servidor de correo automático no está configurado en este entorno. Descarga el
                    PDF firmado y envíalo al correo de la agencia (<strong>{agency.email}</strong>).
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={pdfGenerating}
                onClick={() => void handleDownloadSignedPdf()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {pdfGenerating ? 'Generando PDF...' : 'Descargar PDF firmado'}
              </button>

              {emailDeliveryState === 'manual_required' && (
                <a
                  href={mailtoAgencyHref}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Enviar copia al email de la agencia
                </a>
              )}
            </div>
          </div>
        )}

        {/* Full 7-Page A4 Contract with interactive signature zones on pages 3, 4, 6, 7 */}
        <div
          ref={previewContainerRef}
          className="bg-slate-200/70 border border-slate-200 rounded-xl p-3 overflow-x-hidden print:p-0 print:bg-white print:border-0"
        >
          <div
            className="mx-auto print:!h-auto"
            style={{
              width: `${Math.round(794 * previewScale)}px`,
              height: scaledHeight ? `${scaledHeight}px` : undefined,
            }}
          >
            <div
              ref={previewContentRef}
              className="origin-top-left print:!transform-none"
              style={{
                width: '794px',
                transform: `scale(${previewScale})`,
              }}
            >
              <ContractDocumentPreview
                contract={contract}
                agency={agency}
                interactiveSignature={!isSigned}
                onRequestSign={(pNum) => handleOpenSignModal(pNum)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Signature Capture Modal */}
      {signModalOpen && !isSigned && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-sign-modal-title"
        >
          <form
            onSubmit={handleSubmitSignature}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 id="client-sign-modal-title" className="text-base font-semibold text-slate-900">
                  Firma del Contratante Principal
                </h2>
                <p className="text-xs text-slate-500">
                  Iniciada desde la página {activeSignPage} · Se aplicará automáticamente a las
                  páginas 3, 4, 6 y 7
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSignModalOpen(false)}
                aria-label="Cerrar panel de firma"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {submitError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="client-signer-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nombre y apellidos del Contratante Principal
                </label>
                <input
                  id="client-signer-name"
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <SignaturePadCanvas onChange={setSignatureDataUrl} />

              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-700"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Confirmo haber leído el contrato de viaje{' '}
                  <strong>{contract.contractNumber}</strong>, el Anexo I, el Anexo II y la
                  autorización de imágenes, y estampo mi firma en las páginas 3, 4, 6 y 7.
                </span>
              </label>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSignModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {submitting ? 'Guardando firma...' : 'Confirmar firma (Págs. 3, 4, 6 y 7)'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
