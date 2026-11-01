import { For, Show } from "solid-js";

import type { Explainer } from "@/lib/explainers";

// The SVG is rendered through <img>, so animations (SMIL/CSS) run but scripts and external loads never do.
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = (t: string) =>
    t
        .split(/\n\s*\n/)
        .map((p) => esc(p.trim()).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"))
        .filter(Boolean);

export function ExplainerCard(props: { paper: Explainer; onSwipe?: (d: "up" | "down" | null) => void }) {
    let ref: HTMLDivElement | undefined;
    let touchY = 0;
    const atTop = () => (ref?.scrollTop ?? 0) <= 0;
    const atBottom = () => !ref || Math.abs(ref.scrollHeight - ref.clientHeight - ref.scrollTop) < 1;

    const onWheel = (e: WheelEvent) => {
        if (e.deltaY < 0 && atTop()) return props.onSwipe?.("down");
        if (e.deltaY > 0 && atBottom()) return props.onSwipe?.("up");
        e.stopPropagation();
    };
    const onTouchStart = (e: TouchEvent) => {
        touchY = e.touches[0].clientY;
        props.onSwipe?.(null);
    };
    const onTouchMove = (e: TouchEvent) => {
        const d = touchY - e.touches[0].clientY;
        if (d < -30 && atTop()) return props.onSwipe?.("down");
        if (d > 30 && atBottom()) return props.onSwipe?.("up");
    };

    return (
        <article class="h-full w-full flex items-center justify-center p-4 sm:p-8">
            <div class="relative paper-card max-w-2xl w-full h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col">
                <div class="flex items-center justify-between p-4 sm:p-6 pb-2">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        ✨ Visual explainer{props.paper.category ? ` · ${props.paper.category}` : ""}
                    </span>
                    <span class="text-xs text-gray-500">{props.paper.paperDate}</span>
                </div>
                <div class="px-4 sm:px-6 pb-2">
                    <h2 class="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{props.paper.title}</h2>
                </div>
                <div
                    ref={ref}
                    class="flex-1 px-4 sm:px-6 overflow-y-auto overscroll-contain"
                    style="touch-action: pan-y; -webkit-overflow-scrolling: touch;"
                    onWheel={onWheel}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                >
                    <img
                        src={svgUrl(props.paper.svg)}
                        alt={`Animated explainer: ${props.paper.title}`}
                        class="w-full rounded-xl bg-slate-900"
                        style="aspect-ratio: 4 / 3;"
                        draggable={false}
                    />
                    <div class="mt-4 space-y-3 text-base leading-relaxed text-gray-700 pb-4">
                        <For each={paragraphs(props.paper.text)}>{(p) => <p innerHTML={p} />}</For>
                    </div>
                </div>
                <div class="p-4 sm:p-6 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span class="text-xs text-gray-500 truncate">{props.paper.authors.slice(0, 3).join(", ")}</span>
                    <Show when={props.paper.absUrl}>
                        <a href={props.paper.absUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-blue-500 hover:text-blue-600 whitespace-nowrap">
                            Read paper →
                        </a>
                    </Show>
                </div>
            </div>
        </article>
    );
}

export function EndCard() {
    return (
        <article class="h-full w-full flex items-center justify-center p-4 sm:p-8">
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-md text-center">
                <div class="text-5xl mb-4">🧠</div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">You're all caught up</h3>
                <p class="text-gray-600">Out of content for now. New visual explainers land every morning.</p>
            </div>
        </article>
    );
}
