"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createRound, getRound, saveRound } from "@/lib/casualRound";
import CasualSetup from "@/components/golf/CasualSetup";
import CasualPlay from "@/components/golf/CasualPlay";

function PlayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const resumeId = params.get("id");

  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resumeId) {
      const r = getRound(resumeId);
      if (r) setRound(r);
    }
    setLoading(false);
  }, [resumeId]);

  const start = (config) => {
    const r = createRound(config);
    setRound(r);
    router.replace(`/golf/play?id=${r.id}`);
  };

  const update = (next) => setRound(saveRound(next));

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-lime-300 animate-spin" /></div>;
  }

  if (!round) {
    return <CasualSetup onStart={start} onCancel={() => router.push("/golf")} />;
  }

  return <CasualPlay round={round} setRound={update} onExit={() => router.push("/golf/rounds")} />;
}

// useSearchParams needs a Suspense boundary or the route fails to prerender.
export default function PlayPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-lime-300 animate-spin" /></div>}>
      <PlayInner />
    </Suspense>
  );
}
