# 一页账

一页账是一款中文个人支出账本，基于 [Ledgerly](https://github.com/vincenzo-afk/Ledgerly) 改造。无需注册，支出和预算仅保存在当前浏览器。

## 功能

- 添加、编辑、删除支出；按时间、分类和关键词筛选。
- 查看本月支出、预算剩余、最近 7 天趋势和分类汇总。
- 导出全部支出的 CSV，或导出包含预算与记录的 JSON 备份。
- 导入一页账 JSON 备份。导入前会校验内容、显示记录数量，并要求确认替换当前账本。

## 本地运行

需要 Node.js 22 和 pnpm 10。项目锁文件对应 pnpm 10.4.1。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

检查和构建：

```bash
corepack pnpm run check
corepack pnpm run build
```

## 数据说明

新产品使用 `yiyizhang-expenses-v1` 和 `yiyizhang-budget-v1` 两个浏览器存储键。Ledgerly 原有的卢比数据不会自动迁移或换算为人民币。清除浏览器数据、使用隐私窗口或更换设备都可能导致记录不可见，请定期导出 JSON 备份。

备份格式包含 `app: "yiyizhang"`、`version: 1`、`currency: "CNY"`、预算和支出记录。恢复备份会替换当前浏览器内的全部一页账记录与预算。CSV 供查看和分析，不用于恢复。

## 页面设计

- [Canva 桌面页面稿](https://canva.link/an3val0cmnc3uvw)
- [Canva 手机页面稿](https://canva.link/j1hl4xli69go2uc)

## 许可与致谢

本项目基于 Ledgerly，沿用其 [MIT 许可证](./LICENSE)。原作者版权声明保留在 `LICENSE` 中。页面重新设计与中文化由本 Fork 维护。
