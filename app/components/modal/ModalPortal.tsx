'use client'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

interface ModalPortalProps {
  children: React.ReactNode
}

export default function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return ReactDOM.createPortal(
    children,
    document.body
  )
}
