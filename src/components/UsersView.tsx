import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type { AccessRole, AccessUser } from '../types/contract';
import { hashPassword } from '../utils/authCrypto';
import { normalizeUsername, validateAccessUserInput } from '../utils/contractLogic';

interface UsersViewProps {
  users: AccessUser[];
  currentUsername: string;
  onSaveUser: (user: AccessUser, isNew: boolean) => Promise<void> | void;
  onDeleteUser: (userId: string) => Promise<void> | void;
}

const ROLE_LABELS: Record<AccessRole, string> = {
  admin: 'Administrador total',
  editor: 'Gestor de viajes',
  viewer: 'Solo lectura',
};

const ROLE_DESCRIPTIONS: Record<AccessRole, string> = {
  admin: 'Control total: usuarios, contratos, plantillas, clientes, datos legales y dominio.',
  editor: 'Crea y edita contratos, plantillas y clientes. No administra usuarios ni datos legales.',
  viewer: 'Consulta e imprime contratos en PDF sin permisos de edición ni borrado.',
};

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUsername,
  onSaveUser,
  onDeleteUser,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccessUser | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessRole>('editor');
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      activeCount: users.filter((u) => u.active).length,
    }),
    [users]
  );

  const openCreateModal = () => {
    setEditingUser(null);
    setDisplayName('');
    setUsername('');
    setEmail('');
    setRole('editor');
    setActive(true);
    setPassword('');
    setShowPassword(false);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (user: AccessUser) => {
    setEditingUser(user);
    setDisplayName(user.displayName);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setActive(user.active);
    setPassword('');
    setShowPassword(false);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otherUsernames = users
      .filter((u) => !editingUser || u.id !== editingUser.id)
      .map((u) => normalizeUsername(u.username));

    const validation = validateAccessUserInput({
      username,
      displayName,
      email,
      password,
      requirePassword: !editingUser,
      existingUsernames: otherUsernames,
    });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    try {
      const nextPasswordHash =
        password.length > 0
          ? await hashPassword(password)
          : editingUser?.passwordHash || (await hashPassword(password));

      const isPrimary = editingUser?.isPrimary ?? false;
      const nextUser: AccessUser = {
        id: editingUser ? editingUser.id : `usr-${Date.now()}`,
        ownerId: editingUser?.ownerId || 'local-demo',
        username: normalizeUsername(username),
        displayName: displayName.trim(),
        email: email.trim(),
        role: isPrimary ? 'admin' : role,
        active: isPrimary ? true : active,
        isPrimary,
        passwordHash: nextPasswordHash,
      };

      await onSaveUser(nextUser, !editingUser);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AccessUser) => {
    if (user.isPrimary || user.username === currentUsername) return;
    await onSaveUser({ ...user, active: !user.active }, false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Usuarios de acceso</h2>
          <p className="text-sm text-slate-500">
            Administra quién puede iniciar sesión en el panel y sus permisos sobre contratos, plantillas y configuración.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Nuevo usuario de acceso
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Usuarios configurados</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Administradores totales</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {stats.admins}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Cuentas activas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            {stats.activeCount}
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-3">Rol y alcance</th>
                <th className="py-3 px-3 hidden md:table-cell">Correo</th>
                <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((user) => {
                const isSelf = normalizeUsername(user.username) === normalizeUsername(currentUsername);
                const protectedUser = user.isPrimary || isSelf;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 max-w-[260px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {user.displayName}
                            </span>
                            {user.isPrimary && (
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-500 truncate">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 max-w-[210px]">
                      <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {ROLE_LABELS[user.role]}
                      </p>
                      <p
                        className="text-xs text-slate-500 truncate"
                        title={ROLE_DESCRIPTIONS[user.role]}
                      >
                        {ROLE_DESCRIPTIONS[user.role]}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 text-xs text-slate-600 hidden md:table-cell max-w-[180px] truncate">
                      {user.email || '—'}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Desactivado
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          aria-label={`Editar usuario ${user.username}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap shrink-0"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          Editar / Clave
                        </button>

                        {!protectedUser && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            aria-label={
                              user.active
                                ? `Desactivar usuario ${user.username}`
                                : `Activar usuario ${user.username}`
                            }
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
                            title={user.active ? 'Desactivar acceso' : 'Reactivar acceso'}
                          >
                            {user.active ? (
                              <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            )}
                          </button>
                        )}

                        {!protectedUser &&
                          (confirmDeleteId === user.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteUser(user.id);
                                setConfirmDeleteId(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(user.id)}
                              aria-label={`Eliminar usuario ${user.username}`}
                              className="p-1.5 text-slate-500 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Access User Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-user-modal-title"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3
                  id="access-user-modal-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {editingUser
                    ? `Editar usuario @${editingUser.username}`
                    : 'Nuevo usuario de acceso'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser?.isPrimary
                    ? 'Usuario principal con administración total del sistema.'
                    : 'Configura credenciales y permisos de acceso al panel.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar ventana de usuario"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label
                  htmlFor="user-display-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nombre completo / visible
                </label>
                <input
                  id="user-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setErrors((prev) => ({ ...prev, displayName: '' }));
                  }}
                  placeholder="Ej. Laura Martínez"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                {errors.displayName && (
                  <p className="mt-1 text-xs text-red-600">{errors.displayName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="user-username"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Nombre de usuario
                  </label>
                  <input
                    id="user-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrors((prev) => ({ ...prev, username: '' }));
                    }}
                    placeholder="ej. laura"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="user-email"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Correo electrónico (opcional)
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="correo@agencia.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {editingUser
                    ? 'Nueva contraseña (dejar vacío para mantener la actual)'
                    : 'Contraseña inicial'}
                </label>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg"
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
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Rol y permisos
                </label>
                <select
                  id="user-role"
                  disabled={Boolean(editingUser?.isPrimary)}
                  value={editingUser?.isPrimary ? 'admin' : role}
                  onChange={(e) => setRole(e.target.value as AccessRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50"
                >
                  <option value="admin">Administrador total</option>
                  <option value="editor">Gestor de viajes (Contratos, Plantillas y Clientes)</option>
                  <option value="viewer">Solo lectura (Consulta e Impresión PDF)</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {ROLE_DESCRIPTIONS[editingUser?.isPrimary ? 'admin' : role]}
                </p>
              </div>

              {!editingUser?.isPrimary && (
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-700"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Permitir el inicio de sesión a este usuario
                  </span>
                </label>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
              >
                {saving
                  ? 'Guardando...'
                  : editingUser
                    ? 'Guardar cambios'
                    : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
