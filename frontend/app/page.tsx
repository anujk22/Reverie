import { GatedRoute } from "@/components/GatedRoute";

export default function SessionPage() {
  return (
    <GatedRoute title="Session screen">
      <p className="text-sm text-muted">
        The tutoring conversation, memory inspector, budget meter, and
        constellation are M5 scope and remain intentionally unimplemented.
      </p>
    </GatedRoute>
  );
}
