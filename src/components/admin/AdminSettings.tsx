import React, { useState } from 'react';
import {
  ShieldAlert,
  Building,
  Settings,
  Database,
  History,
  Users,
  MessageSquare,
  Layers,
  Pencil,
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, ServiceItem } from '../../types';
import { UserManagement } from './UserManagement';
import { AuditHistoryView } from './AuditHistoryView';
import { AutomatedBackupSettings } from './AutomatedBackupSettings';
import { formatCurrency } from '../../utils/formatters';

interface AdminSettingsProps {
  defaultTab?: 'business' | 'services' | 'expenses' | 'templates' | 'opening' | 'users' | 'backup' | 'audit';
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ defaultTab = 'business' }) => {
  const {
    settings,
    updateSettings,
    services,
    updateServices,
    expenseCategories,
    updateExpenseCategories,
    openingBalances,
    updateOpeningBalance,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'business' | 'services' | 'expenses' | 'templates' | 'opening' | 'users' | 'backup' | 'audit'>(defaultTab);

  // Business info form state
  const [bizName, setBizName] = useState(settings.name);
  const [bizTagline, setBizTagline] = useState(settings.tagline);
  const [bizAddress, setBizAddress] = useState(settings.address);
  const [bizMobile, setBizMobile] = useState(settings.mobile);
  const [bizWhatsapp, setBizWhatsapp] = useState(settings.whatsapp);
  const [bizEmail, setBizEmail] = useState(settings.email);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [invoiceTerms, setInvoiceTerms] = useState(settings.invoiceTerms);
  const [signatureLabel, setSignatureLabel] = useState(settings.signatureLabel);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);

  // Template states
  const [templates, setTemplates] = useState(settings.templates);

  // Service item management
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceItem['category']>('Air Ticket');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editingServiceCategory, setEditingServiceCategory] = useState<ServiceItem['category']>('Air Ticket');

  // New Expense Category
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Status message
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      name: bizName,
      tagline: bizTagline,
      address: bizAddress,
      mobile: bizMobile,
      whatsapp: bizWhatsapp,
      email: bizEmail,
      invoicePrefix,
      invoiceTerms,
      signatureLabel,
      logoUrl,
    });
    setSaveMessage('Business information saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ templates });
    setSaveMessage('Messaging templates saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const newService: ServiceItem = {
      id: `srv_${Date.now()}`,
      name: newServiceName.trim(),
      category: newServiceCategory,
      enabled: true,
      order: services.length + 1,
    };
    updateServices([...services, newService]);
    setNewServiceName('');
  };

  const handleToggleService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    updateServices(updated);
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Delete this service?')) {
      const updated = services.filter((s) => s.id !== id);
      updateServices(updated);
    }
  };

  const startEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setEditingServiceName(service.name);
    setEditingServiceCategory(service.category);
  };

  const saveEditService = () => {
    if (!editingServiceId || !editingServiceName.trim()) return;
    updateServices(services.map((s) =>
      s.id === editingServiceId
        ? { ...s, name: editingServiceName.trim(), category: editingServiceCategory }
        : s
    ));
    setEditingServiceId(null);
    setEditingServiceName('');
  };

  const handleAddExpenseCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    updateExpenseCategories([
      ...expenseCategories,
      { id: `cat_${Date.now()}`, name: newCatName.trim() },
    ]);
    setNewCatName('');
  };

  const startEditExpenseCategory = (cat: { id: string; name: string }) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEditExpenseCategory = () => {
    if (!editingCatId || !editingCatName.trim()) return;
    updateExpenseCategories(expenseCategories.map((cat) =>
      cat.id === editingCatId ? { ...cat, name: editingCatName.trim() } : cat
    ));
    setEditingCatId(null);
    setEditingCatName('');
  };

  const deleteExpenseCategory = (id: string) => {
    if (confirm('Delete this expense category?')) {
      updateExpenseCategories(expenseCategories.filter((cat) => cat.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            <span>Admin Control Panel & System Configuration</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Business profiles, services catalog, messaging templates, opening balances & audit trail
          </p>
        </div>

        {saveMessage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'business'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Business Info</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Services Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Expense Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp & SMS Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('opening')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'opening'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Opening Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Accounts & Permissions</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Automated Backup & Recovery</span>
        </button>
      </div>

      {/* TAB 1: BUSINESS SETTINGS */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
            Company & Agency Identity Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Business Tagline
              </label>
              <input
                type="text"
                value={bizTagline}
                onChange={(e) => setBizTagline(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Agency Phone / Helpline
              </label>
              <input
                type="text"
                value={bizMobile}
                onChange={(e) => setBizMobile(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={bizWhatsapp}
                onChange={(e) => setBizWhatsapp(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={bizEmail}
                onChange={(e) => setBizEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Agency Physical Address
            </label>
            <input
              type="text"
              value={bizAddress}
              onChange={(e) => setBizAddress(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Invoice Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={invoiceTerms}
              onChange={(e) => setInvoiceTerms(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div className="space-y-5">
          {/* Add Service Box */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-3">Add New Service</h3>
            <form onSubmit={handleAddService} className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                required
                placeholder="e.g. Saudi Work Visa Stamping, Umrah Package"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none flex-1 min-w-[200px]"
              />

              <select
                value={newServiceCategory}
                onChange={(e) => setNewServiceCategory(e.target.value as ServiceItem['category'])}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
              >
                <option value="Air Ticket">Air Ticket</option>
                <option value="Visa">Visa</option>
                <option value="Passport">Passport</option>
                <option value="Digital">Digital</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Service</span>
              </button>
            </form>
          </div>

          {/* Current Services List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Active Services ({services.length})
            </div>
            <div className="divide-y divide-slate-100">
              {services.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs"
                >
                  {editingServiceId === s.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input value={editingServiceName} onChange={(e) => setEditingServiceName(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-lg text-xs min-w-[220px]" />
                      <select value={editingServiceCategory} onChange={(e) => setEditingServiceCategory(e.target.value as ServiceItem['category'])} className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white">
                        <option value="Air Ticket">Air Ticket</option>
                        <option value="Visa">Visa</option>
                        <option value="Passport">Passport</option>
                        <option value="Digital">Digital</option>
                        <option value="Other">Other</option>
                      </select>
                      <button type="button" onClick={saveEditService} className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold">Save</button>
                      <button type="button" onClick={() => setEditingServiceId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 text-[11px] w-6">#{idx + 1}</span>
                    <span className={`font-semibold ${s.enabled ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {s.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {s.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditService(s)}
                      className="p-1 text-slate-400 hover:text-blue-600"
                      title="Edit service"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleService(s.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        s.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSE CATALOG */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase mb-3">Add New Expense Category</h3>
            <form onSubmit={handleAddExpenseCategory} className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                required
                placeholder="e.g. Office Rent, Internet Bill, Bank Charge"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none flex-1 min-w-[220px]"
              />
              <button type="submit" className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Add Expense Category
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Expense Catalog ({expenseCategories.length})
            </div>
            <div className="divide-y divide-slate-100">
              {expenseCategories.map((cat, idx) => (
                <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                  {editingCatId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-lg text-xs flex-1" />
                      <button type="button" onClick={saveEditExpenseCategory} className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold">Save</button>
                      <button type="button" onClick={() => setEditingCatId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400 text-[11px] w-6">#{idx + 1}</span>
                        <span className="font-semibold text-slate-900">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => startEditExpenseCategory(cat)} className="p-1 text-slate-400 hover:text-blue-600" title="Edit expense category">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => deleteExpenseCategory(cat.id)} className="p-1 text-slate-400 hover:text-rose-600" title="Delete expense category">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                WhatsApp, SMS & Email Predefined Templates
              </h3>
              <p className="text-xs text-slate-500">
                Dynamic Variables: <code className="text-emerald-700 font-mono">&#123;&#123;customer_name&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;amount&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;invoice_number&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;due_amount&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;paid_amount&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;service_name&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;verification_url&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;flight_number&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;pnr&#125;&#125;</code>, <code className="text-emerald-700 font-mono">&#123;&#123;business_name&#125;&#125;</code>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice & Bill Summary Template
              </label>
              <textarea
                rows={3}
                value={templates.invoiceShare || ''}
                onChange={(e) =>
                  setTemplates({ ...templates, invoiceShare: e.target.value })
                }
                placeholder="Dear {{customer_name}}, here is your invoice {{invoice_number}}..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Due Reminder Template
              </label>
              <textarea
                rows={3}
                value={templates.customerDueReminder}
                onChange={(e) =>
                  setTemplates({ ...templates, customerDueReminder: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Received Confirmation Template
              </label>
              <textarea
                rows={3}
                value={templates.paymentReceived}
                onChange={(e) => setTemplates({ ...templates, paymentReceived: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Payment Completed (Thank You) Template
              </label>
              <textarea
                rows={3}
                value={templates.paymentCompletedThankYou}
                onChange={(e) =>
                  setTemplates({ ...templates, paymentCompletedThankYou: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Flight Departure Reminder Notice
              </label>
              <textarea
                rows={3}
                value={templates.flightReminder}
                onChange={(e) => setTemplates({ ...templates, flightReminder: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Urgent Schedule Change Notice
              </label>
              <textarea
                rows={3}
                value={templates.scheduleChangeNotice || ''}
                onChange={(e) => setTemplates({ ...templates, scheduleChangeNotice: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Refund / Void Adjustment Notice
              </label>
              <textarea
                rows={3}
                value={templates.refundVoidNotification || ''}
                onChange={(e) => setTemplates({ ...templates, refundVoidNotification: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Templates</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: OPENING BALANCES */}
      {activeTab === 'opening' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              Manual Opening Balances Setup
            </h3>
            <p className="text-xs text-slate-500">
              Configure initial cash and bank drawer balances carried over from previous manual ledger books
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(openingBalances) as PaymentMethod[]).map((method) => (
              <div key={method} className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {method} Opening Balance (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  defaultValue={openingBalances[method]}
                  onBlur={(e) => updateOpeningBalance(method, Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded-lg bg-white focus:outline-none tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USERS */}
      {activeTab === 'users' && <UserManagement />}

      {/* TAB 6: AUDIT HISTORY */}
      {activeTab === 'audit' && <AuditHistoryView />}

      {/* TAB 7: AUTOMATED BACKUP & RECOVERY */}
      {activeTab === 'backup' && <AutomatedBackupSettings />}
    </div>
  );
};
