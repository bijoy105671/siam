import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { OneEntryForm } from './components/entry/OneEntryForm';
import { TransactionList } from './components/transactions/TransactionList';
import { FlightCalendar } from './components/flights/FlightCalendar';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerLedgerModal } from './components/customers/CustomerLedgerModal';
import { VendorList } from './components/vendors/VendorList';
import { VendorLedgerModal } from './components/vendors/VendorLedgerModal';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { FundTransferModal } from './components/transfers/FundTransferModal';
import { ReminderManager } from './components/reminders/ReminderManager';
import { ReportsView } from './components/reports/ReportsView';
import { AdminSettings } from './components/admin/AdminSettings';
import { InvoiceModal } from './components/transactions/InvoiceModal';
import { PaymentModal } from './components/common/PaymentModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { LoginModal } from './components/auth/LoginModal';
import { SecurityOtpModal } from './components/auth/SecurityOtpModal';
import { InvoiceVerificationPage } from './components/verification/InvoiceVerificationPage';
import { Customer, Transaction, Vendor } from './types';
import { USE_SERVER_API } from './services/apiClient';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // URL QR Scan Verification State
  const [verificationParams, setVerificationParams] = useState<{
    invoiceNumber?: string;
    signature?: string;
    data?: string;
  } | null>(null);

  // Modals state
  const [activeInvoiceTx, setActiveInvoiceTx] = useState<Transaction | null>(null);
  const [activePayment, setActivePayment] = useState<{
    tx: Transaction;
    type: 'customer' | 'vendor';
  } | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Direct modal ledgers
  const [inspectCustomerId, setInspectCustomerId] = useState<string | null>(null);
  const [inspectVendorId, setInspectVendorId] = useState<string | null>(null);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to QR Code scan parameters in URL (?verify=INV-... or #verify...)
  useEffect(() => {
    const parseUrlVerifyParams = () => {
      try {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const verifyParam = params.get('verify') || params.get('invoice');
        const sigParam = params.get('sig') || params.get('signature');
        const dataParam = params.get('d') || params.get('data');

        if (verifyParam || dataParam) {
          setVerificationParams({
            invoiceNumber: verifyParam || undefined,
            signature: sigParam || undefined,
            data: dataParam || undefined,
          });
          return;
        }

        // Check hash URL (#verify?invoice=... or #/verify/...)
        if (window.location.hash.includes('verify')) {
          const hashParts = window.location.hash.split('?');
          if (hashParts[1]) {
            const hashParams = new URLSearchParams(hashParts[1]);
            const hVerify = hashParams.get('verify') || hashParams.get('invoice');
            if (hVerify || hashParams.get('d')) {
              setVerificationParams({
                invoiceNumber: hVerify || undefined,
                signature: hashParams.get('sig') || undefined,
                data: hashParams.get('d') || undefined,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error parsing verify params:', err);
      }
    };

    parseUrlVerifyParams();
    window.addEventListener('popstate', parseUrlVerifyParams);
    window.addEventListener('hashchange', parseUrlVerifyParams);
    return () => {
      window.removeEventListener('popstate', parseUrlVerifyParams);
      window.removeEventListener('hashchange', parseUrlVerifyParams);
    };
  }, []);

  const handleOpenPayment = (tx: Transaction, type: 'customer' | 'vendor') => {
    setActivePayment({ tx, type });
  };

  const handleSelectCustomerFromSearch = (cust: Customer) => {
    setInspectCustomerId(cust.id);
  };

  const handleSelectVendorFromSearch = (vend: Vendor) => {
    setInspectVendorId(vend.id);
  };

  if (USE_SERVER_API && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginModal isOpen={true} onClose={() => undefined} />
        </div>
      </div>
    );
  }

  // If direct QR code scan URL parameter is detected, show the public verification page directly
  if (verificationParams) {
    return (
      <InvoiceVerificationPage
        invoiceNumberFromUrl={verificationParams.invoiceNumber}
        signatureFromUrl={verificationParams.signature}
        dataFromUrl={verificationParams.data}
        onBackToApp={() => {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.pushState({}, '', cleanUrl);
          setVerificationParams(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenNewEntry={() => setCurrentView('new_entry')}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onNavigate={(view) => setCurrentView(view)}
      />

      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {currentView === 'dashboard' && (
            <Dashboard
              onOpenNewEntry={() => setCurrentView('new_entry')}
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onOpenExpense={() => setCurrentView('expenses')}
              onViewAllTransactions={() => setCurrentView('transactions')}
              onViewAllFlights={() => setCurrentView('flights')}
              onViewAllReminders={() => setCurrentView('reminders')}
              onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
              onOpenPayment={handleOpenPayment}
            />
          )}

          {currentView === 'new_entry' && (
            <OneEntryForm
              onClose={() => setCurrentView('dashboard')}
              onViewInvoice={(tx) => setActiveInvoiceTx(tx)}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionList
              onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
              onOpenNewEntry={() => setCurrentView('new_entry')}
              onOpenPayment={handleOpenPayment}
            />
          )}

          {currentView === 'flights' && (
            <FlightCalendar
              onSelectFlight={(tx) => setActiveInvoiceTx(tx)}
              onOpenPayment={handleOpenPayment}
            />
          )}

          {currentView === 'customers' && (
            <CustomerList
              onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
            />
          )}

          {currentView === 'vendors' && (
            <VendorList
              onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
            />
          )}

          {currentView === 'expenses' && <ExpenseManager />}

          {currentView === 'transfers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Internal Fund Transfers
                  </h1>
                  <p className="text-xs text-slate-500">
                    Execute cash, bKash, and bank liquidity balance transfers
                  </p>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  New Transfer
                </button>
              </div>
              <FundTransferModal onClose={() => setCurrentView('dashboard')} />
            </div>
          )}

          {currentView === 'reminders' && (
            <ReminderManager
              onOpenPayment={handleOpenPayment}
              onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
            />
          )}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'admin' && <AdminSettings defaultTab="business" />}

          {currentView === 'audit' && <AdminSettings defaultTab="audit" />}

          {currentView === 'backup' && <AdminSettings defaultTab="backup" />}

          {currentView === 'verify_portal' && (
            <InvoiceVerificationPage onBackToApp={() => setCurrentView('dashboard')} />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Invoice Modal */}
      {activeInvoiceTx && (
        <InvoiceModal
          transaction={activeInvoiceTx}
          onClose={() => setActiveInvoiceTx(null)}
          onOpenPayment={(tx) => handleOpenPayment(tx, 'customer')}
          onOpenVerification={(invNum, fullUrl) => {
            try {
              const u = new URL(fullUrl);
              const params = new URLSearchParams(u.search);
              setVerificationParams({
                invoiceNumber: invNum,
                signature: params.get('sig') || undefined,
                data: params.get('d') || undefined,
              });
              window.history.pushState({}, '', fullUrl);
            } catch {
              setVerificationParams({ invoiceNumber: invNum });
            }
            setActiveInvoiceTx(null);
          }}
        />
      )}

      {/* 2. Partial Payment Modal */}
      {activePayment && (
        <PaymentModal
          transaction={activePayment.tx}
          paymentType={activePayment.type}
          onClose={() => setActivePayment(null)}
        />
      )}

      {/* 3. Fund Transfer Modal */}
      {isTransferModalOpen && (
        <FundTransferModal onClose={() => setIsTransferModalOpen(false)} />
      )}

      {/* 4. Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
        onSelectCustomer={handleSelectCustomerFromSearch}
        onSelectVendor={handleSelectVendorFromSearch}
      />

      {/* 5. Direct Customer Ledger Modal (from search or link) */}
      {inspectCustomerId && (
        <CustomerLedgerModal
          customerId={inspectCustomerId}
          onClose={() => setInspectCustomerId(null)}
          onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
        />
      )}

      {/* 6. Direct Vendor Ledger Modal (from search or link) */}
      {inspectVendorId && (
        <VendorLedgerModal
          vendorId={inspectVendorId}
          onClose={() => setInspectVendorId(null)}
          onSelectTransaction={(tx) => setActiveInvoiceTx(tx)}
        />
      )}

      {/* 7. Admin security OTP modal — stays visible while the original action waits */}
      <SecurityOtpModal />

      {/* 8. Login / Switch Account Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
