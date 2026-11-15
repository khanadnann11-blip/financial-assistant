'use client';
import {
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  Menu,
  Pencil,
  ReceiptText,
  SlidersHorizontal,
} from 'lucide-react';
import { type State, type Answer, categories, money } from '@/lib/types';
import { forecast, goalContribution, monthKey, summarize } from '@/lib/finance';
const nav = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Transactions', icon: ReceiptText },
  { name: 'Budgets', icon: Wallet },
  { name: 'Goals', icon: Target },
  { name: 'Accounts', icon: CreditCard },
  { name: 'AI Assistant', icon: Sparkles },
];
const colors = [
  '#426b54',
  '#8ca68b',
  '#bdcda6',
  '#dfc593',
  '#baa99a',
  '#dfd7c8',
  '#a9c3c0',
  '#d6b0a0',
];
const fmtMonth = (m: string) =>
  new Date(m + '-02T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
async function request(path: string, body?: unknown, method = 'POST') {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Leaf size={22} strokeWidth={2.2} />
      </span>
      folio<span className="brand-dot">.</span>
    </div>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Leaf size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(value) * 100);
}
function Editor({
  kind,
  state,
  onClose,
  onSave,
}: {
  kind: string;
  state: State;
  onClose: () => void;
  onSave: (path: string, body: unknown, method?: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  const [entity, entityId] = kind.split(':');
  const titles: Record<string, string> = {
    transaction: 'Add a transaction',
    budget: 'Set a monthly budget',
    goal: 'Create a savings goal',
    account: 'Add a manual account',
    contribution: 'Update saved amount',
    balance: 'Update balance snapshot',
    delete: 'Delete your workspace',
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      if (entity === 'transaction')
        await onSave('transactions', {
          date: f.get('date'),
          merchant: f.get('merchant'),
          category: f.get('category'),
          amount: cents(f.get('amount')) * (f.get('direction') === 'expense' ? -1 : 1),
          account: f.get('account'),
          pending: f.get('pending') === 'on',
        });
      if (entity === 'budget')
        await onSave('budgets', { category: f.get('category'), limit: cents(f.get('limit')) });
      if (entity === 'goal')
        await onSave('goals', {
          name: f.get('name'),
          target: cents(f.get('target')),
          saved: cents(f.get('saved')),
          deadline: f.get('deadline'),
        });
      if (entity === 'account')
        await onSave('accounts', {
          name: f.get('name'),
          institution: f.get('institution'),
          type: f.get('type'),
          balance: cents(f.get('balance')),
          last4: f.get('last4'),
        });
      if (entity === 'contribution')
        await onSave('goals', { id: entityId, saved: cents(f.get('saved')) }, 'PATCH');
      if (entity === 'balance')
        await onSave('accounts', { id: entityId, balance: cents(f.get('balance')) }, 'PATCH');
      if (entity === 'delete')
        await onSave('me', { confirmation: f.get('confirmation') }, 'DELETE');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const amountInput = (name: string, initial?: number, allowNegative = false) => (
    <input
      name={name}
      type="number"
      min={allowNegative ? undefined : '0'}
      step="0.01"
      required
      defaultValue={initial !== undefined ? initial / 100 : undefined}
      placeholder="0.00"
    />
  );
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{titles[entity]}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        {entity === 'transaction' && (
          <>
            <p className="form-note">
              Transactions inform analytics. Update account balance snapshots separately.
            </p>
            <Field label="Merchant or description">
              <input
                name="merchant"
                required
                maxLength={120}
                autoFocus
                placeholder="e.g. Neighborhood coffee"
              />
            </Field>
            <div className="form-row">
              <Field label="Amount (USD)">{amountInput('amount')}</Field>
              <Field label="Direction">
                <select name="direction">
                  <option value="expense">Money out</option>
                  <option value="income">Money in / refund</option>
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field label="Category">
                <select name="category">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Account">
              <select name="account" required>
                {state.accounts.map((a) => (
                  <option key={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <label className="checkbox">
              <input name="pending" type="checkbox" /> Pending transaction
            </label>
          </>
        )}
        {entity === 'budget' && (
          <>
            <p className="form-note">
              Budgets repeat each month. Setting an existing category updates its limit.
            </p>
            <Field label="Category">
              <select name="category" defaultValue={entityId || undefined}>
                {categories
                  .filter((c) => !['Income', 'Transfer'].includes(c))
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </Field>
            <Field label="Monthly limit (USD)">{amountInput('limit')}</Field>
          </>
        )}
        {entity === 'goal' && (
          <>
            <Field label="Goal name">
              <input
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="What are you saving for?"
              />
            </Field>
            <div className="form-row">
              <Field label="Target (USD)">{amountInput('target')}</Field>
              <Field label="Already saved (USD)">{amountInput('saved', 0)}</Field>
            </div>
            <Field label="Target date">
              <input
                name="deadline"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <p className="form-note">Goals are tracked manually and do not move money.</p>
          </>
        )}
        {entity === 'account' && (
          <>
            <p className="form-note">
              Record a balance manually. No bank is connected and no credentials are requested.
            </p>
            <Field label="Account name">
              <input
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="Everyday checking"
              />
            </Field>
            <Field label="Institution">
              <input name="institution" required maxLength={80} placeholder="Your bank name" />
            </Field>
            <div className="form-row">
              <Field label="Type">
                <select name="type">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit</option>
                </select>
              </Field>
              <Field label="Last 4 digits">
                <input name="last4" required pattern="[0-9]{4}" maxLength={4} placeholder="1234" />
              </Field>
            </div>
            <Field label="Balance (USD)">{amountInput('balance', undefined, true)}</Field>
            <p className="form-note">Enter credit card liabilities as negative balances.</p>
          </>
        )}
        {entity === 'contribution' && (
          <>
            <Field label="Total saved so far (USD)">
              {amountInput('saved', state.goals.find((g) => g.id === entityId)?.saved)}
            </Field>
            <p className="form-note">
              Enter the total amount saved, including previous contributions.
            </p>
          </>
        )}
        {entity === 'balance' && (
          <>
            <Field label="Current balance (USD)">
              {amountInput('balance', state.accounts.find((g) => g.id === entityId)?.balance, true)}
            </Field>
            <p className="form-note">
              This updates your manual snapshot. It does not create a transaction.
            </p>
          </>
        )}
        {entity === 'delete' && (
          <>
            <p>
              This permanently removes your account, sessions, and workspace data from the
              application database. This cannot be undone.
            </p>
            <Field label="Type DELETE to confirm">
              <input name="confirmation" pattern="DELETE" required autoComplete="off" />
            </Field>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy || (entity === 'transaction' && !state.accounts.length)}
            className={`button ${entity === 'delete' ? 'danger' : 'primary'}`}
          >
            {busy ? 'Saving…' : entity === 'delete' ? 'Delete permanently' : 'Save changes'}
            <Check size={16} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
function Login({ onDone }: { onDone: () => Promise<void> }) {
  const [mode, setMode] = useState('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function enter(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const f = e ? new FormData(e.currentTarget) : null;
      await request(
        f ? mode : 'demo',
        f ? { name: f.get('name'), email: f.get('email'), password: f.get('password') } : {},
      );
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome">
      <header>
        <Brand />
        <span className="eyebrow">A calmer kind of finance.</span>
        <button className="button secondary" onClick={() => setMode('login')}>
          Sign in <ArrowUpRight size={15} />
        </button>
      </header>
      <main className="welcome-main">
        <div className="welcome-copy">
          <span className="pill">
            <span className="status-dot" /> YOUR MONEY, MAKING SENSE
          </span>
          <h1>
            A little clarity.
            <br />A lot more <em>possibility.</em>
          </h1>
          <p>
            Meet your money where it is. Understand your spending, build better habits, and make
            room for what matters.
          </p>
          <div className="welcome-actions">
            <button disabled={busy} className="button primary large" onClick={() => enter()}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Explore the demo <ArrowRight size={18} />
                </>
              )}
            </button>
            <button className="text-button" onClick={() => setMode('register')}>
              Create your workspace <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="welcome-trust">
            <ShieldCheck size={17} /> Private by design <span>·</span> No bank connection needed
          </div>
        </div>
        <div className="welcome-art">
          <div className="art-orbit" />
          <div className="art-card">
            <div className="card-label">
              <span className="leaf-tile">
                <Leaf size={19} />
              </span>{' '}
              A healthier financial picture <span className="tiny-badge">DEMO</span>
            </div>
            <span className="muted">Net account balance</span>
            <div className="art-number">
              $25,320<span>.70</span>
            </div>
            <div className="mini-bars">
              {[35, 48, 40, 62, 58, 72, 68, 89, 82, 100, 92, 116].map((h, i) => (
                <i key={i} style={{ height: h, opacity: 0.35 + i * 0.05 }} />
              ))}
            </div>
            <div className="art-bottom">
              <span>Your next chapter starts here.</span>
              <TrendingUp size={19} />
            </div>
          </div>
          <div className="floating-card">
            <span className="spark-tile">
              <Sparkles size={22} />
            </span>
            <div>
              <strong>A plan that feels like you.</strong>
              <span>Small steps. Meaningful progress.</span>
            </div>
          </div>
        </div>
      </main>
      <div className="welcome-features">
        {[
          {
            title: 'See the whole picture',
            desc: 'Spending, budgets, and balances in one place.',
            icon: LayoutDashboard,
          },
          {
            title: 'Ask better questions',
            desc: 'Clear answers, backed by your financial data.',
            icon: Sparkles,
          },
          {
            title: 'Move toward your goals',
            desc: 'Turn someday into a simple monthly plan.',
            icon: Target,
          },
        ].map((f) => (
          <div key={f.title}>
            <f.icon size={22} />
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
      <footer>
        Built for clarity. Designed for you. <span>USD workspace · Educational planning tools</span>
      </footer>
      {mode !== 'welcome' && (
        <div className="auth-overlay">
          <div className="auth-card">
            <button
              className="icon-button auth-close"
              aria-label="Close sign in"
              onClick={() => setMode('welcome')}
            >
              <X size={20} />
            </button>
            <Brand />
            <h2>{mode === 'register' ? 'Your fresh start.' : 'Welcome back.'}</h2>
            <p className="muted">
              {mode === 'register'
                ? 'Create a private workspace with your own data.'
                : 'A clearer picture is waiting for you.'}
            </p>
            <form onSubmit={enter}>
              {mode === 'register' && (
                <Field label="Your name">
                  <input name="name" required maxLength={80} autoComplete="name" />
                </Field>
              )}
              <Field label="Email">
                <input name="email" type="email" required autoComplete="email" />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="At least 12 characters"
                />
              </Field>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
                <ArrowRight size={16} />
              </button>
            </form>
            <button
              className="text-button auth-switch"
              onClick={() => {
                setError('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
            >
              {mode === 'login'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </button>
            <p className="fine-print">
              No bank access. Password recovery is not available in this initial release. Keep your
              credentials secure.
            </p>
          </div>
        </div>
      )}
      {error && mode === 'welcome' && (
        <div className="toast error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
export default function Workspace() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('Overview');
  const [month, setMonth] = useState(monthKey());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All categories');
  const [editor, setEditor] = useState('');
  const [toast, setToast] = useState('');
  const [alerts, setAlerts] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; answer?: Answer }[]
  >([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  async function refresh() {
    const r = await fetch('/api/state');
    if (r.status === 401) {
      setState(null);
      return;
    }
    if (!r.ok) throw new Error('Could not load your workspace. Please retry.');
    setState(await r.json());
    setLoadError('');
  }
  useEffect(() => {
    refresh()
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, asking]);
  async function save(path: string, body: unknown, method = 'POST') {
    await request(path, body, method);
    if (path === 'me') {
      setState(null);
      setMessages([]);
    } else await refresh();
    setToast(path === 'me' ? 'Your workspace has been deleted.' : 'Changes saved. Looking good.');
  }
  async function mutate(path: string, body: unknown, method = 'POST') {
    try {
      await save(path, body, method);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function navigate(next: string) {
    setPage(next);
    setMobile(false);
    setAlerts(false);
  }
  async function ask(text: string) {
    if (!text.trim() || asking) return;
    navigate('AI Assistant');
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setAsking(true);
    try {
      const a: Answer = await request('assistant', { question: text });
      setMessages((m) => [...m, { role: 'assistant', text: a.text, answer: a }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: (e as Error).message }]);
    } finally {
      setAsking(false);
    }
  }
  if (loading)
    return (
      <div className="app-loading">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Finding a little clarity…</p>
      </div>
    );
  if (loadError)
    return (
      <div className="app-loading">
        <p role="alert">{loadError}</p>
        <button
          className="button primary"
          onClick={() => refresh().catch((e) => setLoadError(e.message))}
        >
          Retry
        </button>
      </div>
    );
  if (!state) return <Login onDone={refresh} />;
  const s = summarize(state.transactions, month);
  const f = forecast(state);
  const total = state.accounts.reduce((sum, a) => sum + a.balance, 0);
  const spendCategories = Object.entries(s.byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalBudget = state.budgets.reduce((sum, b) => sum + b.limit, 0);
  const budgetUsed = state.budgets.reduce((sum, b) => sum + (s.byCategory[b.category] || 0), 0);
  const filtered = state.transactions.filter(
    (t) =>
      t.date.startsWith(month) &&
      (filter === 'All categories' || t.category === filter) &&
      `${t.merchant} ${t.category} ${t.account}`.toLowerCase().includes(query.toLowerCase()),
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    monthKey(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - i, 1))),
  );
  const alertItems = state.budgets.filter((b) => (s.byCategory[b.category] || 0) > b.limit * 0.8);
  const monthSelect = (
    <div className="month-picker">
      <span className="calendar-icon">◷</span>
      <select aria-label="Select month" value={month} onChange={(e) => setMonth(e.target.value)}>
        {months.map((m) => (
          <option key={m} value={m}>
            {fmtMonth(m)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
  function transactionTable(limit?: number) {
    const rows = filtered.slice(0, limit);
    return rows.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              {!limit && (
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="merchant">
                    <span className={`merchant-icon ${t.amount > 0 ? 'positive-bg' : ''}`}>
                      {t.category === 'Income' ? (
                        <ArrowDownLeft size={17} />
                      ) : t.category === 'Transfer' ? (
                        <ArrowUpRight size={17} />
                      ) : (
                        t.merchant.charAt(0)
                      )}
                    </span>
                    <div>
                      <strong>{t.merchant}</strong>
                      <small>
                        {t.account}
                        {t.pending ? ' · Pending' : ''}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  {limit ? (
                    <span className="category-tag">{t.category}</span>
                  ) : (
                    <select
                      className="category-edit"
                      aria-label={`Category for ${t.merchant}`}
                      value={t.category}
                      onChange={(e) =>
                        mutate('transactions', { id: t.id, category: e.target.value }, 'PATCH')
                      }
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="muted date-cell">
                  {new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className={`amount ${t.amount > 0 ? 'positive' : ''}`}>
                  {t.amount > 0 ? '+' : '−'}
                  {money(Math.abs(t.amount))}
                </td>
                {!limit && (
                  <td>
                    <button
                      className="icon-button subtle"
                      title="Delete transaction"
                      aria-label={`Delete ${t.merchant}`}
                      onClick={() => mutate('transactions', { id: t.id }, 'DELETE')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="A clean slate"
        text="No transactions match this view. Add a transaction or try a different month or filter."
      />
    );
  }
  function goalsGrid(compact = false) {
    return (
      <div className={compact ? 'goals-mini' : 'goals-grid'}>
        {state!.goals.slice(0, compact ? 3 : undefined).map((g, i) => (
          <div className={compact ? 'goal-mini' : 'card goal-card'} key={g.id}>
            <div className="goal-heading">
              <span className={`goal-icon goal-color-${i % 3}`}>
                {i % 3 === 0 ? (
                  <ShieldCheck size={20} />
                ) : i % 3 === 1 ? (
                  <Leaf size={20} />
                ) : (
                  <Target size={20} />
                )}
              </span>
              {!compact && (
                <button
                  className="icon-button subtle"
                  aria-label={`Delete ${g.name}`}
                  onClick={() => mutate('goals', { id: g.id }, 'DELETE')}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <h3>{g.name}</h3>
            <p className="goal-amount">
              {money(g.saved)} <span>of {money(g.target)}</span>
            </p>
            <Progress value={(g.saved / g.target) * 100} color={colors[i % colors.length]} />
            <div className="goal-meta">
              <span>{Math.round((g.saved / g.target) * 100)}% there</span>
              <span>
                {new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {!compact && (
              <>
                <p className="form-note">
                  {g.deadline < new Date().toISOString().slice(0, 10)
                    ? 'Deadline passed. Your savings are still worth celebrating.'
                    : `${money(goalContribution(g.target, g.saved, g.deadline))} / month to reach your goal`}
                </p>
                <button
                  className="button secondary full"
                  onClick={() => setEditor(`contribution:${g.id}`)}
                >
                  Update saved amount <Plus size={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              onClick={() => navigate(n.name)}
              className={page === n.name ? 'nav-item active' : 'nav-item'}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.name === 'AI Assistant' && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Sparkles size={20} />
            </span>
            <strong>A little guidance goes a long way.</strong>
            <p>Make your next money move a clearer one.</p>
            <button onClick={() => navigate('AI Assistant')}>
              Ask your assistant <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
            onClick={() => navigate('Settings')}
          >
            <Settings size={19} />
            Settings & privacy
          </button>
          <button
            className="nav-item"
            onClick={() => {
              navigate('AI Assistant');
              setMessages((m) => [
                ...m,
                {
                  role: 'assistant',
                  text: 'Welcome to Folio. Add manual accounts in Accounts, record activity in Transactions, then set monthly budgets and savings goals. Ask me about your spending, income, budgets, or forecast. All amounts are USD. Balances and goal savings are tracked separately from transactions.',
                },
              ]);
            }}
          >
            <CircleHelp size={19} />
            Help & getting started
          </button>
          <div className="profile">
            <span className="avatar">
              {state.user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <strong>{state.user.name}</strong>
              <small>{state.user.demo ? 'Demo workspace' : 'Personal workspace'}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await request('logout', {});
                  setState(null);
                  setMessages([]);
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <span className="data-status">
              <span className="status-dot" />
              {state.user.demo ? 'Demo data' : 'Manual data'}
            </span>
            <button
              className="icon-button"
              aria-label="Search transactions"
              onClick={() => {
                navigate('Transactions');
                setTimeout(() => document.getElementById('transaction-search')?.focus(), 50);
              }}
            >
              <Search size={19} />
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Show notifications"
                onClick={() => setAlerts(!alerts)}
              >
                <Bell size={19} />
                {alertItems.length > 0 && <i />}
              </button>
              {alerts && (
                <div className="notification-panel">
                  <strong>Your check-in</strong>
                  {alertItems.length ? (
                    alertItems.map((b) => (
                      <button key={b.category} onClick={() => navigate('Budgets')}>
                        {b.category} has used{' '}
                        {Math.round(((s.byCategory[b.category] || 0) / b.limit) * 100)}% of its
                        budget.
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>No budget alerts for {fmtMonth(month)}. A little peace of mind.</p>
                  )}
                  <small>Based on posted transactions in the selected month.</small>
                </div>
              )}
            </div>
            <span className="avatar small">{state.user.name[0]}</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === 'Overview' ? 'YOUR FINANCIAL PICTURE' : 'A LITTLE MORE CLARITY'}
              </div>
              <h1>
                {page === 'Overview'
                  ? `Looking good, ${state.user.name.split(' ')[0]}.`
                  : page === 'AI Assistant'
                    ? 'Good questions. Clearer answers.'
                    : page === 'Settings'
                      ? 'Your workspace, your rules.'
                      : page === 'Goals'
                        ? 'Make room for what matters.'
                        : page === 'Budgets'
                          ? 'A plan for your everyday.'
                          : page === 'Accounts'
                            ? 'Your money, in one place.'
                            : 'The little things add up.'}
                <span className="heading-dot">{page === 'Overview' ? ' ✳' : ''}</span>
              </h1>
              <p>
                {page === 'Overview'
                  ? 'Here’s where you stand. Let’s make your next move a good one.'
                  : page === 'Transactions'
                    ? 'Explore your activity and give every dollar a little context.'
                    : page === 'Budgets'
                      ? 'Build a spending rhythm that works for you.'
                      : page === 'Goals'
                        ? 'Small steps today. More possibilities tomorrow.'
                        : page === 'Accounts'
                          ? 'Manually maintained balances. A clearer view of the whole picture.'
                          : page === 'AI Assistant'
                            ? 'Grounded in your data. Built to help you move forward.'
                            : 'Manage your data, privacy, and preferences.'}
              </p>
            </div>
            <div className="heading-actions">
              {['Overview', 'Transactions', 'Budgets'].includes(page) && monthSelect}
              {page === 'Transactions' && (
                <button
                  className="button primary"
                  onClick={() =>
                    state.accounts.length ? setEditor('transaction') : navigate('Accounts')
                  }
                >
                  <Plus size={16} />
                  Add transaction
                </button>
              )}
              {page === 'Budgets' && (
                <button className="button primary" onClick={() => setEditor('budget')}>
                  <Plus size={16} />
                  Set budget
                </button>
              )}
              {page === 'Goals' && (
                <button className="button primary" onClick={() => setEditor('goal')}>
                  <Plus size={16} />
                  New goal
                </button>
              )}
              {page === 'Accounts' && (
                <button className="button primary" onClick={() => setEditor('account')}>
                  <Plus size={16} />
                  Add account
                </button>
              )}
            </div>
          </div>
          {page === 'Overview' && (
            <>
              <section className="stat-grid">
                <div className="card stat">
                  <div className="stat-label">
                    Net account balance{' '}
                    <span className="stat-icon">
                      <Wallet size={16} />
                    </span>
                  </div>
                  <div className="stat-value">{money(total)}</div>
                  <div className="stat-foot">
                    <span className="neutral-badge">{state.accounts.length} accounts</span>
                    <span>Balance snapshots</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="stat-label">
                    Income in period{' '}
                    <span className="stat-icon">
                      <ArrowDownLeft size={17} />
                    </span>
                  </div>
                  <div className="stat-value">{money(s.income)}</div>
                  <div className="stat-foot">
                    <span className="positive">
                      <span className="small-dot" /> Money coming in
                    </span>
                    <span>Posted income</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="stat-label">
                    Spending in period{' '}
                    <span className="stat-icon">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                  <div className="stat-value">{money(s.spending)}</div>
                  <div className="stat-foot">
                    <span className="neutral-badge">
                      {s.rows.filter((t) => t.category !== 'Income').length} transactions
                    </span>
                    <span>Transfers excluded</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="stat-label">
                    Net cash flow{' '}
                    <span className="stat-icon">
                      <TrendingUp size={17} />
                    </span>
                  </div>
                  <div className="stat-value">{money(s.net)}</div>
                  <div className="stat-foot">
                    <span className={s.net >= 0 ? 'positive' : 'warning-text'}>
                      {s.income > 0
                        ? `${Math.round((s.net / s.income) * 100)}% of income`
                        : 'No income recorded'}
                    </span>
                    <span>Income less spending</span>
                  </div>
                </div>
              </section>
              <section className="overview-main">
                <div className="card cash-chart">
                  <div className="card-header">
                    <div>
                      <h2>Money in, money out</h2>
                      <p>Your cash flow over the last six months</p>
                    </div>
                    <span className="chart-range">
                      6 months <ChevronDown size={13} />
                    </span>
                  </div>
                  <CashChart state={state} month={month} />
                  <div className="chart-legend">
                    <span>
                      <i style={{ background: '#456c54' }} />
                      Income
                    </span>
                    <span>
                      <i style={{ background: '#cad5be' }} />
                      Spending
                    </span>
                    <small>Posted activity · USD</small>
                  </div>
                </div>
                <div className="assistant-promo">
                  <div className="promo-top">
                    <span>
                      <Sparkles size={18} />
                      YOUR FINANCIAL SIDEKICK
                    </span>
                    <span className="promo-star">✳</span>
                  </div>
                  <h2>
                    A clearer answer
                    <br />
                    is a question away.
                  </h2>
                  <p>From everyday spending to your next big goal. Let’s figure it out together.</p>
                  <button onClick={() => ask('How are my budgets?')}>
                    How are my budgets? <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => ask('Compare spending with last month')}>
                    Where is my money going? <ArrowUpRight size={16} />
                  </button>
                  <div className="promo-footer">
                    <span className="status-dot" /> Grounded in your financial data
                  </div>
                </div>
              </section>
              <section className="overview-secondary">
                <div className="card spending-card">
                  <div className="card-header">
                    <h2>Spending breakdown</h2>
                    <button
                      className="icon-button"
                      aria-label="View spending transactions"
                      onClick={() => navigate('Transactions')}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {spendCategories.length ? (
                    <div className="spending-content">
                      <Donut entries={spendCategories} period={month} />
                      <div className="spending-legend">
                        {spendCategories.slice(0, 5).map(([c, v], i) => (
                          <div key={c}>
                            <span>
                              <i style={{ background: colors[i] }} />
                              {c}
                            </span>
                            <strong>{money(v)}</strong>
                          </div>
                        ))}
                        {spendCategories.length > 5 && (
                          <small className="muted">
                            + {spendCategories.length - 5} more categories
                          </small>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Empty
                      title="Your spending story starts here"
                      text="Add transactions to see your categories."
                    />
                  )}
                </div>
                <div className="card budget-overview">
                  <div className="card-header">
                    <h2>Budget check-in</h2>
                    <button className="text-button" onClick={() => navigate('Budgets')}>
                      View budgets <ArrowRight size={14} />
                    </button>
                  </div>
                  {state.budgets.length ? (
                    <>
                      <div className="budget-headline">
                        <strong>{money(Math.max(0, totalBudget - budgetUsed))}</strong>
                        <span>
                          {budgetUsed > totalBudget
                            ? 'Budget exceeded'
                            : 'left across budgeted categories'}
                        </span>
                      </div>
                      <Progress value={totalBudget ? (budgetUsed / totalBudget) * 100 : 0} />
                      <div className="budget-totals">
                        <span>{money(budgetUsed)} spent</span>
                        <span>of {money(totalBudget)}</span>
                      </div>
                      <div className="budget-note">
                        <span className="leaf-tile">
                          <Leaf size={17} />
                        </span>
                        <p>
                          {alertItems.length
                            ? `${alertItems.length} ${alertItems.length === 1 ? 'category is' : 'categories are'} getting close to the limit. A good moment to check in.`
                            : 'A little awareness goes a long way. Keep building your rhythm.'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <Empty
                      title="Give your money a plan"
                      text="Set a category budget to get started."
                      action={
                        <button className="text-button" onClick={() => setEditor('budget')}>
                          Set your first budget <ArrowRight size={14} />
                        </button>
                      }
                    />
                  )}
                </div>
              </section>
              <section className="overview-bottom">
                <div className="card recent-card">
                  <div className="card-header">
                    <h2>Recent transactions</h2>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery('');
                        setFilter('All categories');
                        navigate('Transactions');
                      }}
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {transactionTable(5)}
                </div>
                <div className="card goals-overview">
                  <div className="card-header">
                    <h2>Growing toward your goals</h2>
                    <button
                      className="icon-button"
                      aria-label="View savings goals"
                      onClick={() => navigate('Goals')}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {state.goals.length ? (
                    goalsGrid(true)
                  ) : (
                    <Empty
                      title="Something to look forward to"
                      text="Create your first savings goal."
                      action={
                        <button className="text-button" onClick={() => setEditor('goal')}>
                          Create a goal <Plus size={14} />
                        </button>
                      }
                    />
                  )}
                </div>
              </section>
            </>
          )}
          {page === 'Transactions' && (
            <>
              <div className="transaction-summary">
                <span>
                  <strong>{filtered.length}</strong> matching transactions
                </span>
                <span>
                  Net amount{' '}
                  <strong>{money(filtered.reduce((sum, t) => sum + t.amount, 0))}</strong>
                </span>
              </div>
              <section className="card">
                <div className="table-toolbar">
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      id="transaction-search"
                      aria-label="Search transactions"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search merchants, categories, accounts…"
                    />
                  </div>
                  <div className="filter-field">
                    <SlidersHorizontal size={15} />
                    <select
                      aria-label="Filter category"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>All categories</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {transactionTable()}
              </section>
              <p className="section-note">
                Use the category dropdown to correct a transaction. Transfers are excluded from
                spending and income. Refunds reduce category spending.
              </p>
            </>
          )}
          {page === 'Budgets' && (
            <>
              <div className="budget-banner">
                <div>
                  <span className="eyebrow">YOUR MONTHLY PLAN</span>
                  <h2>
                    {money(totalBudget)}{' '}
                    <span>planned across {state.budgets.length} categories</span>
                  </h2>
                </div>
                <div>
                  <strong>{totalBudget ? Math.round((budgetUsed / totalBudget) * 100) : 0}%</strong>
                  <span>of budget used</span>
                </div>
              </div>
              {state.budgets.length ? (
                <div className="budget-grid">
                  {state.budgets.map((b, i) => {
                    const used = s.byCategory[b.category] || 0;
                    const percent = Math.max(0, Math.round((used / b.limit) * 100));
                    return (
                      <div key={b.category} className="card budget-card">
                        <div className="card-header">
                          <span
                            className="category-symbol"
                            style={{ background: `${colors[i % colors.length]}25` }}
                          >
                            <Wallet size={20} />
                          </span>
                          <div className="inline-actions">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${b.category} budget`}
                              onClick={() => setEditor(`budget:${b.category}`)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button subtle"
                              aria-label={`Delete ${b.category} budget`}
                              onClick={() => mutate('budgets', { id: b.category }, 'DELETE')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <h3>{b.category}</h3>
                        <p className="budget-card-amount">
                          {money(used)} <span>/ {money(b.limit)}</span>
                        </p>
                        <Progress
                          value={percent}
                          color={
                            percent > 100
                              ? '#b76d52'
                              : percent > 80
                                ? '#ba9552'
                                : colors[i % colors.length]
                          }
                        />
                        <div className="goal-meta">
                          <span>
                            {money(Math.abs(b.limit - used))}{' '}
                            {used > b.limit ? 'over budget' : 'left'}
                          </span>
                          <span>{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card">
                  <Empty
                    title="A little intention for every dollar"
                    text="Choose a category and a monthly limit. You can adjust as life changes."
                    action={
                      <button className="button primary" onClick={() => setEditor('budget')}>
                        Set your first budget <Plus size={16} />
                      </button>
                    }
                  />
                </div>
              )}
              <p className="section-note">
                Category budgets repeat monthly. Totals include posted transactions only. Unbudgeted
                categories are excluded from the budget total.
              </p>
            </>
          )}
          {page === 'Goals' && (
            <>
              {state.goals.length ? (
                goalsGrid()
              ) : (
                <div className="card">
                  <Empty
                    title="What does your next chapter look like?"
                    text="A safety net, a big trip, a place to call home. Give it a name and a plan."
                    action={
                      <button className="button primary" onClick={() => setEditor('goal')}>
                        Create your first goal <Plus size={16} />
                      </button>
                    }
                  />
                </div>
              )}
              <div className="gentle-note">
                <Leaf size={23} />
                <div>
                  <strong>Progress doesn’t have to be perfect.</strong>
                  <p>
                    Goal amounts are tracked manually. Updating a goal doesn’t transfer money or
                    update your account balances.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === 'Accounts' && (
            <>
              <div className="account-total">
                <span className="eyebrow">RECORDED NET BALANCE</span>
                <h2>{money(total)}</h2>
                <p>Across {state.accounts.length} manual account snapshots · USD</p>
              </div>
              {state.accounts.length ? (
                <div className="accounts-grid">
                  {state.accounts.map((a, i) => (
                    <div key={a.id} className={`account-card account-style-${i % 3}`}>
                      <div className="account-top">
                        <span>{a.institution}</span>
                        <CreditCard size={23} />
                      </div>
                      <span className="account-type">
                        {a.type.toUpperCase()} · •••• {a.last4}
                      </span>
                      <h3>{a.name}</h3>
                      <div className="account-balance">{money(a.balance)}</div>
                      <div className="account-footer">
                        <span>Manual balance</span>
                        <button onClick={() => setEditor(`balance:${a.id}`)}>
                          Update <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card">
                  <Empty
                    title="Start with one account"
                    text="Add a manual balance to see your financial picture take shape."
                    action={
                      <button className="button primary" onClick={() => setEditor('account')}>
                        Add an account <Plus size={16} />
                      </button>
                    }
                  />
                </div>
              )}
              <div className="gentle-note">
                <ShieldCheck size={23} />
                <div>
                  <strong>Your bank credentials stay with you.</strong>
                  <p>
                    This release supports manual accounts only. Bank aggregation is not enabled.
                    Balance snapshots are independent of transaction entries.
                  </p>
                </div>
              </div>
              <section className="card forecast-card">
                <div className="card-header">
                  <div>
                    <h2>A look ahead</h2>
                    <p>Illustrative month-end checking balance</p>
                  </div>
                  <TrendingUp size={20} />
                </div>
                <div className="forecast-number">{money(f.projected)}</div>
                <p className="muted">
                  Spending-sensitivity range: {money(f.low)} – {money(f.high)}
                </p>
                <p className="section-note">
                  {f.assumptions} Add a checking account and current-month spending for a useful
                  estimate.
                </p>
              </section>
            </>
          )}
          {page === 'AI Assistant' && (
            <section className="assistant-layout">
              <div className="card chat-card">
                <div className="chat-head">
                  <span className="spark-tile">
                    <Sparkles size={22} />
                  </span>
                  <div>
                    <strong>Meet your financial sidekick</strong>
                    <small>{state.assistantMode} · No money movement</small>
                  </div>
                  <button className="text-button" onClick={() => setMessages([])}>
                    New chat <Plus size={14} />
                  </button>
                </div>
                <div className="chat-messages" aria-live="polite">
                  {!messages.length && (
                    <div className="chat-welcome">
                      <div className="chat-orb">
                        <Sparkles size={30} />
                      </div>
                      <h2>Let’s make sense of your money.</h2>
                      <p>No question too small. Start with what’s on your mind.</p>
                      <div className="suggested-grid">
                        {[
                          'Where is my money going?',
                          'How are my budgets?',
                          'What is my cash-flow forecast?',
                          'How much should I save for my goals?',
                        ].map((q) => (
                          <button key={q} onClick={() => ask(q)}>
                            {q}
                            <ArrowUpRight size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div className={`message ${m.role}`} key={i}>
                      {m.role === 'assistant' && (
                        <span className="message-icon">
                          <Sparkles size={17} />
                        </span>
                      )}
                      <div className="message-body">
                        <div className="message-text">{m.text}</div>
                        {m.answer && (
                          <>
                            <div className="answer-meta">
                              <ShieldCheck size={13} />
                              {m.answer.mode}
                            </div>
                            {m.answer.evidence.length > 0 && (
                              <details className="evidence">
                                <summary>
                                  View supporting data <ChevronDown size={13} />
                                </summary>
                                <dl>
                                  {m.answer.evidence.map((e, n) => (
                                    <div key={n}>
                                      <dt>{e.label}</dt>
                                      <dd>{e.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                                {m.answer.transactionIds.length > 0 && (
                                  <div className="source-list">
                                    {state.transactions
                                      .filter((t) => m.answer!.transactionIds.includes(t.id))
                                      .slice(0, 20)
                                      .map((t) => (
                                        <div key={t.id}>
                                          <span>
                                            {t.date} · {t.merchant}
                                          </span>
                                          <strong>{money(t.amount)}</strong>
                                        </div>
                                      ))}
                                    {m.answer.transactionIds.length > 20 && (
                                      <small>
                                        Showing 20 of {m.answer.transactionIds.length} supporting
                                        transactions. View Transactions for the full history.
                                      </small>
                                    )}
                                  </div>
                                )}
                                <small>
                                  Workspace data updated {new Date(m.answer.asOf).toLocaleString()}
                                </small>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {asking && (
                    <div className="message assistant">
                      <span className="message-icon">
                        <Sparkles size={17} />
                      </span>
                      <div className="thinking">
                        <LoaderCircle className="spin" size={16} />
                        Looking at your numbers…
                      </div>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                <form
                  className="chat-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(question);
                  }}
                >
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about your money…"
                    maxLength={1000}
                    aria-label="Ask your financial assistant"
                  />
                  <button
                    type="submit"
                    aria-label="Send question"
                    disabled={asking || !question.trim()}
                  >
                    <Send size={18} />
                  </button>
                </form>
                <p className="chat-disclaimer">
                  Estimates depend on your data. Educational planning support, not investment or tax
                  advice.
                </p>
              </div>
              <aside className="assistant-side">
                <div className="card">
                  <span className="leaf-tile">
                    <ShieldCheck size={22} />
                  </span>
                  <h3>Clarity you can trace.</h3>
                  <p>
                    Financial numbers come from calculations on your workspace data. Expand
                    supporting data to see where an answer comes from.
                  </p>
                  <ul>
                    <li>Posted activity, with transfers excluded</li>
                    <li>Manual balances, clearly labeled</li>
                    <li>Forecast assumptions made visible</li>
                  </ul>
                </div>
                <div className="assistant-side-note">
                  <Leaf size={23} />
                  <p>
                    Use “this month”, “last month”, or a specific month like{' '}
                    <strong>{monthKey()}</strong> in your question.
                  </p>
                </div>
              </aside>
            </section>
          )}
          {page === 'Settings' && (
            <div className="settings-grid">
              <section className="card settings-card">
                <h2>Your workspace</h2>
                <dl className="settings-list">
                  <div>
                    <dt>Name</dt>
                    <dd>{state.user.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{state.user.email || 'Not required for demo'}</dd>
                  </div>
                  <div>
                    <dt>Data mode</dt>
                    <dd>{state.user.demo ? 'Isolated demo data' : 'Manual entries'}</dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>USD</dd>
                  </div>
                  <div>
                    <dt>Assistant</dt>
                    <dd>{state.assistantMode}</dd>
                  </div>
                  <div>
                    <dt>Last data change</dt>
                    <dd>{new Date(state.updatedAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </section>
              <section className="card settings-card">
                <h2>Your data belongs to you.</h2>
                <p>Export your account snapshots, transactions, budgets, and goals as JSON.</p>
                <a className="button secondary" href="/api/export" download>
                  <Download size={16} />
                  Export my data
                </a>
                <hr />
                <h3>AI & privacy</h3>
                <p>
                  Without an OpenAI key, questions are processed locally. When configured, your
                  question is sent to OpenAI for intent classification. Account balances and
                  transaction history are not included in that request. Avoid putting sensitive
                  identifiers in your questions.
                </p>
                <p>
                  Chat is held in this browser session and is cleared when you sign out or reload.
                  Workspace data is stored in the application’s database.
                </p>
              </section>
              <section className="card settings-card danger-zone">
                <h2>Delete workspace</h2>
                <p>
                  Permanently delete your account, sessions, and financial records from the active
                  database. Operator backups may retain historical copies until their retention
                  period expires.
                </p>
                <button className="button danger-outline" onClick={() => setEditor('delete')}>
                  <Trash2 size={16} />
                  Delete my workspace
                </button>
              </section>
            </div>
          )}
          <footer className="app-footer">
            <span>
              <Leaf size={13} /> A little clarity goes a long way.
            </span>
            <span>
              {state.user.demo ? 'Sample data · ' : 'Manual data · '}USD · Updated{' '}
              {new Date(state.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </footer>
        </main>
      </div>
      {editor && <Editor kind={editor} state={state} onClose={() => setEditor('')} onSave={save} />}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function CashChart({ state, month }: { state: State; month: string }) {
  const [year, m] = month.split('-').map(Number);
  const points = Array.from({ length: 6 }, (_, i) => {
    const key = monthKey(new Date(Date.UTC(year, m - 6 + i, 1)));
    return { key, ...summarize(state.transactions, key) };
  });
  const max = Math.max(10000, ...points.flatMap((p) => [p.income, p.spending]));
  const ceiling = Math.ceil(max / 100000) * 100000;
  return (
    <div className="bar-chart">
      <div className="chart-axis">
        {[1, 0.75, 0.5, 0.25, 0].map((n) => (
          <span key={n}>
            {(ceiling * n) / 100 >= 1000
              ? `$${((ceiling * n) / 100000).toFixed((ceiling * n) % 100000 ? 1 : 0)}k`
              : `$${(ceiling * n) / 100}`}
          </span>
        ))}
      </div>
      <div className="chart-plot">
        <div className="grid-lines">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} />
          ))}
        </div>
        <div className="bar-groups">
          {points.map((p) => (
            <div className="bar-group" key={p.key}>
              <div className="bar-pair">
                <div
                  className="bar income"
                  style={{ height: `${(Math.max(0, p.income) / ceiling) * 100}%` }}
                  title={`${p.key} income: ${money(p.income)}`}
                  aria-label={`${p.key} income: ${money(p.income)}`}
                />
                <div
                  className="bar expense"
                  style={{ height: `${(Math.max(0, p.spending) / ceiling) * 100}%` }}
                  title={`${p.key} spending: ${money(p.spending)}`}
                  aria-label={`${p.key} spending: ${money(p.spending)}`}
                />
              </div>
              <span>
                {new Date(p.key + '-02T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Donut({ entries, period }: { entries: [string, number][]; period: string }) {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let cumulative = 0;
  const gradient = entries
    .map(([, value], i) => {
      const start = cumulative;
      cumulative += (value / total) * 100;
      return `${colors[i % colors.length]} ${start}% ${cumulative}%`;
    })
    .join(',');
  return (
    <div
      className="donut"
      role="img"
      aria-label={`Spending breakdown: ${entries.map(([c, v]) => `${c} ${money(v)}`).join(', ')}`}
      style={{ background: `conic-gradient(${gradient})` }}
    >
      <div>
        <span>Total spent</span>
        <strong>{money(total)}</strong>
        <small>{fmtMonth(period)}</small>
      </div>
    </div>
  );
}
