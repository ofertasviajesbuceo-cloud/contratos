import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, User as UserIcon } from 'lucide-react';
import { DiverTriangleLogo } from './AgencyBrandMarks';

interface LoginScreenProps {
  agencyName: string;
  onPasswordLogin: (username: string, password: string) => Promise<string | null>;
  onGoogleLogin: () => Promise<void>;
  googleError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  agencyName,
  onPasswordLogin,
  onGoogleLogin,
  googleError,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Introduce tu nombre de usuario y contraseña.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const errMsg = await onPasswordLogin(username, password);
      if (errMsg) {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 pt-7 pb-5 border-b border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center mb-3">
            <DiverTriangleLogo className="w-16 h-16" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {agencyName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Panel de Gestión de Contratos, Plantillas y Clientes
          </p>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nombre de usuario
              </label>
              <div className="relative">
                <UserIcon
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nombre de usuario"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              {submitting ? 'Verificando acceso...' : 'Acceder al panel'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              o accede con Google
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {googleError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
            >
              {googleError}
            </div>
          )}

          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4 text-slate-600" aria-hidden="true" />
            Conectar con Google (sincronización Firebase)
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Acceso restringido al personal autorizado de {agencyName}.
          </p>
        </div>
      </div>
    </div>
  );
};
