import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, ShieldAlert, X } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  buildCanonicalUrl,
  normalizePublicationDomain,
  validatePublicationDomain,
} from '../utils/contractLogic';

interface DomainPublishModalProps {
  open: boolean;
  currentDomain: string;
  onClose: () => void;
  onSaveDomain: (normalizedDomain: string) => Promise<void> | void;
}

export const DomainPublishModal: React.FC<DomainPublishModalProps> = ({
  open,
  currentDomain,
  onClose,
  onSaveDomain,
}) => {
  const [domainInput, setDomainInput] = useState(currentDomain);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [deployMethod, setDeployMethod] = useState<'firebase' | 'cloudrun'>('firebase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDomainInput(currentDomain);
      setError(null);
      setSavedNotice(false);
      setCopiedKey(null);
    }
  }, [open, currentDomain]);

  const normalizedPreview = useMemo(
    () => normalizePublicationDomain(domainInput),
    [domainInput]
  );

  const activeBrowserOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const activeBrowserHost =
    typeof window !== 'undefined' ? window.location.hostname : '';

  const effectivePublicUrl = useMemo(
    () => buildCanonicalUrl(normalizedPreview || currentDomain, activeBrowserOrigin),
    [normalizedPreview, currentDomain, activeBrowserOrigin]
  );

  const hostMismatch =
    Boolean(currentDomain) &&
    Boolean(activeBrowserHost) &&
    activeBrowserHost !== currentDomain &&
    activeBrowserHost !== 'localhost' &&
    activeBrowserHost !== '127.0.0.1';

  if (!open) return null;

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePublicationDomain(domainInput);
    if (validationError) {
      setError(validationError);
      setSavedNotice(false);
      return;
    }

    const clean = normalizePublicationDomain(domainInput);
    setError(null);
    setSaving(true);
    try {
      await onSaveDomain(clean);
      setDomainInput(clean);
      setSavedNotice(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el dominio de publicación.'
      );
    } finally {
      setSaving(false);
    }
  };

  const projectId = firebaseConfig.projectId;
  const authSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  const hostingUrl = `https://console.firebase.google.com/project/${projectId}/hosting/sites`;
  const displayDomain = normalizedPreview || currentDomain || 'contratos.mdhserviciotecnico.com';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-publish-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="domain-publish-title" className="text-base font-semibold text-slate-900">
                Dominio y publicación de la aplicación
              </h2>
              <p className="text-xs text-slate-500">
                Configura tu dominio personalizado para metadatos canónicos, Firebase Auth y despliegue web.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración de dominio"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="pub-domain-input" className="block text-xs font-medium text-slate-700 mb-1">
                Dominio personalizado de publicación
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600">
                  <span className="px-3 py-2 text-xs font-mono text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                    https://
                  </span>
                  <input
                    id="pub-domain-input"
                    type="text"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      setError(null);
                      setSavedNotice(false);
                    }}
                    placeholder="contratos.mdhserviciotecnico.com"
                    className="w-full px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg whitespace-nowrap"
                >
                  {saving ? 'Guardando...' : 'Guardar dominio'}
                </button>
              </div>
              {error ? (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                  {error}
                </p>
              ) : savedNotice ? (
                <p className="mt-1.5 text-xs text-emerald-700 font-medium">
                  {currentDomain
                    ? `Dominio guardado (${currentDomain}) y sincronizado en los metadatos canónicos.`
                    : 'Dominio personalizado eliminado; se utilizará el origen actual.'}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Introduce solo el dominio o subdominio (p. ej. <span className="font-mono">contratos.mdhserviciotecnico.com</span>). Déjalo vacío para usar la URL por defecto.
                </p>
              )}
            </div>
          </form>

          {/* Active & configured URLs summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                URL canónica configurada
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-800 truncate" title={effectivePublicUrl}>
                  {effectivePublicUrl || '—'}
                </span>
                {effectivePublicUrl && (
                  <button
                    type="button"
                    onClick={() => handleCopy('canonical', effectivePublicUrl)}
                    aria-label="Copiar URL canónica"
                    className="p-1 text-slate-500 hover:text-slate-900 rounded shrink-0"
                  >
                    {copiedKey === 'canonical' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Origen actual en ejecución
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-800 truncate" title={activeBrowserOrigin}>
                  {activeBrowserOrigin || '—'}
                </span>
                {activeBrowserOrigin && (
                  <button
                    type="button"
                    onClick={() => handleCopy('origin', activeBrowserOrigin)}
                    aria-label="Copiar origen actual"
                    className="p-1 text-slate-500 hover:text-slate-900 rounded shrink-0"
                  >
                    {copiedKey === 'origin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {hostMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-amber-900 leading-relaxed">
                Estás viendo la app desde <span className="font-mono font-medium">{activeBrowserHost}</span>, distinto del dominio guardado (<span className="font-mono font-medium">{currentDomain}</span>). Completa los pasos DNS y de autorización inferiores para activarlo en producción.
              </p>
            </div>
          )}

          {/* Mandatory Firebase Auth step */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Paso 1 (Obligatorio) · Autorizar dominio en Firebase Auth
              </h3>
              <a
                href={authSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
              >
                Abrir Firebase Auth
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para que el botón <strong>Conectar con Google</strong> funcione desde tu dominio, añádelo en <em>Authentication → Settings → Authorized domains</em> dentro del proyecto <span className="font-mono text-slate-800">{projectId}</span>.
            </p>
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <code className="text-xs font-mono text-slate-900 truncate">{displayDomain}</code>
              <button
                type="button"
                onClick={() => handleCopy('auth-domain', displayDomain)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md whitespace-nowrap"
              >
                {copiedKey === 'auth-domain' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    Copiar dominio
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hosting / DNS options */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Paso 2 · Publicar y conectar registros DNS
              </h3>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start">
                <button
                  type="button"
                  onClick={() => setDeployMethod('firebase')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    deployMethod === 'firebase'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Firebase Hosting
                </button>
                <button
                  type="button"
                  onClick={() => setDeployMethod('cloudrun')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    deployMethod === 'cloudrun'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Google Cloud Run
                </button>
              </div>
            </div>

            {deployMethod === 'firebase' ? (
              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <p>
                  El proyecto ya incluye la configuración SPA lista para desplegar (<span className="font-mono">firebase.json</span> y <span className="font-mono">.firebaserc</span> vinculados a <span className="font-mono">{projectId}</span>):
                </p>
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 text-slate-100 rounded-lg">
                  <code className="font-mono text-xs truncate">
                    npm run build && firebase deploy --only hosting
                  </code>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy('fb-cmd', 'npm run build && firebase deploy --only hosting')
                    }
                    aria-label="Copiar comando de despliegue en Firebase Hosting"
                    className="p-1 text-slate-300 hover:text-white rounded shrink-0"
                  >
                    {copiedKey === 'fb-cmd' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p>
                  Después entra en{' '}
                  <a
                    href={hostingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 font-medium hover:underline inline-flex items-center gap-0.5"
                  >
                    Firebase Hosting → Add custom domain
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                  , introduce <span className="font-mono text-slate-800">{displayDomain}</span> y añade en tu proveedor DNS los registros <span className="font-mono">TXT</span> y <span className="font-mono">A</span> indicados para emitir el certificado SSL automático.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>
                  Si mantienes el alojamiento directamente sobre el servicio publicado desde AI Studio en Google Cloud Run:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>
                    Publica la app desde AI Studio (Share / Deploy) y abre <strong>Cloud Run → Manage Custom Domains</strong> en Google Cloud Console.
                  </li>
                  <li>
                    Pulsa <strong>Add Mapping</strong> y selecciona <span className="font-mono">{displayDomain}</span>.
                  </li>
                  <li>
                    Crea en el DNS de tu dominio el registro <span className="font-mono">CNAME</span> hacia <span className="font-mono">ghs.googlehosted.com.</span> (para subdominios) o los registros <span className="font-mono">A/AAAA</span> para dominio raíz.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
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
