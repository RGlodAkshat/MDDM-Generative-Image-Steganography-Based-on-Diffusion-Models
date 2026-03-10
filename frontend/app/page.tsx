"use client";

import { useMemo, useState } from "react";

import AboutTab from "@/components/AboutTab";
import DiversityTab from "@/components/DiversityTab";
import EncodeDecodeTab from "@/components/EncodeDecodeTab";
import ProvenanceTab from "@/components/ProvenanceTab";
import TamperTab from "@/components/TamperTab";

const TABS = [
  "Encode & Decode",
  "Diversity Test",
  "Tamper Check",
  "Provenance",
  "About / Method",
] as const;

type TabKey = (typeof TABS)[number];

export default function Page() {
  const [active, setActive] = useState<TabKey>("Encode & Decode");
  const [latestImageId, setLatestImageId] = useState<string | null>(null);

  const tabBody = useMemo(() => {
    if (active === "Encode & Decode") {
      return <EncodeDecodeTab onNewImageId={setLatestImageId} />;
    }
    if (active === "Diversity Test") {
      return <DiversityTab onNewImageId={setLatestImageId} />;
    }
    if (active === "Tamper Check") {
      return <TamperTab latestImageId={latestImageId} />;
    }
    if (active === "Provenance") {
      return <ProvenanceTab onNewImageId={setLatestImageId} />;
    }
    return <AboutTab />;
  }, [active, latestImageId]);

  return (
    <main className="space-y-4">
      <nav className="card flex flex-wrap gap-2 p-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={active === tab ? "tab-btn tab-btn-active" : "tab-btn"}
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {latestImageId ? (
        <div className="card px-3 py-2 text-xs text-slate-300">
          Latest image ID: <span className="font-mono text-blue-200">{latestImageId}</span>
        </div>
      ) : null}

      {tabBody}
    </main>
  );
}
