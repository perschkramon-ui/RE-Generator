import { useState, useEffect } from "react"
import { useStore, setStoreUid } from "./store"
import { useAuth } from "./context/AuthContext"
import { Login } from "./components/Login"
import { CompanySettings } from "./components/CompanySettings"
import { CustomerList } from "./components/CustomerList"
import { InvoiceList } from "./components/InvoiceList"
import { ProductList } from "./components/ProductList"
import { RecurringList } from "./components/RecurringList"
import { ProfileSwitcher, ProfileManager } from "./components/ProfileManager"
import { TeamManager } from "./components/TeamManager"
import { ApiKeyManager } from "./components/ApiKeyManager"
import { usePermissions } from "./hooks/usePermission"
import "./App.css"

type Tab = "invoices" | "customers" | "products" | "recurring" | "team" | "settings"

function App() {
  const [tab, setTab] = useState<Tab>("invoices")
  const [autoGenToast, setAutoGenToast] = useState<string | null>(null)
  const { recurringInvoices, generateDueInvoices, loadFromFirestore, isLoaded } = useStore()
  const { user, loading: authLoading, signOut, isOwner, ownerUid } = useAuth()
  const { can } = usePermissions()

  // Load Firestore data when user logs in (use ownerUid if team member)
  useEffect(() => {
    if (!user) return
    const dataUid = ownerUid ?? user.uid
    setStoreUid(dataUid)
    loadFromFirestore(dataUid).then(() => {
      const result = generateDueInvoices()
      if (result.generated > 0) {
        setAutoGenToast(
          `✓ ${result.generated} wiederkehrende ${result.generated === 1 ? "Rechnung" : "Rechnungen"} automatisch erstellt: ${result.invoiceNumbers.join(", ")}`
        )
        setTimeout(() => setAutoGenToast(null), 8000)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, ownerUid])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Lade …</div>
      </div>
    )
  }

  if (!user) return <Login />

  const today = new Date().toISOString().slice(0, 10)
  const dueBadge = recurringInvoices.filter((r) => r.active && r.nextDate <= today).length

  const ALL_TABS: { id: Tab; label: string; badge?: number; permission?: Parameters<typeof can>[0] }[] = [
    { id: "invoices",  label: "Rechnungen", permission: "invoices:read" },
    { id: "customers", label: "Kunden",     permission: "customers:read" },
    { id: "products",  label: "Leistungen", permission: "products:read" },
    { id: "recurring", label: "Abos",       badge: dueBadge, permission: "recurring:read" },
    { id: "team",      label: "Team",       permission: "team:read" },
    { id: "settings",  label: "Einstellungen", permission: "settings:read" },
  ]
  const TABS = ALL_TABS.filter((t) => !t.permission || can(t.permission))

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 text-lg tracking-tight">Rechnungsgenerator</span>
            {!isLoaded && <span className="text-xs text-gray-400">Lädt …</span>}
            <ProfileSwitcher />
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                Teammitglied
              </span>
            )}
            <button
              onClick={() => signOut()}
              className="text-xs text-gray-400 hover:text-gray-700"
              title={user.email ?? ''}
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === "invoices" && <InvoiceList />}
        {tab === "customers" && <CustomerList />}
        {tab === "products" && <ProductList />}
        {tab === "recurring" && <RecurringList />}
        {tab === "team" && <TeamManager />}
        {tab === "settings" && (
          <div className="space-y-10">
            <ProfileManager />
            <ApiKeyManager />
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Einstellungen — aktives Profil</h2>
              <CompanySettings />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        Pflichtangaben gem. §14 UStG &middot; DE / AT / CH
      </footer>

      {/* Auto-generation toast */}
      {autoGenToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 max-w-lg text-center">
          {autoGenToast}
        </div>
      )}
    </div>
  )
}

export default App
