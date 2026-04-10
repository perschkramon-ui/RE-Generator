import { useState } from "react"
import { CompanySettings } from "./components/CompanySettings"
import { CustomerList } from "./components/CustomerList"
import { InvoiceList } from "./components/InvoiceList"
import "./App.css"

type Tab = "invoices" | "customers" | "settings"

const TABS: { id: Tab; label: string }[] = [
  { id: "invoices", label: "Rechnungen" },
  { id: "customers", label: "Kunden" },
  { id: "settings", label: "Einstellungen" },
]

function App() {
  const [tab, setTab] = useState<Tab>("invoices")

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-bold text-gray-900 text-lg tracking-tight">Rechnungsgenerator</span>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === "invoices" && <InvoiceList />}
        {tab === "customers" && <CustomerList />}
        {tab === "settings" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Firmeneinstellungen</h2>
            <CompanySettings />
          </div>
        )}
      </main>
      <footer className="text-center text-xs text-gray-400 py-6">
        Pflichtangaben gem. §14 UStG · DE / AT / CH
      </footer>
    </div>
  )
}

export default App