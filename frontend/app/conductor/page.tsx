import { GatedRoute } from "@/components/GatedRoute";

export default function ConductorPage() {
  return (
    <GatedRoute title="Conductor screen">
      <p className="text-sm leading-6 text-dim">
        Demo controls are withheld until the live ECS health stub exists.
      </p>
    </GatedRoute>
  );
}
