'use client'

import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/api'

interface UserAvatarProps {
  name: string
  avatar?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  role?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
}

const iconSizeMap = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-9 w-9',
  '2xl': 'h-12 w-12',
}

// Default avatar = regular user icon (per user requirement). When a picture
// is uploaded it replaces the icon.
export function UserAvatar({ name, avatar, size = 'md', className, role }: UserAvatarProps) {
  const isStudent = role === 'Student'
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-background shadow-sm', sizeMap[size], className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shadow-sm ring-2 ring-background',
        sizeMap[size],
        isStudent ? 'bg-brand' : 'bg-teal-600',
        className
      )}
    >
      {/* Default: regular user icon */}
      <User className={cn(iconSizeMap[size])} />
      <span className="sr-only">{name}</span>
    </div>
  )
}

export { initials }
