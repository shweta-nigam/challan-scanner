import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({ title, onClose, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${maxW}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-1.5"
            style={{ border: "none" }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
