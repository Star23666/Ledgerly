import { describe, expect, it } from "vitest";
import { makeBackup, parseBackup, validExpense } from "./ledger";

const expense = { id: "one", amount: 18.5, category: "food", date: "2026-10-15", note: "早餐" };

describe("本地备份", () => {
  it("保留人民币预算与支出记录", () => {
    const backup = makeBackup([expense], 5000);
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({ currency: "CNY", budget: 5000, expenses: [expense] });
  });

  it("拒绝旧产品或外币文件，避免金额被误当人民币", () => {
    expect(() => parseBackup(JSON.stringify([expense]))).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...makeBackup([expense], 0), currency: "INR" }))).toThrow();
  });

  it("拒绝无效日期、负数和重复记录", () => {
    expect(validExpense({ ...expense, date: "2026-02-30" })).toBe(false);
    expect(validExpense({ ...expense, amount: -1 })).toBe(false);
    expect(() => parseBackup(JSON.stringify(makeBackup([expense, expense], 0)))).toThrow("重复");
  });
});
