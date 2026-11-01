export interface Explainer {
    id: string;
    kind: "explainer";
    source: string;
    title: string;
    authors: string[];
    published: string;
    paperDate: string;
    category: string;
    absUrl: string;
    svg: string;
    text: string;
}

const SEEN_KEY = "brainmax_seen_explainers";

export function loadSeen(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    } catch {
        return new Set();
    }
}

export function markSeen(id: string) {
    try {
        const s = loadSeen();
        if (s.has(id)) return;
        s.add(id);
        localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-3000)));
    } catch {
        /* storage unavailable: explainers just repeat next visit */
    }
}

export async function fetchExplainerIds(): Promise<string[]> {
    const r = await fetch("/api/explainers/ids");
    return r.ok ? r.json() : [];
}

export async function fetchExplainers(ids: string[]): Promise<Explainer[]> {
    if (!ids.length) return [];
    const r = await fetch(`/api/explainers?ids=${encodeURIComponent(ids.join(","))}`);
    return r.ok ? r.json() : [];
}
