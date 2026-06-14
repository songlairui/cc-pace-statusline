# cc-pace-statusline

> English: [README.md](./README.md)

一个克制的 [Claude Code](https://claude.ai/code) statusLine 配置。一行里塞了两个想法：

1. **配速标记（pace marker）**：在速率限制条上画一个"现在时间在哪儿"的标尺，并且**当用量越过这条线，标记自身的字形和颜色都会变**——"领先 vs 落后"由标记直接告诉你。
2. **边界格子颜色插值**：整条里只有"填充的最后一格"做事情——它从暗灰背景色到激活色之间做一次线性插值，按子格小数部分着色。其他格子要么是实心激活色、要么是实心灰。5 格因此获得约 1% 精度，且没有任何抖动噪声。

```
Opus·high   ctx [█▒   ]  28%   5h [█░ │ ]  23%   7d [█▓  │  ]  25%
                                       ↑                  ↑
                                 5h 已过 3 小时，    7d 是第 4 天 / 共 7 天，
                                 用量 23% —          用量 25% —
                                 细绿 │              细绿 │
                                 （慢于配速）         （慢于配速）
```

当用量冲到时间配速之前，标记翻成粗紫 `┃`：

```
Opus·high   ctx [████▒]  88% !200k   5h [███┃░]  82%   7d [████┃█░]  90%
```

当 marker 刚好踩在边界格子上（"恰好踩点"的那一刻），这一格的底色改用 marker 的颜色按子格小数插值，glyph 翻成白色——给"踩线"那一刻一个独立信号。

（上面方括号只是文档示意——你的终端里每个 cell 是一个有底色的色块，条里没有任何字符，唯一的字形只有 marker。）

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

### 用颜色而不是字形

每个 cell 就是一块带底色的色块——条本身里没有任何字符，唯一的 glyph 是 marker。颜色就是全部视觉语言：

- **实心 cell**（下面示意里的 `█`）：饱和的激活色（绿/黄/红 按阈值）。
- **空 cell**（` `）：暗灰。永远以"灰槽"的形式存在，所以条的范围在任何百分比下都不消失。
- **边界 cell**（下面示意里的 `░ ▒ ▓`）：填充的最后一格，按子格小数在"暗灰"和"激活色"之间**线性插值**。这是唯一携带子格精度的格子。

```
 0%   [     ]      40%   [██   ]      80%   [████ ]
20%   [█    ]      45%   [██░  ]      88%   [████▒]
25%   [█░   ]      50%   [██▒  ]      95%   [████▓]
30%   [█▒   ]      60%   [███  ]     100%   [█████]
```

（示意里的 `░ ▒ ▓` 只是为了在 README 里区分"边界 cell 的低/中/高饱和度"——在终端里它是真正的插值底色，不是字符。）

为什么不用 Floyd–Steinberg 抖动？试过，5 格分辨率下误差扩散不再是"知觉融合"的小把戏，而是肉眼可见的噪声——每个百分比都出现散落的斑点，读起来是"嘈杂"而不是"满 / 空"。在单个边界 cell 上做颜色插值给出同等精度，零噪声。

### marker 是怎么叠上去的

marker（`│` 或 `┃`）以**前景 glyph** 的形式画在它落点的那个 cell 上。终端在 bg 之上画 fg，所以：

- marker 在空 cell 上：marker 色的竖线，画在暗灰底上。
- marker 在实心 cell 上：marker 色的竖线，画在激活色底上（高对比——亮绿 vs 实红、亮品红 vs 实黄等）。
- marker 正好落在边界 cell 上：这一格的底色改用 marker 的色（按子格小数插值），glyph 翻成白色。这就是"恰好踩点"的高亮。

所以 marker 不和条争 cell 空间——它是单独的一条通道，叠在条之上。

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

所有颜色都以 24-bit truecolor 输出（`\033[38;2;r;g;b m` / `\033[48;2;r;g;b m`），渲染不受终端主题影响。

| 段 | 实心 cell 填充色 | 绿色阈值 | 黄色阈值 | 红色阈值 |
| --- | --- | --- | --- | --- |
| `ctx` | `rgb(60,180,80)` / `rgb(220,180,30)` / `rgb(220,70,70)` | < 60% | 60–84% | ≥ 85% |
| `5h` | 同上三色 | < 50% | 50–79% | ≥ 80% |
| `7d` | 同上三色 | < 50% | 50–79% | ≥ 80% |
| `!200k` | — | — | — | 红 |

marker 颜色独立于条调色板：`rgb(80,255,120)`（亮绿，落后）和 `rgb(255,100,255)`（亮品红，领先）。空 cell 背景 `rgb(60,60,60)`。marker 与边界 cell 重合时，glyph 翻成白色 `rgb(240,240,240)`。

Truecolor 在 Ghostty、iTerm2、Kitty、WezTerm、Alacritty、近期 Windows Terminal、新版 xterm 都支持。如果你的终端只支持 256 色，颜色会近似，但布局不变。

## 调参

```js
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;

const BG_GRAY = [60, 60, 60];
const BAR_GREEN = [60, 180, 80];
const BAR_YELLOW = [220, 180, 30];
const BAR_RED = [220, 70, 70];
const MARKER_BEHIND = [80, 255, 120];
const MARKER_AHEAD = [255, 100, 255];
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
