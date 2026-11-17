import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { ButtonProps } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'

interface LinkButtonProps extends ButtonProps {
  to: string
  children: React.ReactNode
}

export function LinkButton({ to, className, variant, size, children }: LinkButtonProps) {
  return (
    <Link to={to} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  )
}
