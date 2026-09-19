"use client";

import { CirkleMark } from "@/components/brand/cirkle-logo";

const LINKS = [
  { group: "About", items: ["About Cirkle", "Careers", "Press", "Blog"] },
  { group: "Support", items: ["Help Center", "Safety", "Community Standards", "Report"] },
  {
    group: "Explore",
    items: ["Wasl Chat", "Mashahd Watch"],
  },
  { group: "Legal", items: ["Privacy", "Terms", "Cookies", "Data residency"] },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gold/20 bg-card/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <CirkleMark size={28} />
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-semibold gradient-text-gold">Cirkle</span>
                <span className="text-[10px] text-muted-foreground">your connected world</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A premium social experience built on the Cirkle design system — three rings,
              one circle. Connect, share moments, and Wasl in real time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {LINKS.map((col) => (
              <div key={col.group}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.group}</h4>
                <ul className="mt-2 space-y-1.5">
                  {col.items.map((it) => (
                    <li key={it}>
                      <a href="#" className="text-xs text-foreground/70 transition hover:text-foreground hover:underline">
                        {it}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cirkle. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built on the Cirkle design system · three rings, one circle.
          </p>
        </div>
      </div>
    </footer>
  );
}
