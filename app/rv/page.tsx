"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";

import Analytics from "../analytics";

type Step = { src: string; alt: string; title: string };

function IconX(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}
function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

// 画像は /public/guide/ 以下に配置してください
const pcSteps: Step[] = [
    { src: "/guide/pc-1.jpg", alt: "PC 手順1", title: "1. サーバー設定押下" },
    { src: "/guide/pc-2.jpg", alt: "PC 手順2", title: "2. 絵文字から絵文字アップロード" },
];

const spSteps: Step[] = [
    { src: "/guide/sp-1.jpg", alt: "SP 手順1", title: "1. サーバー名選択" },
    { src: "/guide/sp-2.jpg", alt: "SP 手順2", title: "2. 設定押下" },
    { src: "/guide/sp-3.jpg", alt: "SP 手順3", title: "3. 絵文字押下" },
    { src: "/guide/sp-4.jpg", alt: "SP 手順4", title: "4. 絵文字をアップロードを押下" },
];

type SectionKey = "pc" | "sp";

export default function UsagePage() {
    const [lightbox, setLightbox] = useState<{
        section: SectionKey;
        index: number;
    } | null>(null);

    const open = (section: SectionKey, index: number) => setLightbox({ section, index });
    const close = () => setLightbox(null);

    const { items, count, titlePrefix } = useMemo(() => {
        if (!lightbox) return { items: [] as Step[], count: 0, titlePrefix: "" };
        const items = lightbox.section === "pc" ? pcSteps : spSteps;
        const titlePrefix = lightbox.section === "pc" ? "PC" : "SP";
        return { items, count: items.length, titlePrefix };
    }, [lightbox]);

    const prev = () =>
        setLightbox((s) =>
            s ? { section: s.section as SectionKey, index: (s.index - 1 + (s.section === "pc" ? pcSteps.length : spSteps.length)) % (s.section === "pc" ? pcSteps.length : spSteps.length) } : s
        );
    const next = () =>
        setLightbox((s) =>
            s ? { section: s.section as SectionKey, index: (s.index + 1) % (s.section === "pc" ? pcSteps.length : spSteps.length) } : s
        );

    // ← → Esc キー操作
    useEffect(() => {
        if (!lightbox) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox]);

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <Analytics />
            <div className="mx-auto w-full max-w-6xl space-y-10">
                <header>
                    <h1 className="text-2xl font-bold">サイトの使い方</h1>
                    <p className="mt-2 text-sm text-gray-400">クリックで拡大・左右キーで移動</p>
                </header>

                {/* PC 用（2枚） */}
                <section>
                    <h2 className="mb-4 text-lg font-semibold">PC の使い方</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {pcSteps.map((s, i) => (
                            <figure
                                key={s.src}
                                onClick={() => open("pc", i)}
                                className="cursor-pointer overflow-hidden rounded-xl border border-gray-700 hover:opacity-80 transition"
                            >
                                <Image src={s.src} alt={s.alt} width={1000} height={562} className="w-full h-auto object-cover" />
                                <figcaption className="p-2 text-center text-sm bg-white/5">{s.title}</figcaption>
                            </figure>
                        ))}
                    </div>
                </section>

                {/* スマホ用（4枚） */}
                <section>
                    <h2 className="mb-4 text-lg font-semibold">スマホの使い方</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {spSteps.map((s, i) => (
                            <figure
                                key={s.src}
                                onClick={() => open("sp", i)}
                                className="cursor-pointer overflow-hidden rounded-lg border border-gray-700 hover:opacity-80 transition"
                            >
                                <Image src={s.src} alt={s.alt} width={800} height={1422} className="w-full h-auto object-cover" />
                                <figcaption className="p-1 text-center text-xs bg-white/5">{s.title}</figcaption>
                            </figure>
                        ))}
                    </div>
                </section>
            </div>

            {/* ライトボックス */}
            {lightbox && (
                <div className="fixed inset-0 z-50 bg-black/95 grid place-items-center">
                    <div className="relative">
                        <Image
                            src={items[lightbox.index].src}
                            alt={items[lightbox.index].alt}
                            width={2000}
                            height={2000}
                            className="h-auto w-auto max-h-[90svh] max-w-[96svw] object-contain select-none"
                            draggable={false}
                            priority
                        />

                        {/* Controls */}
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 bg-white/15 hover:bg-white/30 rounded-full p-2"
                            aria-label="閉じる"
                        >
                            <IconX />
                        </button>
                        <button
                            onClick={prev}
                            className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/15 hover:bg-white/30 rounded-full p-2"
                            aria-label="前へ"
                        >
                            <IconChevronLeft />
                        </button>
                        <button
                            onClick={next}
                            className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/15 hover:bg-white/30 rounded-full p-2"
                            aria-label="次へ"
                        >
                            <IconChevronRight />
                        </button>

                        {/* インデックス（絶対配置で余白を作らない） */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs">
                            {titlePrefix} {lightbox.index + 1}/{count}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}