import { GatedRoute } from "@/components/GatedRoute";

export default function ArchitecturePage() {
  return (
    <GatedRoute title="Architecture screen">
      <p className="text-sm text-muted">
        The styled architecture card is M6 scope and should wait for the M0
        deployment gate.
      </p>
    </GatedRoute>
  );
}
