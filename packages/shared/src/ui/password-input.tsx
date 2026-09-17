import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "./input";

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type" | "endAdornment">>(
  (props, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        endAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            className="cursor-pointer text-muted-2 hover:text-ink"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordInput.displayName = "PasswordInput";
