export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
};

export type Backup = {
  app: "yiyizhang";
  version: 1;
  currency: "CNY";
  exportedAt: string;
  budget: number;
  expenses: Expense[];
};

export const EXPENSES_KEY = "yiyizhang-expenses-v1";
export const BUDGET_KEY = "yiyizhang-budget-v1";

export const CATEGORIES = [
  { id: "food", label: "餐饮", color: "#bd7950" },
  { id: "transport", label: "交通", color: "#55877a" },
  { id: "shopping", label: "购物", color: "#b89b55" },
  { id: "bills", label: "居家", color: "#6f8196" },
  { id: "entertainment", label: "娱乐", color: "#947d9a" },
  { id: "health", label: "健康", color: "#748d67" },
  { id: "education", label: "学习", color: "#6289a3" },
  { id: "other", label: "其他", color: "#8b8d86" },
] as const;

export const categoryOf = (id: string) => CATEGORIES.find((item) => item.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatCurrency = (amount: number) => new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);

export const formatDate = (value: string) => new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "long", day: "numeric",
}).format(new Date(`${value}T00:00:00`));

const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
};

export const validExpense = (value: unknown): value is Expense => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 100
    && typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 && item.amount <= 100000000
    && typeof item.category === "string" && CATEGORIES.some((category) => category.id === item.category)
    && validDate(item.date) && typeof item.note === "string" && item.note.length <= 100;
};

export const parseBackup = (text: string): Backup => {
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== "object") throw new Error("备份文件格式不正确。");
  const value = raw as Record<string, unknown>;
  if (value.app !== "yiyizhang" || value.version !== 1 || value.currency !== "CNY") {
    throw new Error("请选择一页账导出的人民币 JSON 备份。");
  }
  if (typeof value.budget !== "number" || !Number.isFinite(value.budget) || value.budget < 0 || value.budget > 100000000) {
    throw new Error("备份中的预算金额无效。");
  }
  if (!Array.isArray(value.expenses) || value.expenses.length > 100000 || !value.expenses.every(validExpense)) {
    throw new Error("备份中的支出记录无效。");
  }
  const ids = new Set(value.expenses.map((item: Expense) => item.id));
  if (ids.size !== value.expenses.length) throw new Error("备份中存在重复记录。");
  return value as Backup;
};

export const makeBackup = (expenses: Expense[], budget: number): Backup => ({
  app: "yiyizhang", version: 1, currency: "CNY", exportedAt: new Date().toISOString(), budget, expenses,
});

export const readExpenses = (): Expense[] => {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(validExpense) : [];
  } catch { return []; }
};

export const readBudget = (): number => {
  const value = Number(localStorage.getItem(BUDGET_KEY));
  return Number.isFinite(value) && value >= 0 ? value : 0;
};
