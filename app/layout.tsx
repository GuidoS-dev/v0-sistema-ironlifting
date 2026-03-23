import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-bebas'
});

export const metadata: Metadata = {
  title: 'Sistema Ironlifting | Halterofilia Olímpica con Hugo Palacios',
  description: 'Programa de Halterofilia Olímpica con metodología científica y más de 35 años de experiencia. Entrenamiento profesional para atletas de todos los niveles.',
  keywords: ['halterofilia', 'weightlifting', 'olímpico', 'entrenamiento', 'fuerza', 'técnica'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.variable} ${bebasNeue.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
