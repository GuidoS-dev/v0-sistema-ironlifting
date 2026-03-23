import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Coach } from "@/components/coach"
import { Methodology } from "@/components/methodology"
import { Timeline } from "@/components/timeline"
import { Testimonials } from "@/components/testimonials"
import { HowItWorks } from "@/components/how-it-works"
import { Pricing } from "@/components/pricing"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Coach />
      <Methodology />
      <Timeline />
      <Testimonials />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
