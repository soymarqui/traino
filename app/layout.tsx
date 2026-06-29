import type { Metadata } from 'next'
import { Instrument_Sans } from 'next/font/google'
import ThemeRegistry from '@/components/ThemeRegistry'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
})

export const metadata: Metadata = {
  title: 'Traino',
  description: 'Registrá tu entrenamiento de fuerza',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={instrumentSans.variable} suppressHydrationWarning>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  )
}