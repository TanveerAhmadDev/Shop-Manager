"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { apiRequest } from "@/lib/api";
import type { InventoryItem } from "@/types/sales";

interface ScanNotification {
  title: string;
  description: string;
  type: "success" | "warning" | "error";
}

interface UseBarcodeScannerProps {
  scannerOpen: boolean;
  isUrdu: boolean;
  inventoryRef: MutableRefObject<InventoryItem[]>;
  addInventoryToBill: (item: InventoryItem) => boolean;
  setError: (error: string) => void;
  playSuccess: () => void;
  playError: () => void;
  notify: (notification: ScanNotification) => void;
}

export function useBarcodeScanner({
  scannerOpen,
  isUrdu,
  inventoryRef,
  addInventoryToBill,
  setError,
  playSuccess,
  playError,
  notify,
}: UseBarcodeScannerProps) {
  const scannedCodesRef = useRef<Set<string>>(new Set());

  const [scanMessage, setScanMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  const handleScannedModelNumber = useCallback(
    async (scannedValue: string) => {
      const modelNumber = scannedValue.trim().toUpperCase();

      if (!modelNumber || scannedCodesRef.current.has(modelNumber)) {
        return;
      }

      scannedCodesRef.current.add(modelNumber);
      setScanMessage(null);

      try {
        let selected: InventoryItem | undefined;

        // Search locally when offline.
        if (!navigator.onLine) {
          selected = inventoryRef.current.find(
            (item) => item.model_number.toUpperCase() === modelNumber,
          );

          if (!selected) {
            throw new Error(
              isUrdu
                ? "یہ فرنیچر محفوظ شدہ اسٹاک میں موجود نہیں۔"
                : "This furniture item was not found in saved inventory.",
            );
          }
        } else {
          try {
            const result = await apiRequest<{
              success: boolean;
              message: string;
              data: InventoryItem;
            }>(`/inventory/model/${encodeURIComponent(modelNumber)}`);

            selected = result.data;
          } catch (err) {
            // Use cached inventory only for network failures.
            if (!(err instanceof TypeError)) {
              throw err;
            }

            selected = inventoryRef.current.find(
              (item) => item.model_number.toUpperCase() === modelNumber,
            );

            if (!selected) {
              throw new Error(
                isUrdu
                  ? "فرنیچر محفوظ شدہ اسٹاک میں موجود نہیں۔"
                  : "Furniture item is not available in saved inventory.",
              );
            }
          }
        }

        if (selected.status !== "in_stock") {
          throw new Error(
            isUrdu
              ? "یہ فرنیچر اسٹاک میں دستیاب نہیں۔"
              : "This furniture item is not in stock.",
          );
        }

        const added = addInventoryToBill(selected);

        if (added) {
          playSuccess();

          const message = isUrdu
            ? `${modelNumber} بل میں شامل ہوگیا۔`
            : `${selected.product_name} (${modelNumber}) added to bill successfully.`;

          setScanMessage({
            type: "success",
            text: message,
          });

          notify({
            title: isUrdu ? "فرنیچر شامل ہوگیا" : "Furniture added",
            description: message,
            type: "success",
          });
        } else {
          playError();

          const message = isUrdu
            ? "یہ فرنیچر پہلے ہی بل میں شامل ہے یا محفوظ ہے۔"
            : "This furniture is already in this bill or reserved.";

          setScanMessage({
            type: "warning",
            text: message,
          });

          notify({
            title: isUrdu ? "فرنیچر شامل نہیں ہوا" : "Furniture not added",
            description: message,
            type: "warning",
          });
        }
      } catch (err) {
        playError();

        const message =
          err instanceof Error
            ? err.message
            : isUrdu
              ? "فرنیچر تلاش نہیں ہو سکا۔"
              : "Unable to find furniture.";

        setScanMessage({
          type: "error",
          text: message,
        });

        notify({
          title: isUrdu ? "اسکین ناکام ہوگیا" : "Scan failed",
          description: message,
          type: "error",
        });
      } finally {
        // Allow this barcode to be scanned again after 1.5 seconds.
        window.setTimeout(() => {
          scannedCodesRef.current.delete(modelNumber);
        }, 1500);
      }
    },
    [addInventoryToBill, inventoryRef, isUrdu, notify, playSuccess, playError],
  );

  // Start and stop the camera.
  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let startPromise: Promise<null> | undefined;

    scannedCodesRef.current.clear();

    async function startScanner() {
      try {
        // Dynamic import prevents server-side rendering problems.
        const { Html5Qrcode, Html5QrcodeSupportedFormats } =
          await import("html5-qrcode");

        if (cancelled) return;

        scanner = new Html5Qrcode("sales-product-scanner", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        startPromise = scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Barcode label has a 50:30 ratio.
              const width = Math.min(
                viewfinderWidth * 0.9,
                viewfinderHeight * 0.9 * (50 / 30),
                350,
              );

              const height = width * (30 / 50);

              return {
                width: Math.floor(width),
                height: Math.floor(height),
              };
            },
          },
          (decodedText) => {
            if (!cancelled) {
              handleScannedModelNumber(decodedText);
            }
          },
          () => {
            // Ignore unsuccessful camera frame scans.
          },
        );

        await startPromise;

        // Stop if the scanner was closed while starting.
        if (cancelled && scanner.isScanning) {
          await scanner.stop();
          scanner.clear();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : isUrdu
                ? "کیمرہ شروع نہیں ہو سکا۔"
                : "Unable to start camera scanner.",
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      // Wait for startup to finish before stopping the camera.
      void (async () => {
        try {
          if (startPromise) {
            await startPromise;
          }

          if (scanner?.isScanning) {
            await scanner.stop();
          }

          scanner?.clear();
        } catch {
          // Camera may already be stopped.
        }
      })();
    };
  }, [scannerOpen, handleScannedModelNumber, isUrdu, setError]);

  return {
    scanMessage,
    setScanMessage,
    handleScannedModelNumber,
  };
}
