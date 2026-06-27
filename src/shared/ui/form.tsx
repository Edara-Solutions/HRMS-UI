import type { FormHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function Form({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn("space-y-5", className)} {...props} />;
}
