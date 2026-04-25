/* All design-v2 tokens, animations, and responsive rules now live in
   src/app/globals.css so they ship in the static CSS bundle that the
   browser loads in <head> before first paint. Putting them in
   styled-jsx here caused FOUC because styled-jsx only injects styles
   after React hydration.

   This component is kept as a no-op so existing `import { Styles }`
   + `<Styles />` references across 30+ pages don't need to change.
   It can be deleted in a follow-up cleanup along with the other
   orphan-removal pass. */

export function Styles() {
  return null;
}
