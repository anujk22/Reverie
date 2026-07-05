import { GatedRoute } from "@/components/GatedRoute";

export default function EvalsPage() {
  return (
    <GatedRoute title="Evals screen">
      <p className="text-sm text-muted">
        Eval charts and run controls are gated until the backend stub is live.
      </p>
    </GatedRoute>
  );
}
