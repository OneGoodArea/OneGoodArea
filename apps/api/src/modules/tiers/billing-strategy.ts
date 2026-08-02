import type { UserType } from "@onegoodarea/contracts";
import type { Tier } from "./index";

export interface BillingStrategy {
  resolve(ctx: { userId: string; userType: UserType; hasApiKey: boolean }): Promise<Tier>;
}