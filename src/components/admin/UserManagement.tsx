import React, { useState } from 'react';
import { Shield, Plus, Edit, Trash2, Key, Check, X, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, UserPermissions } from '../../types';
import { api, USE_SERVER_API } from '../../services/apiClient';

export const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');

  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateTransaction: true,
    canEditTransaction: true,
    canDeleteTransaction: false,
    canManageExpenses: true,
    canManageTransfers: false,
    canManageSettings: false,
    canViewAudit: false,
    canBackupRestore: false,
    canManageUsers: false,
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
    setRole('staff');
    setPermissions({
      canCreateTransaction: true,
      canEditTransaction: true,
      canDeleteTransaction: false,
      canManageExpenses: true,
      canManageTransfers: false,
      canManageSettings: false,
      canViewAudit: false,
      canBackupRestore: false,
      canManageUsers: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword(u.password || '');
    setFullName(u.fullName);
    setPhone(u.phone || '');
    setRole(u.role);
    setPermissions(u.permissions);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password.trim()) {
      alert('Username, Full Name, and Password are required.');
      return;
    }

    const effectivePermissions = role === 'admin'
      ? {
          canCreateTransaction: true,
          canEditTransaction: true,
          canDeleteTransaction: true,
          canManageExpenses: true,
          canManageTransfers: true,
          canManageSettings: true,
          canViewAudit: true,
          canBackupRestore: true,
          canManageUsers: true,
        }
      : permissions;

    try {
      if (USE_SERVER_API) {
        if (editingUser) {
          await api.updateUserServer(editingUser.id, {
            username: username.trim(),
            password: password.trim(),
            fullName: fullName.trim(),
            phone: phone.trim(),
            role,
            permissions: effectivePermissions,
          });
        } else {
          await api.createUser({
            username: username.trim(),
            password: password.trim(),
            fullName: fullName.trim(),
            phone: phone.trim(),
            role,
            permissions: effectivePermissions,
          });
        }
        window.location.reload();
        return;
      }

      if (editingUser) {
        updateUser(editingUser.id, {
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          role,
          permissions: effectivePermissions,
        });
      } else {
        addUser({
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          role,
          isActive: true,
          permissions: effectivePermissions,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save user');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Staff & User Accounts ({users.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Role-based access permissions, passwords, and user authorization
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{u.fullName}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  User ID: <strong>{u.username}</strong> {u.phone ? `· ${u.phone}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {u.id !== currentUser?.id && users.length > 1 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Deactivate user ${u.fullName}?`)) return;
                      try {
                        if (USE_SERVER_API) {
                          await api.deactivateUser(u.id);
                          window.location.reload();
                        } else {
                          deleteUser(u.id);
                        }
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Unable to deactivate user');
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Permission badges */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 font-semibold">
                Access Permissions
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                {u.permissions.canCreateTransaction && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Create Entry</span>
                )}
                {u.permissions.canEditTransaction && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Edit Invoices</span>
                )}
                {u.permissions.canDeleteTransaction && (
                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Delete Records</span>
                )}
                {u.permissions.canManageExpenses && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Expenses</span>
                )}
                {u.permissions.canManageTransfers && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Fund Transfers</span>
                )}
                {u.permissions.canManageSettings && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Settings</span>
                )}
                {u.permissions.canViewAudit && (
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Audit History</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingUser ? 'Edit User & Permissions' : 'Create New User Account'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  placeholder="e.g. Tanvir Ahmed"
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    User ID / Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    placeholder="e.g. staff2"
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'staff')}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="staff">Staff (Operational)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="01711-000000"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {role === 'staff' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-800">Custom Role Permissions:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canCreateTransaction}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canCreateTransaction: e.target.checked })
                        }
                      />
                      <span>Create Entries</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canEditTransaction}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canEditTransaction: e.target.checked })
                        }
                      />
                      <span>Edit Invoices</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canDeleteTransaction}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canDeleteTransaction: e.target.checked })
                        }
                      />
                      <span className="text-rose-600">Delete Invoices</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canManageExpenses}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canManageExpenses: e.target.checked })
                        }
                      />
                      <span>Record Expenses</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canManageTransfers}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canManageTransfers: e.target.checked })
                        }
                      />
                      <span>Fund Transfers</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canViewAudit}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canViewAudit: e.target.checked })
                        }
                      />
                      <span>View Audit Trail</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
