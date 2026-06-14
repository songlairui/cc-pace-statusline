# cc-pace-statusline

> English: [README.md](./README.md)

一个克制的 [Claude Code](https://claude.ai/code) statusLine 配置。一行里塞了两个想法：

1. **配速标记（pace marker）**：在速率限制条上画一个"现在时间在哪儿"的标尺，并且**当用量越过这条线，标记自身的字形和颜色都会变**——所以"领先 vs 落后"由标记直接告诉你。
2. **Floyd–Steinberg 抖动**：进度条本体不再是粗暴的 ▓/░ 二态，而是用 4 级灰阶 + F-S 误差扩散，让 5 格的条能表达接近 1% 的精度。

```
Opus·high   ctx ▒▒▒░▒ 28%   5h ▒░▒│░ 23%   7d ░▒░░│░░ 10%
                                  ↑                ↑
                            5h 已过 3 小时，   7d 是第 4 天 / 共 7 天，
                            用量 23%，标记在     用量 10%，标记远在
                            填充之后 → 慢于配速   填充之后 → 放心
                            → 细绿 │
```

当用量冲到时间配速之前，标记翻成粗紫 `┃`：

```
Opus·high   ctx █▓██▓ 88% !200k   5h ▓█▓┃▓ 82%   7d █▓██┃▓█ 90%
```

也就是说**标记本身就是警报**。你不用再比较"填充边缘"和"标记位置"——标记的颜色和粗细已经在喊"你超前了"。

## 你看到的是什么

### 配速标记

每个速率限制条都额外有一个字形——**配速标记**——落在"现在"这个时刻对应的那一格。

- `5h` 条：**5 格 = 每格 1 小时**
- `7d` 条：**7 格 = 每格 1 天**

它有两种形态：

| 字形 | 颜色 | 含义 |
| --- | --- | --- |
| `│`（细） | 亮绿 | 用量**落后**于时间配速 → 还有富余 |
| `┃`（粗） | 亮品红 | 用量**领先**于时间配速 → 该慢一点 |

判定逻辑就是 `usage_pct > elapsed_pct`。这个信号靠标记的颜色和粗细传递，不依赖你去对比"填充边缘"和"标记位置"。

### 进度条的纹理是抖动，不是噪声

每一格从四级灰阶里挑一个——`░ ▒ ▓ █`——用 **1D Floyd–Steinberg 误差扩散** 决定。5 格的平均密度等于真实百分比（粒度受调色板限制）。所以 28% 渲染成 `▒▒▒░▒` 而不是 `▓░░░░`（那种二值渲染会强行四舍五入到 20%）。不同百分比的纹理可视化区分度很高：

```
 5%   ░░░▒░             50%   ▓▒▓▓▒             95%   ████▓
12%   ░▒░░▒             55%   ▓▒▓▓▒             88%   █▓██▓
28%   ▒▒▒░▒             67%   ▓▓▓▒▓
```

附带好处：百分比小幅变化会让纹理明显抖动，而朴素渲染要等下一个 20% 阶跃才会动。

### 为什么 7d 永远显示

早先版本只在"用量偏离时间配速 ≥ 20pp"时才显示 7d 段。问题：**段的"出现/消失"本身变成了一条需要你记住的隐藏规则**——statusLine 不该让你背规则。现在只要数据存在 7d 就一直在。第 1 天标记紧贴左缘、条几乎是空的，也是有效信息："新一周刚开始，你拥有一切。"

## 设计取舍

- **就一行。** 两行 statusLine 占地方，resize 时还会闪。
- **不用 emoji。** 在老终端里宽度不可控；语义全交给颜色 + 位置。
- **不显示 git、cwd、cost、duration。** shell prompt 已经给了路径和分支；花费和时长是事后账，不是当下信号。
- **只保留三个能行动的信号：** 上下文窗口、5 小时速率、7 天速率。
- **`!200k`** 在 [`exceeds_200k_tokens`](https://docs.claude.com/en/docs/claude-code/statusline) 为真时出现——那是计费和延迟性质突变的拐点。

## 安装

需要 Claude Code v2.1.x 和 Node.js。

```bash
# 1. 把脚本放到 settings 同级
curl -fsSLo ~/.claude/statusline.mjs \
  https://raw.githubusercontent.com/songlairui/cc-pace-statusline/main/statusline.mjs
chmod +x ~/.claude/statusline.mjs

# 2. 把这一段加进 ~/.claude/settings.json
```

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.mjs",
    "padding": 2,
    "refreshInterval": 300
  }
}
```

`refreshInterval: 300` 让脚本每 5 分钟跑一次，确保 idle 会话里配速标记也会往前走。只想要事件驱动的话把这行删掉。

设置会自动 reload，下次和 Claude Code 交互时即可看到。

## 配色规则

| 段 | 条调色板 | 绿色阈值 | 黄色阈值 | 红色阈值 |
| --- | --- | --- | --- | --- |
| `ctx` | 抖动 `░▒▓█` | < 60% | 60–84% | ≥ 85% |
| `5h` | 抖动 `░▒▓█` | < 50% | 50–79% | ≥ 80% |
| `7d` | 抖动 `░▒▓█` | < 50% | 50–79% | ≥ 80% |
| `!200k` | — | — | — | 红 |

配速标记的颜色和条调色板独立：落后 = 亮绿，领先 = 亮品红。这样无论条本身是绿/黄/红，标记都仍然可见。

## 调参

```js
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;
const DITHER_LEVELS = [0, 1/3, 2/3, 1];
const DITHER_CHARS = ['░', '▒', '▓', '█'];
```

颜色阈值写在 segment renderer 里——ctx 是 `[60, 85]`，5h 和 7d 都是 `[50, 80]`，随便改。

## 故意没做的事

下面这些都考虑过又砍掉了。需要的话 fork 一份自己加：

- 花费（`cost.total_cost_usd`）
- 时长（`cost.total_duration_ms`）
- Git 分支 / 改动状态
- 工作目录
- PR 徽章
- Subagent 名
- 输出风格
- Thinking 指示
- 5h / 7d 重置倒计时（进度条 + 标记已经表达了）

原则：statusLine 的位置很贵，只配显示"你本来要主动去查才能知道的信息"。

## 一起聊

- Twitter / X：<https://x.com/songlairui/status/2066161137000034570>
- 微博：<https://weibo.com/1770160121/R47P6jQS4>

## License

MIT.

---

— by songlairui 的 Claude Opus 4.7
