import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronRight, Github, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { BUDGET_KEY, CATEGORIES, EXPENSES_KEY, categoryOf, formatCurrency, formatDate, makeBackup, parseBackup, readBudget, readExpenses, todayKey, type Backup, type Expense } from "@/lib/ledger";

const REPOSITORY_URL = "https://github.com/Star23666/Ledgerly";
const newForm = () => ({ amount: "", category: "food", date: todayKey(), note: "" });
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveCsv(expenses: Expense[]) {
  const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = ["日期,分类,金额,备注", ...expenses.map((item) => [item.date, categoryOf(item.category).label, item.amount, item.note].map(cell).join(","))];
  download(`\uFEFF${rows.join("\r\n")}`, "一页账-支出.csv", "text/csv;charset=utf-8");
  toast.success("CSV 已导出");
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>(readExpenses);
  const [budget, setBudget] = useState(readBudget);
  const [period, setPeriod] = useState("this-month");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(newForm);
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthTitle = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(now);

  useEffect(() => { try { localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses)); } catch { toast.error("存储空间不足，请先导出备份。"); } }, [expenses]);
  useEffect(() => { try { localStorage.setItem(BUDGET_KEY, String(budget)); } catch { toast.error("预算未能保存，请检查浏览器存储空间。"); } }, [budget]);

  const monthlyExpenses = useMemo(() => expenses.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  }), [expenses, year, month]);
  const monthTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = budget - monthTotal;
  const budgetProgress = budget > 0 ? Math.min(100, monthTotal / budget * 100) : 0;
  const visibleExpenses = useMemo(() => {
    const previous = new Date(year, month - 1, 1);
    const query = search.trim().toLocaleLowerCase("zh-CN");
    return expenses.filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      if (period === "this-month" && (date.getFullYear() !== year || date.getMonth() !== month)) return false;
      if (period === "last-month" && (date.getFullYear() !== previous.getFullYear() || date.getMonth() !== previous.getMonth())) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return !query || `${item.note} ${categoryOf(item.category).label}`.toLocaleLowerCase("zh-CN").includes(query);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, period, categoryFilter, search, year, month]);
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(year, month, now.getDate() - 6 + index);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { name: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(day), amount: expenses.filter((item) => item.date === key).reduce((sum, item) => sum + item.amount, 0) };
  }), [expenses, year, month, now.getDate()]);
  const categoryTotals = CATEGORIES.map((category) => ({ ...category, amount: monthlyExpenses.filter((item) => item.category === category.id).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);

  const resetForm = () => { setEditingId(null); setForm(newForm()); };
  const jumpToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !form.date) { toast.error("请输入有效的金额和日期。"); return; }
    const note = form.note.trim() || "未填写备注";
    if (editingId) {
      setExpenses((current) => current.map((item) => item.id === editingId ? { ...item, amount, category: form.category, date: form.date, note } : item));
      toast.success("支出已更新");
    } else {
      setExpenses((current) => [{ id: crypto.randomUUID(), amount, category: form.category, date: form.date, note }, ...current]);
      toast.success("支出已记录");
    }
    resetForm();
  };
  const handleEdit = (item: Expense) => { setEditingId(item.id); setForm({ amount: String(item.amount), category: item.category, date: item.date, note: item.note === "未填写备注" ? "" : item.note }); jumpToForm(); };
  const handleDelete = (item: Expense) => { if (!window.confirm(`删除“${item.note}”这笔 ${formatCurrency(item.amount)} 的支出？`)) return; setExpenses((current) => current.filter((entry) => entry.id !== item.id)); toast.success("支出已删除"); };
  const saveJson = () => { download(JSON.stringify(makeBackup(expenses, budget), null, 2), "一页账-备份.json", "application/json;charset=utf-8"); toast.success("JSON 备份已导出"); };
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("备份文件不能超过 5 MB。"); return; }
    try { setPendingBackup(parseBackup(await file.text())); }
    catch (error) { toast.error(error instanceof SyntaxError ? "JSON 文件无法读取。" : error instanceof Error ? error.message : "备份文件无效。"); }
  };
  const restore = () => { if (!pendingBackup) return; setExpenses(pendingBackup.expenses); setBudget(pendingBackup.budget); setPendingBackup(null); resetForm(); toast.success("备份已恢复"); };

  return <div className="app">
    <header className="site-header"><a className="wordmark" href="#top" aria-label="一页账，返回顶部"><span className="wordmark-icon" aria-hidden="true">一</span><span>一页账</span></a><nav aria-label="主导航"><a href="#overview">总览</a><a href="#records">支出记录</a><a href="#backup">数据备份</a></nav><span className="local-badge"><span/> 数据仅保存在本机</span></header>
    <main id="top">
      <section className="page-heading"><div><p className="date-line">{monthTitle} · 把每笔日常看清楚</p><h1>这个月，钱花在了哪里？</h1><p>记下一笔，留下一份清楚的生活账。</p></div><button type="button" className="primary-button heading-button" onClick={jumpToForm}><Plus size={18}/> 记一笔</button></section>
      <div className="dashboard" id="overview"><section className="receipt" aria-labelledby="receipt-title"><div className="receipt-top"><span>月度账页</span><span>{monthTitle}</span></div><p className="receipt-label" id="receipt-title">本月支出</p><strong className="receipt-total">{formatCurrency(monthTotal)}</strong><div className="receipt-line"/><div className="receipt-pair"><span>已记录</span><strong>{monthlyExpenses.length} 笔</strong></div><div className="receipt-pair"><span>月度预算</span><strong>{budget > 0 ? formatCurrency(budget) : "尚未设置"}</strong></div><div className="receipt-pair receipt-pair--final"><span>{budget > 0 ? (remaining >= 0 ? "预算剩余" : "超出预算") : "开始规划预算"}</span><strong>{budget > 0 ? formatCurrency(Math.abs(remaining)) : "从这里开始"}</strong></div><div className="receipt-progress" role="progressbar" aria-label="预算使用进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budgetProgress)}><span style={{ width: `${budgetProgress}%` }}/></div><p className="receipt-hint">{budget > 0 ? `已使用预算的 ${Math.round(monthTotal / budget * 100)}%` : "设置一个预算，随时知道还可以花多少。"}</p><label className="budget-field"><span>设置月度预算</span><span className="budget-input"><span>¥</span><input aria-label="月度预算金额" type="number" min="0" max="100000000" step="0.01" placeholder="输入金额" value={budget || ""} onChange={(event) => setBudget(Math.min(100000000, Math.max(0, Number(event.target.value) || 0)))}/></span></label></section>
        <div className="dashboard-side"><section className="surface trend-panel" aria-labelledby="trend-title"><div className="section-heading"><div><p className="section-overline">最近 7 天</p><h2 id="trend-title">支出趋势</h2></div><span>按记录日期统计</span></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 2 }}><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#508275" stopOpacity={0.24}/><stop offset="100%" stopColor="#508275" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8e6df" strokeDasharray="3 6"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#79847d", fontSize: 12 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#79847d", fontSize: 11 }} width={48}/><Tooltip formatter={(value) => [formatCurrency(Number(value)), "支出"]} contentStyle={{ borderRadius: 12, border: "1px solid #e6e4dc" }}/><Area type="monotone" dataKey="amount" stroke="#3e7769" strokeWidth={2.5} fill="url(#trendFill)"/></AreaChart></ResponsiveContainer></div></section><section className="surface category-panel" aria-labelledby="category-title"><div className="section-heading"><div><p className="section-overline">本月分布</p><h2 id="category-title">支出分类</h2></div></div>{categoryTotals.length ? <div className="category-list">{categoryTotals.slice(0, 5).map((item) => <div className="category-row" key={item.id}><span><i style={{ background: item.color }}/>{item.label}</span><div className="category-track"><i style={{ width: `${item.amount / monthTotal * 100}%`, background: item.color }}/></div><strong>{formatCurrency(item.amount)}</strong></div>)}</div> : <p className="quiet-empty">还没有本月支出。记下第一笔后，这里会显示分类情况。</p>}</section></div></div>
      <div className="lower-grid"><section className="surface records-panel" id="records" aria-labelledby="records-title"><div className="section-heading records-heading"><div><p className="section-overline">每一笔，都找得到</p><h2 id="records-title">支出记录 <small>{visibleExpenses.length} 笔</small></h2></div><button type="button" className="text-action" onClick={() => saveCsv(expenses)}><ArrowDownToLine size={16}/> 导出 CSV</button></div><div className="filters"><label className="search-field"><Search size={17}/><input type="search" aria-label="搜索支出记录" placeholder="搜索备注或分类" value={search} onChange={(event) => setSearch(event.target.value)}/></label><label><span className="sr-only">时间范围</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="this-month">本月</option><option value="last-month">上月</option><option value="all">全部时间</option></select></label><label><span className="sr-only">支出分类</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">全部分类</option>{CATEGORIES.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div><div className="record-list">{visibleExpenses.length ? visibleExpenses.map((item) => <article className="record-item" key={item.id}><span className="record-category-dot" style={{ background: categoryOf(item.category).color }}/><div className="record-main"><strong>{item.note}</strong><span>{categoryOf(item.category).label} · {formatDate(item.date)}</span></div><strong className="record-amount">{formatCurrency(item.amount)}</strong><div className="record-actions"><button type="button" onClick={() => handleEdit(item)} aria-label={`编辑${item.note}`} title="编辑"><Pencil size={17}/></button><button type="button" onClick={() => handleDelete(item)} aria-label={`删除${item.note}`} title="删除"><Trash2 size={17}/></button></div></article>) : <div className="records-empty"><span className="empty-illustration">＋</span><strong>{expenses.length ? "没有找到符合条件的支出" : "账页还是空的"}</strong><p>{expenses.length ? "试试更换时间、分类或搜索词。" : "记下第一笔日常开销，账页就会慢慢清晰。"}</p><button type="button" onClick={jumpToForm}>去记一笔 <ChevronRight size={16}/></button></div>}</div></section>
        <aside className="side-stack"><section className="surface entry-panel" ref={formRef} id="record-expense" aria-labelledby="entry-title"><div className="section-heading"><div><p className="section-overline">{editingId ? "修改记录" : "花了多少，记一下"}</p><h2 id="entry-title">{editingId ? "编辑支出" : "记一笔支出"}</h2></div>{editingId && <button type="button" className="icon-action" onClick={resetForm} aria-label="取消编辑"><X size={18}/></button>}</div><form onSubmit={handleSubmit} className="entry-form"><label>金额 <span>¥</span><input aria-label="支出金额" required type="number" min="0.01" max="100000000" step="0.01" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}/></label><div className="form-two"><label>分类<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>日期<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/></label></div><label>备注 <small>选填</small><input type="text" maxLength={100} placeholder="例如：午餐" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })}/></label><button className="primary-button" type="submit">{editingId ? <><Check size={18}/> 保存修改</> : <><Plus size={18}/> 保存这笔支出</>}</button></form></section><section className="surface backup-panel" id="backup"><div className="section-heading"><div><p className="section-overline">数据留在自己手里</p><h2>备份与恢复</h2></div></div><p>记录仅保存在当前浏览器。定期导出备份，换设备或清除浏览器数据前尤其重要。</p><div className="backup-actions"><button type="button" onClick={saveJson}><ArrowDownToLine size={17}/> 导出 JSON 备份</button><button type="button" onClick={() => fileInputRef.current?.click()}><ArrowUpFromLine size={17}/> 恢复备份</button></div><input ref={fileInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={handleFile} aria-label="选择 JSON 备份文件"/></section></aside></div>
    </main>
    <footer className="site-footer"><span>一页账 · 把日常记清楚</span><span>基于 <a href="https://github.com/vincenzo-afk/Ledgerly" target="_blank" rel="noreferrer">Ledgerly</a> 改造 · <a href={REPOSITORY_URL} target="_blank" rel="noreferrer"><Github size={14}/> 查看代码</a></span></footer>
    {pendingBackup && <div className="dialog-backdrop" role="presentation"><section className="restore-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-title"><button className="dialog-close" type="button" onClick={() => setPendingBackup(null)} aria-label="关闭"><X size={19}/></button><p className="section-overline">恢复数据</p><h2 id="restore-title">确认替换当前账本？</h2><p>备份中有 <strong>{pendingBackup.expenses.length} 笔支出</strong>，月度预算为 <strong>{formatCurrency(pendingBackup.budget)}</strong>。恢复后，当前浏览器内的 {expenses.length} 笔记录会被替换。建议先导出当前备份。</p><div className="dialog-actions"><button type="button" onClick={() => setPendingBackup(null)}>取消</button><button type="button" className="primary-button" onClick={restore}>确认恢复</button></div></section></div>}
  </div>;
}
