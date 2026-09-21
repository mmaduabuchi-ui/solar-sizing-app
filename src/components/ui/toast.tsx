// src/components/ui/toast.tsx
"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

// Toast Context
interface ToastContextType {
  showToast: (props: ToastProps) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Individual Toast Component
function ToastItem({ message, type = "info", duration = 3000, onClose }: ToastProps & { onClose?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const colors = {
    success: "border-green-500/50 bg-green-50 dark:bg-green-950/20",
    error: "border-red-500/50 bg-red-50 dark:bg-red-950/20",
    warning: "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20",
    info: "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20",
  };

  const textColors = {
    success: "text-green-700 dark:text-green-300",
    error: "text-red-700 dark:text-red-300",
    warning: "text-yellow-700 dark:text-yellow-300",
    info: "text-blue-700 dark:text-blue-300",
  };

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right-5 fade-in max-w-sm w-full",
      colors[type]
    )}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className={cn("flex-1 text-sm font-medium", textColors[type])}>{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        className="flex-shrink-0 rounded-md p-1 hover:bg-muted/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);
  const [idCounter, setIdCounter] = useState(0);

  const showToast = (props: ToastProps) => {
    const id = idCounter + 1;
    setIdCounter(id);
    setToasts((prev) => [...prev, { ...props, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toastProps) => (
          <ToastItem
            key={toastProps.id}
            message={toastProps.message}
            type={toastProps.type}
            duration={toastProps.duration}
            onClose={() => removeToast(toastProps.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}