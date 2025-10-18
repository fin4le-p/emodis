"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Analytics from "./analytics";

/**
 * EmojiDesigner (Next.js App Router 用 完全版)
 * - 3文字(横一列)=自動 2.5x 縦伸ばし
 * - 5,6文字=自動 1.65x 縦伸ばし
 * - 自動/手動切替（手動は初期 1.0）
 * - 外枠/ギャップは0固定、Disable表示
 * - フォント：ポプらむキュート / 無心 / 游ゴシック / メイリオ
 * - 背景 有効/色、縁色/太さ、フォント倍率
 * - 3文字レイアウト切替：横一列 / 上2+下1
 */

// ===== フォントオプション（コンポーネント外に固定して ESLint を満たす） =====
const FONT_OPTIONS = [
  { key: "pop", label: "ポプらむキュート", family: '"PopRumCute", "Yu Gothic", "Meiryo", sans-serif' },
  { key: "mushin", label: "無心", family: '"Mushin", "Yu Gothic", "Meiryo", sans-serif' },
  { key: "yugothic", label: "游ゴシック", family: '"Yu Gothic", "Meiryo", sans-serif' },
  { key: "meiryo", label: "メイリオ", family: '"Meiryo", sans-serif' },
] as const;

// 型（"any" を避ける）
type ThreeMode = "row" | "twoPlusOne";

// ===== Helpers =====
function measureText(ctx: CanvasRenderingContext2D, ch: string, strokePx: number) {
  const m = ctx.measureText(ch);
  const asc = m.actualBoundingBoxAscent ?? 0;
  const desc = m.actualBoundingBoxDescent ?? 0;
  const h = asc + desc + strokePx * 2; // include stroke for fit
  const w = (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width) + strokePx * 2;
  const width = Math.max(w, m.width + strokePx * 2);
  return { width, height: h, asc, desc };
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  ch: string,
  cellW: number,
  cellH: number,
  padding: number,
  strokePx: number,
  baseFamily: string,
  stretchY: number,
  minPx = 8,
  maxPx = 512
) {
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `${mid}px ${baseFamily}`;
    ctx.lineWidth = strokePx;
    const { width, height } = measureText(ctx, ch, strokePx);
    const effW = width;              // 横はそのまま
    const effH = height * stretchY;  // 縦だけ拡大して判定
    if (effW <= cellW - padding * 2 && effH <= cellH - padding * 2) {
      best = mid;
      lo = mid + 2;
    } else {
      hi = mid - 2;
    }
  }
  return best;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// outer=0, gap=0 固定。n=3/5/6 は特殊配置。
function computeCells(size: number, n: number, threeMode: ThreeMode) {
  const cells: { x: number; y: number; w: number; h: number; cx: number; cy: number }[] = [];
  if (n <= 0) return cells;

  if (n === 1) {
    const w = size, h = size;
    cells.push({ x: 0, y: 0, w, h, cx: w / 2, cy: h / 2 });
    return cells;
  }

  if (n === 2) {
    const w = Math.floor(size / 2), h = size;
    for (let c = 0; c < 2; c++) {
      const x = c * w, y = 0;
      cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    }
    return cells;
  }

  if (n === 3) {
    if (threeMode === "row") {
      const w = Math.floor(size / 3), h = size;
      for (let c = 0; c < 3; c++) {
        const x = c * w, y = 0;
        cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
      return cells;
    } else {
      const rowH = Math.floor(size / 2);
      // 上段2
      for (let c = 0; c < 2; c++) {
        const w = Math.floor(size / 2), h = rowH;
        const x = c * w, y = 0;
        cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
      // 下段1（中央）
      {
        const w = size, h = rowH;
        const x = 0, y = rowH;
        cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
      return cells;
    }
  }

  if (n === 4) {
    const w = Math.floor(size / 2), h = Math.floor(size / 2);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const x = c * w, y = r * h;
        cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
    }
    return cells;
  }

  if (n === 5) {
    const rowH = Math.floor(size / 2);
    // 上段3
    for (let c = 0; c < 3; c++) {
      const w = Math.floor(size / 3), h = rowH;
      const x = c * w, y = 0;
      cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    }
    // 下段2（中央揃え = 全幅を2分割）
    for (let c = 0; c < 2; c++) {
      const w = Math.floor(size / 2), h = rowH;
      const x = c * w, y = rowH;
      cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    }
    return cells;
  }

  if (n >= 6) {
    // 3x2 （各セル h=size/2, w=size/3 → やや縦長）
    const w = Math.floor(size / 3), h = Math.floor(size / 2);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const x = c * w, y = r * h;
        cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
    }
    return cells.slice(0, n);
  }

  return cells;
}

export default function EmojiDesigner() {
  const [text, setText] = useState("四字熟語");
  const [size, setSize] = useState(128);
  const [fill, setFill] = useState("#ff3b30");
  const [stroke, setStroke] = useState("#ffffff");
  const [strokePx, setStrokePx] = useState(6);

  // 背景
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState("#000000");

  // 固定: gap は 0（outer は未使用のため削除）
  const innerGap = 0;

  // フォント倍率（固定pxは廃止）
  const [fontScale, setFontScale] = useState(1.3);

  // フォント
  const [fontKey, setFontKey] = useState<(typeof FONT_OPTIONS)[number]["key"]>("pop");
  const fontFamily = useMemo(() => FONT_OPTIONS.find(f => f.key === fontKey)!.family, [fontKey]);

  // 3文字専用レイアウト
  const [threeMode, setThreeMode] = useState<ThreeMode>("row");

  // 縦伸ばし: 自動/手動（手動の初期値=1.0）
  const [stretchAuto, setStretchAuto] = useState(true);
  const [stretchY, setStretchY] = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chars = useMemo(() => Array.from(text.trim()).slice(0, 6), [text]);

  // WebFontロード完了待ち（初回/切替のズレ防止）
  const [fontLoadedToken, setFontLoadedToken] = useState(0);
  useEffect(() => {
    const fam = fontFamily;
    document.fonts?.load(`64px ${fam}`).then(() => setFontLoadedToken(v => v + 1)).catch(() => setFontLoadedToken(v => v + 1));
  }, [fontFamily]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 背景
    if (bgEnabled) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.clearRect(0, 0, size, size);
    }

    const cells = computeCells(size, chars.length || 1, threeMode);

    // 自動既定
    const computedAuto = (() => {
      const n = chars.length;
      if (n === 3 && threeMode === "row") return 2.5; // 3横
      if (n === 5 || n === 6) return 1.65;             // 5・6文字
      return 1.0;
    })();

    // 実効の縦伸ばし率
    const needsStretch = (chars.length === 3 && threeMode === "row") || chars.length === 5 || chars.length === 6;
    const effStretchY = needsStretch ? (stretchAuto ? computedAuto : Math.max(0.1, stretchY)) : 1.0;

    // 文字ごとのサイズ算出
    const sizes: number[] = [];
    const family = fontFamily;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const { w, h } = cells[i]!;
      const padding = Math.max(2, Math.floor(Math.min(w, h) * 0.06));
      const s = fitFontSize(ctx, ch, w - innerGap, h - innerGap, padding, strokePx, family, effStretchY);
      sizes.push(Math.max(4, Math.floor(s * fontScale)));
    }

    // 描画
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const { cx, cy } = cells[i]!;
      const fs = sizes[i]!;

      ctx.font = `${fs}px ${family}`;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const m = ctx.measureText(ch);
      const asc = m.actualBoundingBoxAscent ?? fs * 0.8;
      const desc = m.actualBoundingBoxDescent ?? fs * 0.2;
      const textH = asc + desc;
      const preScaleBaselineY = (asc - textH / 2); // 中央合わせ

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, effStretchY); // 縦のみ拡大

      const lw = strokePx / effStretchY; // 縦拡大の分だけ補正
      if (stroke && strokePx > 0) {
        ctx.lineWidth = lw;
        ctx.strokeStyle = stroke;
        ctx.strokeText(ch, 0, preScaleBaselineY);
      }
      ctx.fillStyle = fill;
      ctx.fillText(ch, 0, preScaleBaselineY);

      ctx.restore();
    }
  }, [text, size, fill, stroke, strokePx, bgEnabled, bgColor, fontScale, fontFamily, threeMode, stretchAuto, stretchY, chars, fontLoadedToken]);

  const onDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${text || "emoji"}.png`);
    }, "image/png");
  };

  const showStretchUI = (chars.length === 3 && threeMode === "row") || chars.length === 5 || chars.length === 6;

  const uiComputedAuto = useMemo(() => {
    if (chars.length === 3 && threeMode === "row") return 2.5;
    if (chars.length === 5 || chars.length === 6) return 1.65;
    return 1.0;
  }, [chars.length, threeMode]);
  const uiEffStretch = showStretchUI ? (stretchAuto ? uiComputedAuto : Math.max(0.1, stretchY)) : 1.0;

  return (
    <div className="min-h-screen w-full flex flex-col gap-6 p-6 bg-neutral-950 text-neutral-100">
      <Analytics />
      <h1 className="text-2xl font-bold">Discord 絵文字ジェネレーター（Discord emoji generator）</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            <label className="opacity-80">テキスト（最大6文字）</label>
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={text}
              maxLength={6}
              onChange={(e) => setText(e.target.value)}
            />

            <label className="opacity-80">キャンバスサイズ（px）</label>
            <input
              type="number"
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={size}
              min={64}
              max={1024}
              onChange={(e) => setSize(parseInt(e.target.value || "128", 10))}
            />

            <label className="opacity-80">文字色</label>
            <input type="color" value={fill} onChange={(e) => setFill(e.target.value)} />

            <label className="opacity-80">縁色</label>
            <input type="color" value={stroke} onChange={(e) => setStroke(e.target.value)} />

            <label className="opacity-80">縁の太さ（px）</label>
            <input
              type="number"
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={strokePx}
              min={0}
              max={24}
              onChange={(e) => setStrokePx(parseInt(e.target.value || "0", 10))}
            />

            {/* 背景（チェック＋カラーピッカー） */}
            <label className="opacity-80">背景（有効/無効）</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bgEnabled}
                  onChange={(e) => setBgEnabled(e.target.checked)}
                />
                <span className="text-sm">背景を有効にする</span>
              </label>
              <input
                type="color"
                disabled={!bgEnabled}
                className={`rounded ${bgEnabled ? '' : 'opacity-50 cursor-not-allowed'}`}
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                title="背景色（有効時のみ適用）"
              />
            </div>

            {/* 固定0の項目（DisableTextBox） */}
            <label className="opacity-50">外枠マージン（固定0）</label>
            <input className="bg-neutral-800/50 rounded-xl px-3 py-2" value={0} disabled />

            <label className="opacity-50">セル間ギャップ（固定0）</label>
            <input className="bg-neutral-800/50 rounded-xl px-3 py-2" value={0} disabled />

            {/* フォント選択 */}
            <label className="opacity-80">フォント</label>
            <div className="flex flex-wrap gap-3">
              {FONT_OPTIONS.map(opt => (
                <label key={opt.key} className="inline-flex items-center gap-2 bg-neutral-800 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="font"
                    value={opt.key}
                    checked={fontKey === opt.key}
                    onChange={() => setFontKey(opt.key)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* 倍率（font-scale） */}
            <label className="opacity-80">倍率（font-scale）</label>
            <input
              type="number"
              step="0.05"
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={fontScale}
              min={0.5}
              max={2.5}
              onChange={(e) => setFontScale(parseFloat(e.target.value || "1"))}
            />

            {/* 3文字専用レイアウト切替 */}
            {chars.length === 3 && (
              <>
                <label className="opacity-80">3文字レイアウト</label>
                <select
                  className="bg-neutral-800 rounded-xl px-3 py-2"
                  value={threeMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setThreeMode(e.target.value as ThreeMode)}
                >
                  <option value="row">横一列（縦長セルで全幅）</option>
                  <option value="twoPlusOne">上2 + 下中央1</option>
                </select>
              </>
            )}

            {/* 条件付き：3横／5・6文字の時だけ縦伸ばしUI（自動/手動） */}
            {showStretchUI && (
              <div className="col-span-2 grid grid-cols-2 gap-3 items-center">
                <label className="opacity-80">縦伸ばし（自動 / 手動）</label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stretchAuto}
                    onChange={(e) => setStretchAuto(e.target.checked)}
                  />
                  <span className="text-sm">自動（3横=2.5 / 5・6文字=1.65）</span>
                </label>

                <label className="opacity-80">縦伸ばし率（手動時のみ）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    className={`bg-neutral-800 rounded-xl px-3 py-2 ${stretchAuto ? 'opacity-50 cursor-not-allowed' : ''}`}
                    value={stretchAuto ? uiComputedAuto : stretchY}
                    disabled={stretchAuto}
                    min={0.1}
                    max={4}
                    onChange={(e) => setStretchY(parseFloat(e.target.value || '1'))}
                  />
                  <span className="text-xs opacity-70">実効={uiEffStretch.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-2xl bg-green-600 hover:bg-green-500 font-medium shadow"
            >
              画像ダウンロード
            </button>
          </div>
          <a
              href="rv"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >絵文字追加方法</a>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm opacity-80">プレビュー（{size}×{size}）</div>
          <canvas ref={canvasRef} className="rounded-2xl bg-neutral-800/40 shadow-lg" />
        </div>
      </div>

      <div className="text-sm opacity-70 leading-relaxed">
        <p>emodis v1.0.3</p>
        <p>©2025 nakano</p>
      </div>
    </div>
  );
}
