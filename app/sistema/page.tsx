'use client'

import dynamic from 'next/dynamic'

// Import the full coaching system with no SSR (it uses localStorage and browser APIs)
const CoachApp = dynamic(() => import('./coach-app'), { 
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0c10',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      color: '#e8eaf0',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ fontSize: 12, color: '#6b7590', letterSpacing: '.1em' }}>CARGANDO SISTEMA...</div>
    </div>
  )
})

export default function SistemaPage() {
  return <CoachApp />
}
