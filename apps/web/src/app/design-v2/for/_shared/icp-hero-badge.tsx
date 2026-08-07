import { ICP_ICONS } from "../../_shared/icp-icons";

type IcpKey = keyof typeof ICP_ICONS;

/* The ICP hero identity badge. Replaces the near-invisible hairline eyebrow so
   each /for page is instantly recognisable: the buyer's canonical ICP icon in a
   tile, alongside the "For <ICP>" label. One shared lockup across all six pages
   (Plan 064 follow-up). */
export function IcpHeroBadge({ icp, label }: { icp: IcpKey; label: string }) {
  const Icon = ICP_ICONS[icp];
  return (
    <div className="oga-icp-hero__badge">
      <span className="oga-icp-hero__badge-icon" aria-hidden>
        <Icon />
      </span>
      <span className="oga-icp-hero__badge-label">{label}</span>
    </div>
  );
}
