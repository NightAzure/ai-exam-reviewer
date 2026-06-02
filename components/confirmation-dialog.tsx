"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  warningItems?: string[];
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  isLoading?: boolean;
  confirmationLabel?: string;
  confirmationValue?: string;
  confirmationPlaceholder?: string;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  warningItems,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
  confirmationLabel,
  confirmationValue,
  confirmationPlaceholder,
}: ConfirmationDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  const requiresTypedConfirmation = Boolean(confirmationValue);
  const isConfirmationValid =
    !requiresTypedConfirmation || typedValue.trim() === confirmationValue;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setTypedValue("");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 shadow-lg">

        {/* Icon + header */}
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          {variant === "destructive" && (
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          )}
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-gray-500 leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {/* Warning items */}
        {warningItems && warningItems.length > 0 && (
          <div className="mx-6 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              This will permanently remove
            </p>
            <ul className="space-y-1.5">
              {warningItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Typed confirmation */}
        {requiresTypedConfirmation && (
          <div className="mx-6 mb-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <Label htmlFor="confirmation-input" className="text-sm font-medium text-gray-700">
              {confirmationLabel ?? `Type "${confirmationValue}" to continue`}
            </Label>
            <Input
              id="confirmation-input"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={confirmationPlaceholder ?? confirmationValue}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="bg-white"
            />
            <p className="text-xs text-gray-400">
              This confirmation is required because the action is permanent.
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-row gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => handleOpenChange(false)}
            className="min-w-[72px]"
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            disabled={isLoading || !isConfirmationValid}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className={
              variant === "destructive"
                ? "min-w-[72px] bg-red-500 hover:bg-red-600 text-white border-0"
                : "min-w-[72px]"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Processing…
              </>
            ) : confirmText}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
