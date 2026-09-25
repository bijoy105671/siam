import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Copy,
  Check,
  Phone,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Plane,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Info,
  Clock,
  ShieldCheck,
  Tag,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Transaction, BusinessSettings } from '../../types';
import { formatCurrency, formatDate, formatTime, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import {
  extractVariables,
  parseTemplate,
  AVAILABLE_TEMPLATE_VARIABLES,
  TemplateVariables,
} from '../../utils/templateParser';
import { generateVerificationUrl } from '../../utils/invoiceVerification';

export type TemplateKey =
  | 'invoiceShare'
  | 'customerDueReminder'
  | 'paymentReceived'
  | 'paymentCompletedThankYou'
  | 'flightReminder'
  | 'scheduleChangeNotice'
  | 'refundVoidNotification'
  | 'custom';

interface WhatsAppSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  customer?: Customer | null;
  defaultTemplateKey?: TemplateKey;
  onSent?: (data: { phone: string; message: string; templateKey: string }) => void;
}

interface TemplateOption {
  key: TemplateKey;
  label: string;
  category: 'Billing' | 'Reminders' | 'Flights' | 'General';
  icon: React.FC<{ className?: string }>;
  description: string;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    key: 'customerDueReminder',
    label: 'Due Payment Reminder',
    category: 'Reminders',
    icon: AlertTriangle,
    description: 'Alert customer about pending balance due with invoice reference and helpline',
  },
  {
    key: 'invoiceShare',
    label: 'Invoice & Bill Summary',
    category: 'Billing',
    icon: FileText,
    description: 'Detailed invoice bill, payments, and online authenticity verification link',
  },
  {
    key: 'paymentReceived',
    label: 'Payment Confirmation',
    category: 'Billing',
    icon: CheckCircle2,
    description: 'Receipt of partial or recent customer payment with remaining balance',
  },
  {
    key: 'paymentCompletedThankYou',
    label: 'Full Settlement (Thank You)',
    category: 'Billing',
    icon: DollarSign,
    description: 'Thank-you note for complete settlement (balance ৳0) and safe travels',
  },
  {
    key: 'flightReminder',
    label: 'Flight Schedule & Ticket Notice',
    category: 'Flights',
    icon: Plane,
    description: 'Flight departure time, PNR, ticket number, route and airport check-in instructions',
  },
  {
    key: 'scheduleChangeNotice',
    label: 'Urgent Schedule Update',
    category: 'Flights',
    icon: Clock,
    description: 'Urgent flight time/date adjustment notice requesting customer to contact agency',
  },
  {
    key: 'refundVoidNotification',
    label: 'Refund / Void Adjustment',
    category: 'General',
    icon: RefreshCw,
    description: 'Notification of refunded ticket or void credit status',
  },
  {
    key: 'custom',
    label: 'Custom / Freeform Message',
    category: 'General',
    icon: Sparkles,
    description: 'Write your own custom message using interactive dynamic variables',
  },
];

export const WhatsAppSenderModal: React.FC<WhatsAppSenderModalProps> = ({
  isOpen,
  onClose,
  transaction,
  customer,
  defaultTemplateKey,
  onSent,
}) => {
  const { settings, snoozeReminder, completeReminder } = useApp();

  // Determine initial template key
  const getInitialKey = (): TemplateKey => {
    if (defaultTemplateKey) return defaultTemplateKey;
    if (transaction.customerDue > 0) return 'customerDueReminder';
    if (transaction.flightDetails) return 'flightReminder';
    return 'invoiceShare';
  };

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>(getInitialKey());
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [templateText, setTemplateText] = useState<string>('');
  const [customDraft, setCustomDraft] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [selectedVarCategory, setSelectedVarCategory] = useState<string>('All');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync recipient phone and verification URL on load
  useEffect(() => {
    if (!isOpen) return;

    const phone =
      customer?.whatsapp ||
      customer?.mobile ||
      transaction.customerMobile ||
      '';
    setRecipientPhone(phone);
    setIsDispatched(false);

    // Fetch verification URL
    generateVerificationUrl(transaction, settings)
      .then((res) => {
        setVerificationUrl(res.url);
      })
      .catch((err) => {
        console.error('Error getting verification url for whatsapp template:', err);
      });
  }, [isOpen, transaction, customer, settings]);

  // Load template content when key or settings change
  const getTemplateContentByKey = (key: TemplateKey): string => {
    switch (key) {
      case 'invoiceShare':
        return (
          settings.templates?.invoiceShare ||
          'Dear {{customer_name}}, here is your invoice {{invoice_number}} from {{business_name}} for {{service_name}}.\nTotal Amount: {{amount}}\nPaid: {{paid_amount}}\nDue Balance: {{due_amount}}\n\nVerify authenticity online:\n{{verification_url}}\n\nHelpline: {{business_phone}}. Thank you for choosing {{business_name}}!'
        );
      case 'customerDueReminder':
        return (
          settings.templates.customerDueReminder ||
          'Dear {{customer_name}}, reminder from {{business_name}}: You have an outstanding due of {{due_amount}} for {{service_name}} (Invoice: {{invoice_number}}). Kindly clear the payment at your earliest convenience. Helpline: {{business_phone}}. Thank you!'
        );
      case 'paymentReceived':
        return (
          settings.templates.paymentReceived ||
          'Dear {{customer_name}}, we received {{paid_amount}} via {{payment_method}} for Invoice {{invoice_number}}. Remaining Due: {{due_amount}}. Thank you for choosing {{business_name}}!'
        );
      case 'paymentCompletedThankYou':
        return (
          settings.templates.paymentCompletedThankYou ||
          'Dear {{customer_name}}, thank you! Your payment of {{paid_amount}} for Invoice {{invoice_number}} is fully settled. Your balance is ৳0 (PAID in Full). Safe travels from {{business_name}}!'
        );
      case 'flightReminder':
        return (
          settings.templates.flightReminder ||
          'FLIGHT REMINDER: Dear {{customer_name}}, your flight {{flight_number}} ({{airline}}) on route {{route}} departs on {{flight_date}} at {{flight_time}}. PNR: {{pnr}}, Ticket: {{ticket_number}}. Please arrive at airport 4 hours before departure. Wish you a safe journey! - {{business_name}}'
        );
      case 'scheduleChangeNotice':
        return (
          settings.templates.scheduleChangeNotice ||
          'URGENT SCHEDULE UPDATE: Dear {{customer_name}}, your flight {{flight_number}} (PNR: {{pnr}}) schedule has been updated to {{flight_date}} at {{flight_time}}. Please contact {{business_name}} immediately at {{business_phone}}.'
        );
      case 'refundVoidNotification':
        return (
          settings.templates.refundVoidNotification ||
          'Dear {{customer_name}}, your refund/void request for PNR {{pnr}} ({{airline}}) has been processed. Refund Amount: {{amount}}. Net adjustment updated. Regards, {{business_name}}.'
        );
      case 'custom':
        return (
          customDraft ||
          `Dear {{customer_name}},\n\nRegarding your invoice {{invoice_number}} for {{service_name}} with {{business_name}}.\nTotal: {{amount}}\nDue: {{due_amount}}\n\nHelpline: {{business_phone}}`
        );
      default:
        return '';
    }
  };

  // Switch template
  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplateKey(key);
    const content = getTemplateContentByKey(key);
    setTemplateText(content);
  };

  // When initial template key changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialKey = getInitialKey();
      setSelectedTemplateKey(initialKey);
      setTemplateText(getTemplateContentByKey(initialKey));
    }
  }, [isOpen, transaction.id]);

  if (!isOpen) return null;

  // Extract variables with current context & verification URL
  const templateVariables: TemplateVariables = extractVariables(
    transaction,
    customer,
    null,
    settings,
    {
      verification_url: verificationUrl || 'https://verify.agency.com',
    }
  );

  // Parse template with dynamic variables
  const finalParsedMessage = parseTemplate(templateText, templateVariables);

  // Insert variable tag into editor at cursor position
  const handleInsertVariable = (variablePlaceholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateText((prev) => prev + ' ' + variablePlaceholder);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal =
      currentVal.substring(0, startPos) +
      variablePlaceholder +
      currentVal.substring(endPos);

    setTemplateText(newVal);

    if (selectedTemplateKey === 'custom') {
      setCustomDraft(newVal);
    }

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        startPos + variablePlaceholder.length,
        startPos + variablePlaceholder.length
      );
    }, 20);
  };

  // Reset to original template text
  const handleResetToDefault = () => {
    const original = getTemplateContentByKey(selectedTemplateKey);
    setTemplateText(original);
  };

  // Clean phone number for WhatsApp
  const cleanPhone = sanitizePhoneForWhatsapp(recipientPhone);
  const isValidPhone = cleanPhone.length >= 8;

  // Direct WhatsApp Web / App Dispatch URL
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    finalParsedMessage
  )}`;

  // Copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(finalParsedMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Send message
  const handleSendMessage = () => {
    if (!isValidPhone) {
      alert('Please enter a valid customer phone number with country code.');
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsDispatched(true);

    if (onSent) {
      onSent({
        phone: cleanPhone,
        message: finalParsedMessage,
        templateKey: selectedTemplateKey,
      });
    }
  };

  // Filter variables by category
  const filteredVariables =
    selectedVarCategory === 'All'
      ? AVAILABLE_TEMPLATE_VARIABLES
      : AVAILABLE_TEMPLATE_VARIABLES.filter(
          (v) => v.category === selectedVarCategory
        );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 text-emerald-300 shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  WhatsApp Service Dispatcher
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded border border-emerald-400/30">
                  Business Integrated
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Customer: <strong className="text-white">{transaction.customerName}</strong> · Invoice:{' '}
                <strong className="text-white font-mono">{transaction.invoiceNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                transaction.status === 'PAID'
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
                  : 'bg-rose-500/30 text-rose-200 border-rose-400/30'
              }`}
            >
              {transaction.status === 'PAID'
                ? 'PAID (৳0 Due)'
                : `DUE: ${formatCurrency(transaction.customerDue)}`}
            </span>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Recipient Contact Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                {transaction.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>{transaction.customerName}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({transaction.serviceName})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Total: {formatCurrency(transaction.sellingPrice)} · Paid: {formatCurrency(transaction.customerPaid)} · Due:{' '}
                  <strong className={transaction.customerDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {formatCurrency(transaction.customerDue)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Phone Input */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                  📱
                </span>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="e.g. 01812345678"
                  className="pl-7 pr-3 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[170px]"
                />
              </div>

              {recipientPhone && (
                <a
                  href={`tel:${recipientPhone}`}
                  title="Direct Phone Call"
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Template Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Select Business Template</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Pulls dynamically from business configuration
              </span>
            </div>

            {/* Template options grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATE_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedTemplateKey === opt.key;
                const isRecommended =
                  (opt.key === 'customerDueReminder' && transaction.customerDue > 0) ||
                  (opt.key === 'paymentCompletedThankYou' && transaction.customerDue === 0) ||
                  (opt.key === 'flightReminder' && transaction.flightDetails && transaction.customerDue === 0);

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectTemplate(opt.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <IconComponent
                          className={`w-4 h-4 ${
                            isSelected ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        />
                        {isRecommended && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full uppercase">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs mt-1.5 leading-snug line-clamp-1">
                        {opt.label}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                      {opt.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Variables Insertion Bar */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Dynamic Variables (Click to Insert into Message):</span>
              </span>

              {/* Category filter pills */}
              <div className="flex items-center gap-1 text-[10px]">
                {['All', 'Customer', 'Financial', 'Invoice', 'Flight', 'Business'].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedVarCategory(cat)}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        selectedVarCategory === cat
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Variable chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
              {filteredVariables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.placeholder)}
                  title={`Insert ${v.placeholder} (Value: ${templateVariables[v.key] || v.example})`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">+</span>
                  <span>{v.placeholder}</span>
                  <span className="text-[9px] text-slate-400 font-sans">
                    ({v.label})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor & Live WhatsApp Bubble Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Message Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Message Template Editor</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset to default template"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">
                    {templateText.length} chars
                  </span>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                rows={9}
                value={templateText}
                onChange={(e) => {
                  setTemplateText(e.target.value);
                  if (selectedTemplateKey === 'custom') {
                    setCustomDraft(e.target.value);
                  }
                }}
                className="w-full p-3 text-xs font-mono text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs resize-none leading-relaxed"
                placeholder="Compose your message here or choose a business template..."
              />
              <p className="text-[10px] text-slate-400 italic">
                *Tip:* Dynamic variables like <code>&#123;&#123;customer_name&#125;&#125;</code> and <code>&#123;&#123;amount&#125;&#125;</code> will be instantly replaced before sending.
              </p>
            </div>

            {/* Right: Realistic WhatsApp Chat Screen Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live WhatsApp Chat Preview</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready to Dispatch
                </span>
              </div>

              {/* Phone screen container */}
              <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs bg-[#efeae2] flex flex-col h-[230px]">
                {/* Simulated WhatsApp Header */}
                <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 border border-emerald-400 flex items-center justify-center text-xs font-bold text-white">
                      {transaction.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">
                        {transaction.customerName}
                      </div>
                      <div className="text-[9px] text-emerald-200 font-mono">
                        {cleanPhone ? `+${cleanPhone}` : 'No phone set'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-200">Online</div>
                </div>

                {/* Simulated Chat Area */}
                <div className="p-3 overflow-y-auto flex-1 flex flex-col justify-end space-y-2">
                  <div className="text-center">
                    <span className="bg-white/80 backdrop-blur-xs text-[9px] text-slate-600 px-2 py-0.5 rounded-full font-mono shadow-2xs">
                      TODAY
                    </span>
                  </div>

                  {/* Outgoing Message Bubble */}
                  <div className="self-end max-w-[90%] bg-[#d9fdd3] text-slate-900 rounded-xl rounded-tr-xs p-2.5 shadow-xs border border-emerald-100 text-xs">
                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed break-words">
                      {finalParsedMessage || (
                        <span className="text-slate-400 italic">
                          (Message is empty. Type or select a template.)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500 font-mono">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-sky-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Destination: <strong className="font-mono text-slate-700">{cleanPhone ? `https://wa.me/${cleanPhone}` : 'N/A'}</strong></span>
                <span className="text-emerald-600 font-semibold">{isValidPhone ? '✓ Phone Valid' : '⚠️ Missing Phone'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            {transaction.customerDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  snoozeReminder(transaction.id, 2);
                  alert(`Reminder for ${transaction.customerName} snoozed by 2 days.`);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Snooze reminder follow-up by 2 days"
              >
                Snooze 2 Days
              </button>
            )}

            {isDispatched && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dispatched to WhatsApp!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!isValidPhone}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                isValidPhone
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
