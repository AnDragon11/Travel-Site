import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[hsl(168,76%,40%)] via-[hsl(185,70%,42%)] to-[hsl(200,80%,45%)] text-primary-foreground hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]",
        destructive: "bg-gradient-to-r from-destructive to-red-600 text-destructive-foreground hover:shadow-lg hover:shadow-destructive/30 hover:scale-[1.02]",
        outline: "border border-input bg-background hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent hover:text-accent-foreground hover:border-primary/50",
        secondary: "bg-gradient-to-r from-[hsl(24,95%,53%)] to-[hsl(30,90%,55%)] text-secondary-foreground hover:shadow-lg hover:shadow-secondary/30 hover:scale-[1.02]",
        ghost: "hover:bg-gradient-to-r hover:from-accent/30 hover:to-accent/50 hover:text-accent-foreground",
        link: "text-transparent bg-clip-text bg-gradient-to-r from-[hsl(168,76%,40%)] to-[hsl(200,80%,45%)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
