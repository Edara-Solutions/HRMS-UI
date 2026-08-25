import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, type Ref, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  ref?: Ref<HTMLInputElement>;
}

export function PasswordInput({ className, ref, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={isVisible ? "text" : "password"}
        className={cn("pe-9", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        className="absolute end-0 top-0"
        aria-label={isVisible ? "Hide password" : "Show password"}
        title={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((value) => !value)}
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </Button>
    </div>
  );
}
