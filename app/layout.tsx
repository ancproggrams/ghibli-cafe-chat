
import './globals.css'
import type { Metadata } from 'next'
import { TimeProvider } from '@/components/time-context'

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Ghibli Café Chat ☕ • Cozy Conversations',
  description: 'A warm Studio Ghibli-inspired café where people gather to chat, relax, and enjoy coffee in a cozy atmosphere.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Ghibli Café Chat • Cozy Conversations',
    description: 'A warm Studio Ghibli-inspired café where people gather to chat, relax, and enjoy coffee in a cozy atmosphere.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TimeProvider>
          {children}
        </TimeProvider>
      </body>
    </html>
  )
}
