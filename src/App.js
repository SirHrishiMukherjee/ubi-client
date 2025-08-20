import React, { useMemo, useState, useEffect } from "react";

// UBI Client App (MVP)
// - TailwindCSS styling (no import needed in Canvas)
// - Single-file React for quick preview/iteration
// - Mock data + localStorage persistence
// - Flows: Dashboard, Apply, Payments, Wallet, Documents, Support, Settings
// - Includes an Application Wizard, simple filters, CSV export, and scenario simulator

// ---------- Utilities ----------
const fmtCurrency = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const maskAcct = (s = "") => (s ? `•••• ${String(s).slice(-4)}` : "—");
const cls = (...xs) => xs.filter(Boolean).join(" ");

// ---------- Seed / Defaults ----------
const seedUser = {
  id: "user_001",
  name: "Alex Rivera",
  email: "alex@example.com",
  phone: "+1 (555) 010-2048",
  residency: "Toronto, ON",
  dob: "1992-03-12",
  preferredPayoutDay: 15,
  comms: { email: true, sms: true, push: true },
};

const seedProgram = {
  benefitAmountMonthly: 1200,
  nextCycleDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString(),
  status: "Not Applied", // Not Applied | Draft | Pending | Approved | On Hold | Denied
  statusReason: "",
  application: null,
};

const seedPayments = [
  { id: "p_001", date: "2025-05-15", amount: 1200, status: "Paid", method: "ACH", ref: "TRX-7A2F" },
  { id: "p_002", date: "2025-06-15", amount: 1200, status: "Paid", method: "ACH", ref: "TRX-802C" },
  { id: "p_003", date: "2025-07-15", amount: 1200, status: "Paid", method: "ACH", ref: "TRX-90BD" },
];

const seedWallet = { method: "ACH", accountLast4: "4321", institution: "Northbank" };
const seedDocs = [
  { id: "d_001", name: "Government ID (front).png", type: "ID", uploadedAt: "2025-06-02T14:20:00Z", status: "Verified" },
  { id: "d_002", name: "Proof of Address.pdf", type: "Address", uploadedAt: "2025-06-03T10:05:00Z", status: "Verified" },
];

// ---------- Local Storage ----------
const LS_KEY = "ubi_client_state_v1";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (s) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
};

// ---------- Icons (inline SVG, lightweight) ----------
const Icon = ({ name, className = "w-5 h-5" }) => {
  const common = "stroke-current";
  switch (name) {
    case "home":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M3 10.5 12 3l9 7.5v8.25A1.25 1.25 0 0 1 19.75 20H4.25A1.25 1.25 0 0 1 3 18.75z"/><path strokeWidth="1.5" d="M9 20v-6h6v6"/></svg>);
    case "apply":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M4.5 5.5h15M4.5 12h15M4.5 18.5h9"/></svg>);
    case "wallet":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="1.5"/><circle cx="16.5" cy="12" r="1.25"/></svg>);
    case "payments":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M4 7h16M4 12h8M4 17h6"/></svg>);
    case "docs":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path strokeWidth="1.5" d="M14 3v5h5"/></svg>);
    case "support":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path strokeWidth="1.5" d="M8.5 9.75C9 8 10.3 7 12 7c1.9 0 3 1.2 3 2.6 0 2.3-3 2.1-3 4.4"/><circle cx="12" cy="17" r=".9" fill="currentColor"/></svg>);
    case "settings":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="m4 14 2 .5a6 6 0 0 0 12 0l2-.5-1-4 1-4-2-.5a6 6 0 0 0-12 0L4 6l1 4z"/></svg>);
    case "download":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M4 21h16"/></svg>);
    case "check":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><path strokeWidth="1.5" d="m5 12 4 4 10-10"/></svg>);
    case "pending":
      return (<svg className={cls(className, common)} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path strokeWidth="1.5" d="M12 7v6l4 2"/></svg>);
    default:
      return null;
  }
};

// ---------- Tag/Bubble ----------
const Tag = ({ tone = "default", children }) => {
  const map = {
    default: "bg-slate-700/50 text-slate-200 border border-slate-600/50",
    good: "bg-emerald-600/20 text-emerald-200 border border-emerald-500/30",
    warn: "bg-amber-600/20 text-amber-200 border border-amber-500/30",
    bad: "bg-rose-600/20 text-rose-200 border border-rose-500/30",
    info: "bg-sky-600/20 text-sky-200 border border-sky-500/30",
  };
  return <span className={cls("px-2 py-0.5 rounded-full text-xs", map[tone] || map.default)}>{children}</span>;
};

// ---------- Section Card ----------
const Card = ({ title, actions, children, className }) => (
  <section className={cls("bg-slate-900/60 rounded-2xl shadow-xl border border-slate-700/50", className)}>
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <h3 className="font-semibold tracking-wide text-slate-100">{title}</h3>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
    <div className="px-5 pb-5">{children}</div>
  </section>
);

// ---------- Storage-backed State Hook ----------
const usePersistentState = (key, initial) => {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    return loaded?.[key] ?? initial;
  });
  useEffect(() => {
    const curr = loadState() || {};
    curr[key] = state;
    saveState(curr);
  }, [key, state]);
  return [state, setState];
};

// ---------- Application Wizard ----------
const WizardStep = ({ idx, title, active, done }) => (
  <div className="flex items-center gap-3">
    <div className={cls("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", active ? "bg-sky-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-200")}>{idx}</div>
    <div className={cls("text-sm", active ? "text-sky-300" : done ? "text-emerald-300" : "text-slate-300")}>{title}</div>
  </div>
);

const ApplicationWizard = ({ program, setProgram, wallet, docs }) => {
  const [step, setStep] = useState(0);
  const steps = ["Identity", "Residency", "Income", "Banking", "Review & Submit"];
  const [draft, setDraft] = useState(() => program.application || {
    identity: { firstName: "Alex", lastName: "Rivera", ssn: "***-**-1234" },
    residency: { address1: "101 King St W", city: "Toronto", province: "ON", postal: "M5H 1J9", years: 3 },
    income: { annual: 18000, householdSize: 1, otherBenefits: false },
    banking: { method: wallet?.method || "ACH", last4: wallet?.accountLast4 || "4321" },
    acknowledgements: { truthful: false, notifyChanges: false },
  });

  const canSubmit = useMemo(() => draft?.acknowledgements?.truthful && draft?.acknowledgements?.notifyChanges, [draft]);

  const submit = () => {
    const updated = {
      ...program,
      status: "Pending",
      statusReason: "Your application is under review.",
      application: { ...draft, submittedAt: new Date().toISOString(), docs },
    };
    setProgram(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card title="Steps" className="md:col-span-2">
          <div className="space-y-4">
            {steps.map((t, i) => (
              <div key={t} className="flex items-center gap-2">
                <WizardStep idx={i + 1} title={t} active={i === step} done={i < step} />
                {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-700/60" />}
              </div>
            ))}
          </div>
        </Card>
        <Card title={steps[step]} className="md:col-span-3" actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100 disabled:opacity-40" disabled={step===0}>Back</button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">Next</button>
            ) : (
              <button onClick={submit} disabled={!canSubmit} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 flex items-center gap-2"><Icon name="check"/>Submit</button>
            )}
          </div>
        }>
          {/* Step Content */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First name" value={draft.identity.firstName} onChange={(v) => setDraft({ ...draft, identity: { ...draft.identity, firstName: v } })} />
                <Input label="Last name" value={draft.identity.lastName} onChange={(v) => setDraft({ ...draft, identity: { ...draft.identity, lastName: v } })} />
                <Input label="SSN / SIN (masked)" value={draft.identity.ssn} onChange={(v) => setDraft({ ...draft, identity: { ...draft.identity, ssn: v } })} />
                <Input label="Date of birth" type="date" value={seedUser.dob} disabled />
              </div>
              <Note>We only store the masked identifier. Full numbers are never persisted.</Note>
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Address line 1" value={draft.residency.address1} onChange={(v) => setDraft({ ...draft, residency: { ...draft.residency, address1: v } })} />
              <Input label="City" value={draft.residency.city} onChange={(v) => setDraft({ ...draft, residency: { ...draft.residency, city: v } })} />
              <Input label="Province/State" value={draft.residency.province} onChange={(v) => setDraft({ ...draft, residency: { ...draft.residency, province: v } })} />
              <Input label="Postal/ZIP" value={draft.residency.postal} onChange={(v) => setDraft({ ...draft, residency: { ...draft.residency, postal: v } })} />
              <Input label="Years at address" type="number" value={draft.residency.years} onChange={(v) => setDraft({ ...draft, residency: { ...draft.residency, years: Number(v) } })} />
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Annual income (pre-tax)" type="number" value={draft.income.annual} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, annual: Number(v) } })} prefix="$" />
              <Input label="Household size" type="number" value={draft.income.householdSize} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, householdSize: Number(v) } })} />
              <Switch label="Currently receiving other benefits" checked={draft.income.otherBenefits} onChange={(v) => setDraft({ ...draft, income: { ...draft.income, otherBenefits: v } })} />
            </div>
          )}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Deposit method" value={draft.banking.method} onChange={(v) => setDraft({ ...draft, banking: { ...draft.banking, method: v } })} options={["ACH", "PayCard", "eWallet"]} />
              <Input label="Account last 4" value={draft.banking.last4} onChange={(v) => setDraft({ ...draft, banking: { ...draft.banking, last4: v } })} />
              <Note>We never store full account numbers. Banking info is tokenized via a payment processor.</Note>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-slate-300 text-sm">Please review the details below. You can go back to make changes.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <SummaryItem k="Name" v={`${draft.identity.firstName} ${draft.identity.lastName}`} />
                <SummaryItem k="Masked ID" v={draft.identity.ssn} />
                <SummaryItem k="Address" v={`${draft.residency.address1}, ${draft.residency.city} ${draft.residency.province} ${draft.residency.postal}`} />
                <SummaryItem k="Income" v={fmtCurrency(draft.income.annual)} />
                <SummaryItem k="Household size" v={draft.income.householdSize} />
                <SummaryItem k="Other benefits" v={draft.income.otherBenefits ? "Yes" : "No"} />
                <SummaryItem k="Deposit" v={`${draft.banking.method} • ${maskAcct(draft.banking.last4)}`} />
                <SummaryItem k="Documents" v={`${(docs||[]).length} uploaded`} />
              </div>
              <div className="pt-2 space-y-2">
                <Switch label="I certify the information provided is true and complete." checked={draft.acknowledgements.truthful} onChange={(v) => setDraft({ ...draft, acknowledgements: { ...draft.acknowledgements, truthful: v } })} />
                <Switch label="I will promptly notify the program if my circumstances change." checked={draft.acknowledgements.notifyChanges} onChange={(v) => setDraft({ ...draft, acknowledgements: { ...draft.acknowledgements, notifyChanges: v } })} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const SummaryItem = ({ k, v }) => (
  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 flex items-center justify-between">
    <div className="text-slate-400">{k}</div>
    <div className="text-slate-100 font-medium ml-4 text-right">{v}</div>
  </div>
);

// ---------- Basic Inputs ----------
const Input = ({ label, value, onChange, type = "text", disabled=false, prefix }) => (
  <label className={cls("block", disabled && "opacity-60") }>
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</span>}
      <input disabled={disabled} type={type} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} className={cls("w-full rounded-xl bg-slate-800/70 border border-slate-700/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/60", prefix && "pl-7")} />
    </div>
  </label>
);

const Switch = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 select-none">
    <button type="button" onClick={() => onChange?.(!checked)} className={cls("w-11 h-6 rounded-full relative transition-colors", checked ? "bg-emerald-500/70" : "bg-slate-600/60")}>
      <span className={cls("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "")} />
    </button>
    <span className="text-sm text-slate-200">{label}</span>
  </label>
);

const Select = ({ label, value, onChange, options = [] }) => (
  <label className="block">
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <select value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full rounded-xl bg-slate-800/70 border border-slate-700/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/60">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const Note = ({ children }) => (
  <div className="text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">{children}</div>
);

// ---------- Pages ----------
const Dashboard = ({ program, payments, programCfg, simulateSet, onDownloadLetter }) => {
  const nextPayment = useMemo(() => {
    const last = payments[payments.length - 1];
    const d = new Date(programCfg.nextCycleDate);
    if (last) {
      const lastDate = new Date(last.date);
      if (d <= lastDate) {
        d.setMonth(lastDate.getMonth() + 1);
      }
    }
    return d;
  }, [payments, programCfg.nextCycleDate]);

  const statusTone = program.status === "Approved" ? "good" : program.status === "Pending" ? "warn" : program.status === "On Hold" ? "bad" : "default";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Program status" actions={
        <div className="flex items-center gap-2">
          <Select label="Scenario" value={program.status} onChange={(v)=>simulateSet(v)} options={["Not Applied","Draft","Pending","Approved","On Hold","Denied"]} />
        </div>
      } className="lg:col-span-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Tag tone={statusTone}>{program.status}</Tag>
              <span className="text-slate-300 text-sm">{program.statusReason || "Start your application to check eligibility."}</span>
            </div>
            <div className="text-slate-400 text-sm">Monthly benefit (if eligible): <span className="text-slate-100 font-medium">{fmtCurrency(programCfg.benefitAmountMonthly)}</span></div>
          </div>
          {program.status === "Approved" && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-slate-400 text-xs">Next payment</div>
                <div className="text-slate-100 font-semibold">{fmtDate(nextPayment)}</div>
              </div>
              <button onClick={onDownloadLetter} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-2"><Icon name="download"/> Eligibility letter</button>
            </div>
          )}
        </div>
      </Card>

      <Card title="Recent activity">
        <ol className="space-y-3 text-sm text-slate-300">
          {[
            program.status === "Approved" && `Eligible for UBI • ${fmtDate(new Date())}`,
            program.status === "Pending" && `Application received • ${fmtDate(new Date())}`,
            `Profile updated • ${fmtDate(new Date(Date.now()-86400000))}`,
          ].filter(Boolean).map((t,i)=>(<li key={i} className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-sky-400"/><span>{t}</span></li>))}
        </ol>
      </Card>

      <Card title="Payments" className="lg:col-span-2" actions={<a href="#payments" className="text-sky-300 text-sm">View all →</a>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700/60">
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Amount</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Method</th>
                <th className="text-left py-2 font-medium">Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(-5).reverse().map(p => (
                <tr key={p.id} className="border-b border-slate-800/60">
                  <td className="py-2">{fmtDate(p.date)}</td>
                  <td className="py-2">{fmtCurrency(p.amount)}</td>
                  <td className="py-2"><Tag tone={p.status === "Paid" ? "good" : p.status === "Processing" ? "warn" : "bad"}>{p.status}</Tag></td>
                  <td className="py-2">{p.method}</td>
                  <td className="py-2">{p.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Messages & Notices">
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">Reminder: Keep your address up to date.</li>
          {program.status === "Pending" && <li className="p-3 rounded-xl bg-amber-900/30 border border-amber-700/40">We may request more documents to finalize your application.</li>}
          {program.status === "On Hold" && <li className="p-3 rounded-xl bg-rose-900/30 border border-rose-700/40">Action needed: Please verify your banking information.</li>}
        </ul>
      </Card>
    </div>
  );
};

const PaymentsPage = ({ payments, onExport }) => {
  const [qYear, setQYear] = useState("All");
  const years = useMemo(() => ["All", ...Array.from(new Set(payments.map(p => String(new Date(p.date).getFullYear()))))], [payments]);
  const filtered = useMemo(() => qYear === "All" ? payments : payments.filter(p => String(new Date(p.date).getFullYear()) === qYear), [qYear, payments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-slate-300 text-sm">{filtered.length} payment{filtered.length!==1 && 's'} shown</div>
        <div className="flex items-center gap-2">
          <Select label="Year" value={qYear} onChange={setQYear} options={years} />
          <button onClick={onExport} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-2"><Icon name="download"/> Export CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700/60">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Amount</th>
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Method</th>
              <th className="text-left py-2 font-medium">Ref</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-800/60">
                <td className="py-2">{fmtDate(p.date)}</td>
                <td className="py-2">{fmtCurrency(p.amount)}</td>
                <td className="py-2"><Tag tone={p.status === "Paid" ? "good" : p.status === "Processing" ? "warn" : "bad"}>{p.status}</Tag></td>
                <td className="py-2">{p.method}</td>
                <td className="py-2">{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const WalletPage = ({ wallet, setWallet }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Deposit method">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Method" value={wallet.method} onChange={(v) => setWallet({ ...wallet, method: v })} options={["ACH", "PayCard", "eWallet"]} />
          <Input label="Account last 4" value={wallet.accountLast4} onChange={(v) => setWallet({ ...wallet, accountLast4: v })} />
          <Input label="Institution" value={wallet.institution} onChange={(v) => setWallet({ ...wallet, institution: v })} />
        </div>
        <div className="text-xs text-slate-400 mt-3">Bank info is tokenized. We never store full account numbers.</div>
      </Card>
      <Card title="Direct deposit summary">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-slate-400">Method</span><span className="text-slate-100 font-medium">{wallet.method}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Account</span><span className="text-slate-100 font-medium">{maskAcct(wallet.accountLast4)}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Institution</span><span className="text-slate-100 font-medium">{wallet.institution}</span></div>
        </div>
      </Card>
    </div>
  );
};

const DocumentsPage = ({ docs, setDocs }) => {
  const onUpload = (file) => {
    if (!file) return;
    const newDoc = { id: `d_${Math.random().toString(36).slice(2,8)}`, name: file.name, type: inferDocType(file.name), uploadedAt: new Date().toISOString(), status: "Reviewing" };
    setDocs([...docs, newDoc]);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-slate-300 text-sm">Upload government ID, proof of address, or other requested docs.</div>
        <label className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer">Upload<input type="file" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} /></label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(d => (
          <div key={d.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-100">{d.name}</div>
                <div className="text-xs text-slate-400">{d.type} • {fmtDate(d.uploadedAt)}</div>
              </div>
              <Tag tone={d.status === "Verified" ? "good" : d.status === "Rejected" ? "bad" : "warn"}>{d.status}</Tag>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SupportPage = () => {
  const [messages, setMessages] = useState([
    { id: "m1", from: "Agent Maya", role: "agent", text: "Hi Alex! Let me know if you need help with your application.", ts: new Date(Date.now()-3600_000).toISOString() },
    { id: "m2", from: "Alex Rivera", role: "user", text: "How long does verification take?", ts: new Date(Date.now()-3400_000).toISOString() },
    { id: "m3", from: "Agent Maya", role: "agent", text: "Usually 3–5 business days.", ts: new Date(Date.now()-3300_000).toISOString() },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: `m_${Date.now()}`, from: "Alex Rivera", role: "user", text: input.trim(), ts: new Date().toISOString() }]);
    setInput("");
  };
  return (
    <div className="grid grid-rows-[1fr_auto] h-[520px] rounded-2xl bg-slate-900/60 border border-slate-700/60">
      <div className="p-4 overflow-y-auto space-y-3">
        {messages.map(m => (
          <div key={m.id} className={cls("max-w-[80%] rounded-xl px-3 py-2 text-sm", m.role === "user" ? "bg-sky-900/30 border border-sky-700/40 ml-auto" : "bg-slate-800/60 border border-slate-700/60") }>
            <div className="text-xs text-slate-400 mb-0.5">{m.from} • {new Date(m.ts).toLocaleTimeString()}</div>
            <div className="text-slate-100">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700/60 flex items-center gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type your message…" className="flex-1 rounded-xl bg-slate-800/70 border border-slate-700/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/60"/>
        <button onClick={send} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white">Send</button>
      </div>
    </div>
  );
};

const SettingsPage = ({ user, setUser, programCfg, setProgramCfg }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full name" value={user.name} onChange={(v) => setUser({ ...user, name: v })} />
          <Input label="Email" value={user.email} onChange={(v) => setUser({ ...user, email: v })} />
          <Input label="Phone" value={user.phone} onChange={(v) => setUser({ ...user, phone: v })} />
          <Input label="City/Province" value={user.residency} onChange={(v) => setUser({ ...user, residency: v })} />
        </div>
      </Card>
      <Card title="Preferences">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Preferred payout day" type="number" value={programCfg.preferredPayoutDay ?? 15} onChange={(v)=> setProgramCfg({ ...programCfg, preferredPayoutDay: Number(v) })} />
          <Select label="Currency" value="USD" onChange={()=>{}} options={["USD"]} />
          <Switch label="Email notifications" checked={user.comms.email} onChange={(v)=> setUser({ ...user, comms: { ...user.comms, email: v } })} />
          <Switch label="SMS notifications" checked={user.comms.sms} onChange={(v)=> setUser({ ...user, comms: { ...user.comms, sms: v } })} />
          <Switch label="Push notifications" checked={user.comms.push} onChange={(v)=> setUser({ ...user, comms: { ...user.comms, push: v } })} />
        </div>
      </Card>
    </div>
  );
};

// ---------- Helpers ----------
const inferDocType = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("id") || n.includes("license") || n.includes("passport")) return "ID";
  if (n.includes("address") || n.includes("utility") || n.includes("bill")) return "Address";
  if (n.includes("income") || n.includes("paystub") || n.includes("tax")) return "Income";
  return "Other";
};

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ---------- Shell ----------
const NavTab = ({ id, label, icon, active, onClick }) => (
  <button onClick={()=>onClick(id)} className={cls("px-3 py-2 rounded-xl flex items-center gap-2 text-sm border", active ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-transparent border-transparent text-slate-300 hover:text-slate-100")}>
    <Icon name={icon} /> <span>{label}</span>
  </button>
);

const HeaderBar = ({ user }) => (
  <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 bg-slate-950/80 border-b border-slate-800">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400" />
        <div className="font-semibold tracking-wide">UBI Client</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-sm text-slate-300">Welcome, <span className="text-slate-100 font-medium">{user.name}</span></div>
        <div className="w-8 h-8 rounded-full bg-slate-700/70 border border-slate-600/60" />
      </div>
    </div>
  </header>
);

export default function UBIClientApp() {
  const [user, setUser] = usePersistentState("user", seedUser);
  const [programCfg, setProgramCfg] = usePersistentState("programCfg", seedProgram);
  const [program, setProgram] = usePersistentState("program", seedProgram);
  const [payments, setPayments] = usePersistentState("payments", seedPayments);
  const [wallet, setWallet] = usePersistentState("wallet", seedWallet);
  const [docs, setDocs] = usePersistentState("docs", seedDocs);

  const [tab, setTab] = useState("dashboard");

  // Scenario switcher from Dashboard
  const simulateSet = (status) => {
    const mapReason = {
      "Not Applied": "Start your application to check eligibility.",
      Draft: "Your application is in progress.",
      Pending: "Your application is under review.",
      Approved: "You are eligible for UBI.",
      "On Hold": "We need more info to proceed.",
      Denied: "You did not meet the current eligibility criteria.",
    };
    setProgram({ ...program, status, statusReason: mapReason[status] || "" });
  };

  // CSV export
  const exportCSV = () => {
    const rows = [["id","date","amount","status","method","ref"], ...payments.map(p => [p.id, p.date, p.amount, p.status, p.method, p.ref])];
    const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(",")).join("\n");
    downloadText(`payments_${new Date().toISOString().slice(0,10)}.csv`, csv);
  };

  // Eligibility letter
  const downloadEligibilityLetter = () => {
    const text = `UBI Eligibility Confirmation\n\nName: ${user.name}\nEmail: ${user.email}\nResidency: ${user.residency}\n\nStatus: ${program.status}\nMonthly Benefit: ${fmtCurrency(programCfg.benefitAmountMonthly)}\nNext Payment Cycle: ${fmtDate(programCfg.nextCycleDate)}\n\nThis letter confirms your status in the Universal Basic Income program as of ${fmtDate(new Date())}.`;
    downloadText("UBI_Eligibility_Letter.txt", text);
  };

  // Banner logic
  const showApply = program.status === "Not Applied" || program.status === "Draft";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <HeaderBar user={user} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Compliance banner */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-700/60 p-4 text-sm text-slate-300 flex items-center justify-between gap-3">
          <div>
            <span className="font-medium text-slate-100">Privacy & Security</span> • We store the minimum necessary data. Sensitive fields are masked or tokenized.
          </div>
          <a href="#privacy" className="text-sky-300">Learn more</a>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <NavTab id="dashboard" label="Dashboard" icon="home" active={tab==='dashboard'} onClick={setTab} />
          <NavTab id="apply" label="Apply" icon="apply" active={tab==='apply'} onClick={setTab} />
          <NavTab id="payments" label="Payments" icon="payments" active={tab==='payments'} onClick={setTab} />
          <NavTab id="wallet" label="Wallet" icon="wallet" active={tab==='wallet'} onClick={setTab} />
          <NavTab id="documents" label="Documents" icon="docs" active={tab==='documents'} onClick={setTab} />
          <NavTab id="support" label="Support" icon="support" active={tab==='support'} onClick={setTab} />
          <NavTab id="settings" label="Settings" icon="settings" active={tab==='settings'} onClick={setTab} />
        </div>

        {/* Content */}
        {tab === 'dashboard' && (
          <Dashboard
            program={program}
            payments={payments}
            programCfg={programCfg}
            simulateSet={simulateSet}
            onDownloadLetter={downloadEligibilityLetter}
          />
        )}

        {tab === 'apply' && (
          <div className="space-y-4">
            {showApply ? (
              <ApplicationWizard program={program} setProgram={setProgram} wallet={wallet} docs={docs} />
            ) : (
              <Card title="Application">
                <div className="text-slate-300 text-sm">Your application has been submitted. Current status: <Tag tone={program.status === 'Approved' ? 'good' : program.status === 'Pending' ? 'warn' : 'default'}>{program.status}</Tag></div>
              </Card>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <PaymentsPage payments={payments} onExport={exportCSV} />
        )}

        {tab === 'wallet' && (
          <WalletPage wallet={wallet} setWallet={setWallet} />
        )}

        {tab === 'documents' && (
          <DocumentsPage docs={docs} setDocs={setDocs} />
        )}

        {tab === 'support' && (
          <SupportPage />
        )}

        {tab === 'settings' && (
          <SettingsPage user={user} setUser={setUser} programCfg={programCfg} setProgramCfg={setProgramCfg} />
        )}

        {/* Footer */}
        <footer className="pt-8 pb-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} UBI Program — Prototype client UI
        </footer>
      </main>
    </div>
  );
}
