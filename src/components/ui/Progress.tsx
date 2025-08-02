import React from 'react'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showValue?: boolean
  label?: string
}

export const Progress: React.FC<ProgressProps> = ({ 
  value, 
  max = 100, 
  className = '',
  showValue = true,
  label 
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          {showValue && <span>{value.toFixed(1)}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

export default Progress