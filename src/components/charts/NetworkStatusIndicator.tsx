'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    // 초기 상태 설정
    setIsOnline(navigator.onLine)

    // 네트워크 상태 변경 감지
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 연결 속도 감지 (Network Information API)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const checkConnectionSpeed = () => {
        // 느린 연결: 2G, slow-2g, 또는 효과적인 타입이 느림
        const slowConnections = ['slow-2g', '2g']
        const isSlowType = slowConnections.includes(connection.effectiveType)
        const isSlowSpeed = connection.downlink < 1 // 1 Mbps 미만
        
        setIsSlowConnection(isSlowType || isSlowSpeed)
      }

      checkConnectionSpeed()
      connection.addEventListener('change', checkConnectionSpeed)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', checkConnectionSpeed)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 오프라인 상태
  if (!isOnline) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOff className="w-5 h-5" />
            <span className="text-sm font-medium">
              오프라인 상태입니다
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // 느린 연결 경고
  if (isSlowConnection) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              느린 네트워크 연결
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return null
}

// Hook for network status
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isOnline: true,
    isSlowConnection: false,
    effectiveType: 'unknown' as string,
    downlink: null as number | null,
    rtt: null as number | null
  })

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection

      setStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection ? 
          ['slow-2g', '2g'].includes(connection.effectiveType) || 
          connection.downlink < 1 : false,
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null
      })
    }

    updateStatus()

    // Event listeners
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateStatus)
    }

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateStatus)
      }
    }
  }, [])

  return status
}