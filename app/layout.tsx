import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ThemeRegistry from '@/components/ThemeRegistry'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  )
}