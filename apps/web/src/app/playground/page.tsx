import { DeveloperSurface } from "@/modules/developer-surface"
import { Nav } from "@/app/design-v2/_shared/nav"

export const metadata = {
  title: "API Playground | OneGoodArea",
  description: "Interactive API playground — try OneGoodArea endpoints with a demo key.",
  openGraph: {
    title: "API Playground | OneGoodArea",
    description: "Interactive API playground — try OneGoodArea endpoints with a demo key.",
    url: "https://onegoodarea.com/playground",
    siteName: "OneGoodArea",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "API Playground | OneGoodArea",
    description: "Interactive API playground — try OneGoodArea endpoints with a demo key.",
  },
  alternates: { canonical: "https://onegoodarea.com/playground" },
}

export default function PlaygroundPage() {
  return (
    <div className="playground-layout">
      <Nav />
      <DeveloperSurface />
    </div>
  )
}
