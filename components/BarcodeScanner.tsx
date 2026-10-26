import React from 'react';
import { useZxing } from 'react-zxing';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onError?: (error: Error) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onError }) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.rawValue);
    },
    onError(error: any) {
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    },
  });

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-pink-200">
      <video ref={ref} className="w-full h-auto" />
    </div>
  );
};
