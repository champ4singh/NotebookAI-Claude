import * as React from "react"
import { cn } from "../../utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98] transition-all duration-150",
      outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all duration-150",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98] transition-all duration-150",
      ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all duration-150",
      link: "text-primary underline-offset-4 hover:underline active:scale-[0.98] transition-all duration-150",
    }

    const sizes = {
      default: "h-11 px-6 py-2.5 text-sm font-medium",
      sm: "h-9 rounded-lg px-4 text-xs font-medium",
      lg: "h-12 rounded-lg px-8 text-base font-medium",
      icon: "h-11 w-11",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }