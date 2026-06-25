'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useModal } from '@/lib/modal-context'
import FeatureEducationModal, { FEATURE_EDUCATIONS } from './FeatureEducationModal'

export default function FeatureEducationModalManager() {
  const pathname = usePathname()
  const { showModal, hideModal, activeModals } = useModal()
  const lastPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Standardize path (remove trailing slashes, keep exact match)
    const currentPath = pathname.replace(/\/$/, '') || '/'

    // Prevent re-triggering if the pathname hasn't actually changed
    if (lastPathnameRef.current === currentPath) return
    lastPathnameRef.current = currentPath

    // Check if the current page has a feature education guide
    const config = FEATURE_EDUCATIONS[currentPath]
    if (!config) return

    // Verify if already shown to the user
    const key = `crosswire_feature_edu_${currentPath}`
    const isShown = localStorage.getItem(key) === 'true'
    if (isShown) return

    // Also verify if a feature education modal is already displayed to avoid double stacking
    const isAlreadyDisplayingEdu = activeModals.some(
      (m) => m.id === `edu_${currentPath}`
    )
    if (isAlreadyDisplayingEdu) return

    // Show the modal after a short delay so the page loading settles nicely
    const timer = setTimeout(() => {
      showModal({
        id: `edu_${currentPath}`,
        type: 'custom',
        title: config.title,
        priority: 'P3', // Info priority
        preventBackdropClose: true, // Force click on "Tôi đã hiểu" or "Không hiện lại"
        description: (
          <FeatureEducationModal
            pathname={currentPath}
            config={config}
            onClose={() => {
              // Store as shown when dismissed
              localStorage.setItem(key, 'true')
              hideModal()
            }}
            onNeverShowAgain={() => {
              localStorage.setItem(key, 'true')
              hideModal()
            }}
          />
        )
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [pathname, showModal, hideModal, activeModals])

  return null
}
