import { GatedRoute } from "@/components/GatedRoute";

export default function DreamPage() {
  return (
    <GatedRoute title="Dream screen">
      <p className="text-sm text-muted">
        Dream stages and consolidation visuals are gated until M0 is complete.
      </p>
    </GatedRoute>
  );
}
