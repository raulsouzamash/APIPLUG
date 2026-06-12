import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "block w-full rounded-md border-0 bg-black/40 py-2 text-white shadow-inner ring-1 ring-inset ring-white/5 placeholder:text-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-black/60 text-base leading-6 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
