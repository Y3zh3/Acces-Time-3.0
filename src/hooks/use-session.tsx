"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  uid: string
  fullName: string
  role: string
  email: string
  isActive: boolean
  loginTime: string
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadSession = () => {
      const sessionData = localStorage.getItem('logistream_session')
      
      if (sessionData) {
        try {
          const userData: User = JSON.parse(sessionData)
          setUser(userData)
        } catch (error) {
          console.error('Error parsing session:', error)
          localStorage.removeItem('logistream_session')
        }
      }
      
      setIsLoading(false)
    }

    loadSession()

    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      loadSession()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const logout = () => {
    localStorage.removeItem('logistream_session')
    setUser(null)
    router.push('/login')
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout
  }
}
