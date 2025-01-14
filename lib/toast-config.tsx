'use client'

import { toast } from 'sonner'
import { ReactNode } from 'react'

const baseStyle = {
  background: "rgb(255, 255, 255)",
  color: "rgb(23, 23, 23)",
  border: "1px solid rgb(238, 238, 238)",
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "rgba(0, 0, 0, 0.02) 0px 0px 0px 1px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
  fontSize: "14px",
  lineHeight: "1.5",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
}

const toastOptions = {
  style: baseStyle,
  className: "font-sans",
  duration: 5000,
  progress: true // Enable progress bar
}

interface ToastContentProps {
  icon: string
  title: string
  description: ReactNode
}

const ToastContent = ({ icon, title, description }: ToastContentProps) => (
  <div className="flex items-start gap-3">
    <div className="text-xl flex-shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="font-bold tracking-tight uppercase">{title}</div>
      <div className="text-sm text-gray-600 uppercase">{description}</div>
    </div>
  </div>
)

export const showToast = {
  leftcurve: (title: string, description: ReactNode) => {
    toast(
      <ToastContent 
        icon="🚀" 
        title="WAGMI DETECTED"
        description={description}
      />,
      {
        ...toastOptions,
        style: {
          ...baseStyle,
          "--progress-background": "rgba(0, 0, 0, 0.05)", // Progress bar background
        } as any
      }
    )
  },
  rightcurve: (title: string, description: ReactNode) => {
    toast(
      <ToastContent 
        icon="😴" 
        title="NGMI MOMENT"
        description={description}
      />,
      {
        ...toastOptions,
        style: {
          ...baseStyle,
          "--progress-background": "rgba(0, 0, 0, 0.05)", // Progress bar background
        } as any
      }
    )
  },
  error: (title: string, description: ReactNode) => {
    toast.error(
      <ToastContent 
        icon="💀" 
        title="RUGGED SER"
        description={description}
      />,
      {
        ...toastOptions,
        style: {
          ...baseStyle,
          border: "1px solid rgb(254, 226, 226)",
          background: "rgb(254, 242, 242)",
          "--progress-background": "rgba(254, 226, 226, 0.3)", // Red progress bar background for errors
        } as any
      }
    )
  }
} 