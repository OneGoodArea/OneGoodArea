/* Scoring engine — versioned modules.

   EXECUTION-PLAYBOOK §8 gate #2: freeze v2 before any v3 scoring work, so the
   X-Engine-Version reproducibility promise (the auditable/version-pinned part of
   the moat) stays intact. v2.ts is the FROZEN engine — golden-master-tested
   byte-for-byte (scoring-engine.golden.test.ts imports ./v2 directly). Do NOT
   change v2's math; v3 lands as a sibling ./v3 and this index becomes a resolver
   that routes a request's resolved engine version to the right module.

   Today there is only v2, so the current engine === v2. Callers that want "the
   current engine" import from "./scoring-engine" (this index); the version-pin
   guard (engine-version.ts) decides which version a request resolves to and, once
   v3 exists, this file will dispatch accordingly. The signal-first restructure
   keeps scoring as a *feature* on top of signals — this module stays pure
   (data structs in → {score, reasoning, confidence} out), never the primitive. */

export * from "./v2";
