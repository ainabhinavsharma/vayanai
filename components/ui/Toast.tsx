'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {}
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
    }, 2400);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`global-toast ${visible ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
