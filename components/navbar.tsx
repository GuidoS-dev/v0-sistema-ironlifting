"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { LogoILSolo } from "@/components/logos"

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#metodologia", label: "Metodología" },
  { href: "#coach", label: "Nuestro Coach" },
  { href: "#trayectoria", label: "Trayectoria" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#planes", label: "Planes" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-3">
          <LogoILSolo size={36} />
          <span className="font-[family-name:var(--font-display)] text-xl tracking-wider text-[#e8c547]">
            IRONLIFTING
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA Button - Desktop */}
        <div className="hidden md:block">
          <Button
            asChild
            className="bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold"
          >
            <a href="#planes">Elegir mi plan</a>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-background">
            <nav className="mt-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
              <Button
                asChild
                className="mt-4 bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold"
              >
                <a href="#planes" onClick={() => setIsOpen(false)}>
                  Elegir mi plan
                </a>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
