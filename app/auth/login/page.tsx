'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to /sistema which has its own login screen
export default function LoginPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/sistema')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0c10',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6b7590',
      fontSize: 12,
      letterSpacing: '.1em'
    }}>
      REDIRIGIENDO AL SISTEMA...
    </div>
  )
}
