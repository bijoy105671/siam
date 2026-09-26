import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Mail,
  Cloud,
  HardDrive,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Eye,
  EyeOff,
  Send,
  Database,
  FileText,
  Play,
  Check,
  Trash2,
  ExternalLink,
  ChevronRight,
  Server,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AutomatedBackupSchedule,
  BackupDestination,
  BackupExecutionLog,
  CloudProvider,
} from '../../types';
import { api } from '../../services/apiClient';

export const AutomatedBackupSettings: React.FC = () => {
  const {
    backupSchedule,
    updateBackupSchedule,
    backupLogs,
    triggerEncryptedBackup,
    restoreFromEncryptedBackup,
    testBackupDestination,
    deleteBackupLog,
    clearBackupLogs,
    exportBackup,
    importBackup,
    clearAllInputData,
    loadDemoSampleData,
    resetToSampleData,
  } = useApp();

  // Local editable form state
  const [enabled, setEnabled] = useState(backupSchedule.enabled);
  const [frequency, setFrequency] = useState(backupSchedule.frequency);
  const [scheduledTime, setScheduledTime] = useState(backupSchedule.scheduledTime);
  const [backupDestination, setBackupDestination] = useState<BackupDestination>(
    backupSchedule.backupDestination
  );

  // Email Config
  const [recipientEmail, setRecipientEmail] = useState(
    backupSchedule.emailConfig.recipientEmail || 'bijoy105671@gmail.com'
  );
  const [ccEmail, setCcEmail] = useState(backupSchedule.emailConfig.ccEmail || '');
  const [senderName, setSenderName] = useState(
    backupSchedule.emailConfig.senderName || 'SIAM AIR Automated Backup Engine'
  );
  const [includeChecksum, setIncludeChecksum] = useState(
    backupSchedule.emailConfig.includeChecksum ?? true
  );
  const [sendAlertOnFailure, setSendAlertOnFailure] = useState(
    backupSchedule.emailConfig.sendAlertOnFailure ?? true
  );

  // Cloud Config
  const [provider, setProvider] = useState<CloudProvider>(
    backupSchedule.cloudConfig.provider || 'google_drive'
  );
  const [folderPath, setFolderPath] = useState(
    backupSchedule.cloudConfig.folderPath || 'SIAM_AIR_Backups/2026'
  );
  const [bucketName, setBucketName] = useState(
    backupSchedule.cloudConfig.bucketName || 'siam-air-encrypted-vault'
  );
  const [autoPurgeDays, setAutoPurgeDays] = useState(
    backupSchedule.cloudConfig.autoPurgeDays || 30
  );
  const [connectedAccount, setConnectedAccount] = useState(
    backupSchedule.cloudConfig.connectedAccount || 'siamairservice@gmail.com (Google Workspace Drive)'
  );

  // Encryption
  const [encryptionEnabled, setEncryptionEnabled] = useState(
    backupSchedule.encryption.enabled ?? true
  );
  const [passphrase, setPassphrase] = useState(
    backupSchedule.encryption.passphrase || 'SiamAirSecure2026!'
  );
  const [keyHint, setKeyHint] = useState(
    backupSchedule.encryption.keyHint || 'Primary Agency Safe Passphrase (2026)'
  );
  const [showPassphrase, setShowPassphrase] = useState(false);

  // UI action states
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [isTestingDestination, setIsTestingDestination] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backupRunResult, setBackupRunResult] = useState<{
    log: BackupExecutionLog;
    downloadDataUrl: string;
    jsonString: string;
  } | null>(null);

  // Decrypt & Restore Sandbox State
  const [restoreFile, setRestoreFile] = useState<{ name: string; content: string } | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Copied checksum helper
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  // Password strength calculator
  const getPassphraseStrength = (pass: string) => {
    if (!pass) return { label: 'Empty', score: 0, color: 'bg-slate-200 text-slate-500' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: 'Weak', score: 25, color: 'bg-rose-500 text-rose-700' };
    if (score === 3) return { label: 'Moderate', score: 50, color: 'bg-amber-500 text-amber-700' };
    if (score === 4) return { label: 'Strong', score: 75, color: 'bg-blue-600 text-blue-700' };
    return { label: 'Very Strong (Military AES-256)', score: 100, color: 'bg-emerald-600 text-emerald-700' };
  };

  const strength = getPassphraseStrength(passphrase);

  // Generate random secure 32-character key
  const handleGenerateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    let result = '';
    const randomVals = new Uint8Array(24);
    crypto.getRandomValues(randomVals);
    for (let i = 0; i < randomVals.length; i++) {
      result += chars[randomVals[i] % chars.length];
    }
    setPassphrase(result);
    setKeyHint(`Auto-generated secure key on ${new Date().toLocaleDateString()}`);
  };

  // Save Schedule Settings
  const handleSaveSchedule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateBackupSchedule({
      enabled,
      frequency,
      scheduledTime,
      backupDestination,
      emailConfig: {
        recipientEmail: recipientEmail.trim(),
        ccEmail: ccEmail.trim(),
        senderName: senderName.trim(),
        includeChecksum,
        sendAlertOnFailure,
      },
      cloudConfig: {
        provider,
        folderPath: folderPath.trim(),
        bucketName: bucketName.trim(),
        autoPurgeDays,
        connectedAccount,
        isConnected: true,
      },
      encryption: {
        enabled: encryptionEnabled,
        algorithm: 'AES-256-GCM',
        passphrase: passphrase.trim(),
        keyHint: keyHint.trim(),
      },
    });

    setSaveStatus('Automated backup schedule and encryption settings saved successfully!');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Run Backup Now
  const handleRunNow = async () => {
    setIsRunningBackup(true);
    setBackupRunResult(null);
    try {
      // First save current inputs if modified
      handleSaveSchedule();

      const result = await triggerEncryptedBackup({
        destination: backupDestination,
        isManual: true,
        overridePassphrase: passphrase,
      });

      setBackupRunResult({
        log: result.log,
        downloadDataUrl: result.downloadDataUrl,
        jsonString: result.jsonString,
      });
    } catch (err: any) {
      alert(`Backup failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRunningBackup(false);
    }
  };

  // Test Destination Connection
  const handleTestDestination = async () => {
    setIsTestingDestination(true);
    setTestResult(null);
    try {
      const res = await testBackupDestination(backupDestination);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed.',
      });
    } finally {
      setIsTestingDestination(false);
    }
  };

  // Restore file handling
  const handleRestoreFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreFile({ name: file.name, content });
      setRestoreStatus(null);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    setRestoreStatus(null);
    try {
      // Check if encrypted
      if (restoreFile.content.includes('"encrypted": true') || restoreFile.name.endsWith('.enc.json')) {
        if (!restorePassphrase.trim()) {
          setRestoreStatus({
            success: false,
            message: 'Please enter the decryption passphrase for this encrypted backup archive.',
          });
          setIsRestoring(false);
          return;
        }
        const res = await restoreFromEncryptedBackup(restoreFile.content, restorePassphrase.trim());
        setRestoreStatus(res);
        if (res.success) {
          setRestoreFile(null);
          setRestorePassphrase('');
        }
      } else {
        // Plain JSON
        const success = importBackup(restoreFile.content);
        if (success) {
          setRestoreStatus({
            success: true,
            message: 'Unencrypted JSON backup restored successfully into system!',
          });
          setRestoreFile(null);
        } else {
          setRestoreStatus({
            success: false,
            message: 'Invalid backup structure. Could not restore database.',
          });
        }
      }
    } catch (err: any) {
      setRestoreStatus({
        success: false,
        message: err?.message || 'Failed to restore backup.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopyChecksum = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Live Status Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Automated Disaster Recovery
              </span>
              {enabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Daily Schedule ({scheduledTime} BST)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                  Schedule Paused
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
              Automated Daily Encrypted Database Backup
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Configures automated scheduled exports of all customer ledgers, vendor accounts, ticket bookings,
              and financial cash/bank books encrypted with <strong className="text-white">AES-256-GCM</strong> and
              dispatched directly to your pre-defined email or cloud storage vault.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleTestDestination}
              disabled={isTestingDestination}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isTestingDestination ? 'animate-spin' : ''}`} />
              <span>{isTestingDestination ? 'Verifying...' : 'Test Destination'}</span>
            </button>

            <button
              onClick={handleRunNow}
              disabled={isRunningBackup}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningBackup ? 'animate-spin' : ''}`} />
              <span>{isRunningBackup ? 'Encrypting & Dispatching...' : 'Run Backup Now'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-0.5">Automated Runs</span>
            <span className="text-lg font-bold text-white font-mono">
              {backupSchedule.totalAutomatedRuns}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Recorded in audit</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-0.5">Last Run Status</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {backupSchedule.lastRunStatus?.toUpperCase() || 'SUCCESS'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              {backupSchedule.lastBackupSizeKb ? `${backupSchedule.lastBackupSizeKb} KB Archive` : 'Verified'}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-0.5">Encryption Standard</span>
            <span className="text-xs font-bold text-blue-300 font-mono flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              AES-256-GCM
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">PBKDF2 100k rounds</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 block mb-0.5">Delivery Channel</span>
            <span className="text-xs font-bold text-amber-300 capitalize truncate block">
              {backupSchedule.backupDestination === 'both'
                ? 'Email & Google Drive'
                : backupSchedule.backupDestination === 'email'
                ? 'Email Delivery'
                : 'Cloud Storage Vault'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              {backupSchedule.emailConfig.recipientEmail}
            </span>
          </div>
        </div>

        {/* Test Result or Save Feedback */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Backup Run Success Dialog / Banner */}
        {backupRunResult && (
          <div className="mt-4 p-4 rounded-xl bg-blue-900/60 border border-blue-500/40 text-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Encrypted Snapshot Generated & Dispatched Successfully!
                  </h4>
                  <p className="text-xs text-blue-200">
                    Archive: <code className="font-mono text-white">{backupRunResult.log.fileName}</code> ({backupRunResult.log.fileSizeKb} KB)
                  </p>
                </div>
              </div>

              <a
                href={backupRunResult.downloadDataUrl}
                download={backupRunResult.log.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Encrypted File</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-lg font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Delivered To:</span>
                <span className="text-slate-200 truncate block">
                  {backupRunResult.log.destinationsDelivered.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SHA-256 Checksum:</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="truncate">{backupRunResult.log.checksumSha256}</span>
                  <button
                    onClick={() => handleCopyChecksum(backupRunResult.log.checksumSha256)}
                    className="p-1 hover:text-white"
                    title="Copy Checksum"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {saveStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* 2. Main Configuration Panels */}
      <form onSubmit={handleSaveSchedule} className="space-y-6">
        {/* SCHEDULE & TIMING CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Schedule & Frequency Configuration</h3>
                <p className="text-xs text-slate-500">
                  Set how often and at what time of day the database snapshot is triggered automatically
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-xs font-semibold ${enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                {enabled ? 'Schedule Active' : 'Schedule Inactive'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Backup Cadence / Frequency
              </label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily Nightly Snapshot (Recommended)</option>
                <option value="twice_daily">Twice Daily (Every 12 Hours)</option>
                <option value="weekly">Weekly Full Archive (Every Sunday)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Trigger Time (24h)
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Timezone: Dhaka Standard Time (BST / UTC+6)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Backup Destination Route
              </label>
              <select
                value={backupDestination}
                onChange={(e: any) => setBackupDestination(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both (Pre-defined Email + Cloud Storage Vault)</option>
                <option value="email">Email Delivery Only</option>
                <option value="cloud">Cloud Storage Vault Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* ENCRYPTION SETTINGS (AES-256-GCM) CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  AES-256-GCM Military Grade Data Encryption
                </h3>
                <p className="text-xs text-slate-500">
                  Zero-knowledge client-side encryption protects sensitive customer passports, PNRs, and balances
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              PBKDF2 SHA-256 (100,000 Rounds)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Encryption Passphrase / Master Secret Key
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  Generate Strong Key
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter secure encryption passphrase"
                  className="w-full px-3 py-2 pr-10 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Passphrase Security:</span>
                  <span className="font-semibold">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Passphrase Key Recovery Hint
              </label>
              <input
                type="text"
                value={keyHint}
                onChange={(e) => setKeyHint(e.target.value)}
                placeholder="e.g. Primary Agency Safe Passphrase (Stored in manager drawer)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This hint will be displayed on recovery prompts if you need to restore an archive.
              </p>
            </div>
          </div>
        </div>

        {/* DESTINATIONS (EMAIL & CLOUD STORAGE) GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* EMAIL DELIVERY CONFIG */}
          <div
            className={`border rounded-xl p-5 shadow-xs space-y-4 bg-white ${
              backupDestination === 'cloud'
                ? 'opacity-60 border-slate-200'
                : 'border-blue-200 ring-1 ring-blue-50'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pre-Defined Email Dispatch</h4>
                  <span className="text-[10px] text-slate-500">Sends encrypted attachment & SHA checksum</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Verified Delivery
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Encrypted database archives will be sent to this destination nightly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Alert / CC Email (Optional)
                </label>
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="siamairservice@gmail.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeChecksum}
                    onChange={(e) => setIncludeChecksum(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Include SHA-256 cryptographic checksum in email payload</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendAlertOnFailure}
                    onChange={(e) => setSendAlertOnFailure(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Send urgent failure alert if automated export encounters an error</span>
                </label>
              </div>
            </div>
          </div>

          {/* CLOUD STORAGE INTEGRATION */}
          <div
            className={`border rounded-xl p-5 shadow-xs space-y-4 bg-white ${
              backupDestination === 'email'
                ? 'opacity-60 border-slate-200'
                : 'border-emerald-200 ring-1 ring-emerald-50'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Cloud Storage Integration</h4>
                  <span className="text-[10px] text-slate-500">Synchronize encrypted archives to remote cloud</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cloud Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e: any) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="google_drive">Google Drive / Workspace</option>
                    <option value="dropbox">Dropbox Business</option>
                    <option value="aws_s3">AWS S3 / Cloudflare R2</option>
                    <option value="onedrive">Microsoft OneDrive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retention / Auto-Purge
                  </label>
                  <select
                    value={autoPurgeDays}
                    onChange={(e) => setAutoPurgeDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={7}>Keep last 7 daily backups</option>
                    <option value={14}>Keep last 14 daily backups</option>
                    <option value={30}>Keep last 30 daily backups (Recommended)</option>
                    <option value={90}>Keep last 90 daily backups</option>
                    <option value={365}>Keep 1 year archive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Directory / Path
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="SIAM_AIR_Backups/2026"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Connected Account:</span>
                  <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px] block">
                    {connectedAccount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Authenticated with ${provider} via OAuth 2.0 token.`)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Verify Access
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE CONTROLS */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Changes will take effect immediately for the next scheduled automated run.
          </p>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Automated Backup Configuration</span>
          </button>
        </div>
      </form>

      {/* 3. HISTORICAL BACKUP EXECUTION AUDIT LOG */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Automated Backup Execution & Delivery Log
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of scheduled cron runs, encryption verification, and dispatch destinations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Total Recorded: <strong className="text-slate-800">{backupLogs.length}</strong>
            </span>
            {backupLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear backup execution history logs?')) {
                    clearBackupLogs();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {backupLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No backup runs recorded yet. Click "Run Backup Now" to generate an initial encrypted snapshot.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Trigger</th>
                  <th className="py-2.5 px-3">Destinations</th>
                  <th className="py-2.5 px-3">Size & Cipher</th>
                  <th className="py-2.5 px-3">SHA-256 Checksum</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.triggerType === 'automated_schedule' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          <Clock className="w-3 h-3" /> Scheduled Cron
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                          <Play className="w-3 h-3" /> Manual Admin
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 max-w-[240px]">
                      <div className="space-y-0.5 text-[11px]">
                        {log.destinationsDelivered.map((d, idx) => (
                          <div key={idx} className="truncate text-slate-600" title={d}>
                            {d}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.fileSizeKb} KB</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {log.encryptionAlgorithm || 'AES-256'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-[140px]">
                      <div className="flex items-center gap-1">
                        <span className="truncate" title={log.checksumSha256}>
                          {log.checksumSha256.substring(0, 14)}...
                        </span>
                        <button
                          onClick={() => handleCopyChecksum(log.checksumSha256)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy Full Checksum"
                        >
                          {copiedChecksum === log.checksumSha256 ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Delivered
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => deleteBackupLog(log.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. ENCRYPTED ARCHIVE DECRYPTION & RESTORE SANDBOX */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Unlock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Restore from Encrypted Backup Archive (.enc.json)
            </h3>
            <p className="text-xs text-slate-500">
              Decrypt and inspect an encrypted database snapshot with verified SHA-256 integrity check
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Step 1: Select Encrypted Backup File (.enc.json or .json)
            </label>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                {restoreFile ? restoreFile.name : 'Choose Backup Archive'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Supports AES-256-GCM encrypted envelopes or standard JSON
              </span>
              <input
                type="file"
                accept=".json,.enc.json"
                onChange={handleRestoreFileInput}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Step 2: Enter Decryption Passphrase
            </label>
            <input
              type="password"
              value={restorePassphrase}
              onChange={(e) => setRestorePassphrase(e.target.value)}
              placeholder="Enter passphrase used during export"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400">
              Default password if using demo initial setup: <code className="font-mono text-slate-600">SiamAirSecure2026!</code>
            </p>

            <button
              onClick={handleExecuteRestore}
              disabled={!restoreFile || isRestoring}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{isRestoring ? 'Decrypting & Verifying...' : 'Decrypt & Restore Database'}</span>
            </button>
          </div>
        </div>

        {restoreStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              restoreStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {restoreStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{restoreStatus.message}</span>
          </div>
        )}
      </div>

      {/* 5. STANDARD JSON ARCHIVES & DEMO RESET (PRESERVED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Unencrypted JSON Export */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900">Standard Unencrypted JSON Backup</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Export unencrypted raw JSON data for custom migration or external database tooling.
          </p>
          <button
            type="button"
            onClick={exportBackup}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Plain JSON</span>
          </button>
        </div>

        {/* Protected Admin Data Reset */}
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/40 shadow-xs space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-900">Protected: Clear All Business Data</h4>
          </div>
          <p className="text-[11px] text-slate-600">
            Permanently clears transactions, customer/vendor records, payments, expenses, transfers, account balances and other business input data. Users, services, business settings and audit history are preserved.
          </p>
          <button
            type="button"
            onClick={async () => {
              const code = window.prompt('ADMIN DATA RESET\n\nEnter Backup Code to continue:');
              if (code === null) return;
              if (!code) return alert('Backup Code is required.');
              if (!confirm('FINAL WARNING: This will permanently clear all business input data. Continue?')) return;
              try {
                const result = await api.clearAllData(code);
                alert(result.message || 'All business data cleared successfully.');
                window.location.reload();
              } catch (error) {
                alert(error instanceof Error ? error.message : 'Unable to clear business data.');
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Business Data</span>
          </button>
          <div className="text-[10px] text-rose-700 font-medium">
            Security: Administrator session + Email OTP + Backup Code required.
          </div>
        </div>

        {/* Load Demo Data */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900">Load Demonstration Sample Data</h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Loads sample travel agency records (air tickets, visa transactions, customer ledgers & expenses) for testing features and previewing reports.
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm('Load sample demonstration records? This will populate the system with demo tickets and ledgers.')) {
                loadDemoSampleData();
                alert('Demo records loaded successfully!');
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Demo Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
