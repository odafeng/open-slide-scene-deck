# open-slide-scene-deck

一張圖、一台攝影機的簡報做法，寫成 Claude Code 的 skill。

整場演講只有一張 4K 插畫。每一頁是攝影機在這張圖上的一個位置：推近老師的嘴巴、順著聲波飛到筆電、鑽進螢幕、跳到窗外的雲、最後拉回全景。說明文字放在螢幕座標的卡片上，而且要等鏡頭落地、場景先停一拍，卡片才進來。這是 Prezi 的感覺，用 [open-slide](https://www.npmjs.com/package/@open-slide/core) 做出來，不用 Prezi。

這套方法在 2026 年 11 月做出一場 22 個鏡頭、20 分鐘的開發者社群演講。open-slide 沒有攝影機 API，所以攝影機是在頁面元件裡自己驅動的：van Wijk–Nuij 的縮放路徑、沿貝茲曲線等速飛行、WAAPI keyframes 交給 compositor。實測 22 次換頁 0 個 long task、0 個超過 50 ms 的掉幀。

## 安裝成 skill

```sh
git clone https://github.com/odafeng/open-slide-scene-deck ~/.claude/skills/open-slide-scene-deck
```

之後在 Claude Code 裡提到「Prezi 那種會飛的簡報」「鏡頭推進拉遠的 deck」，skill 會自己接手。入口是 [`SKILL.md`](SKILL.md)。

## 裡面有什麼

| 路徑 | 內容 |
| --- | --- |
| [`SKILL.md`](SKILL.md) | 做法總覽、七個步驟、付過代價的規則 |
| [`template/index.tsx`](template/index.tsx) | 整個引擎加七個示範鏡頭，複製到 `slides/<id>/index.tsx` 就能跑 |
| [`template/assets/`](template/assets/) | 示範用的教室場景（2752 × 1536）、老師特寫、App 截圖 |
| [`references/`](references/) | 引擎細節、分鏡表、美術與量座標、驗證與錄影、上台 |
| [`scripts/`](scripts/) | 效能探測、走片錄影、格線量座標、Gemini 生圖、上台啟動器 |
| [`docs/adr/`](docs/adr/) | 為什麼攝影機放在頁面裡、為什麼卡片要等 |

## 試跑範本

在任何 open-slide 專案裡：

```sh
cp -r template slides/scene-deck-template
npm run dev
```

開 `http://localhost:5173/s/scene-deck-template`，按 F，用方向鍵翻七個鏡頭。

## 開發

```sh
npm ci
npm run typecheck   # 範本用 @open-slide/core 的型別檢查
npm test            # 攝影機數學的單元測試（van Wijk 路徑、貝茲等速、homography）
npm run check:scripts
```

Pre-commit hooks 在 `.pre-commit-config.yaml`；CI 跑同樣三件事。

## 來源

引擎和規則出自一場真實演講的準備過程，每一條 pitfall 都踩過一次。場景圖用 Gemini `gemini-3-pro-image` 生成；範本裡的圖已縮到一半尺寸。

MIT License。

---

**English.** A Claude Code skill for building Prezi-style "one picture, one camera" talk decks in open-slide: storyboard the stations, generate a 4K scene, drive the camera in-page (van Wijk zoom paths, bezier rides, a beat of hold before each card), verify with Playwright, record a walkthrough for phone review, present from a static build. Start at [`SKILL.md`](SKILL.md); the engine and a seven-shot example live in [`template/index.tsx`](template/index.tsx).
