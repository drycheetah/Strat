import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';

export interface QRData {
  address?: string;
  amount?: number;
  memo?: string;
  type?: 'payment' | 'wallet' | 'contract';
}

export interface QRScanResult {
  success: boolean;
  data?: QRData;
  error?: string;
}

class QRService {
  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Check if camera permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Parse QR code data
   */
  parseQRData(data: string): QRScanResult {
    try {
      // Try to parse as JSON first
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        return {
          success: true,
          data: {
            address: parsed.address,
            amount: parsed.amount,
            memo: parsed.memo,
            type: parsed.type || 'payment'
          }
        };
      }

      // Parse STRAT URI format: strat://address?amount=X&memo=Y
      if (data.startsWith('strat://')) {
        return this.parseStratURI(data);
      }

      // Parse simple address
      if (data.startsWith('STRAT')) {
        return {
          success: true,
          data: {
            address: data,
            type: 'wallet'
          }
        };
      }

      return {
        success: false,
        error: 'Invalid QR code format'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  }

  /**
   * Parse STRAT URI format
   */
  private parseStratURI(uri: string): QRScanResult {
    try {
      const url = new URL(uri);
      const address = url.hostname;
      const amount = url.searchParams.get('amount');
      const memo = url.searchParams.get('memo');

      return {
        success: true,
        data: {
          address,
          amount: amount ? parseFloat(amount) : undefined,
          memo: memo || undefined,
          type: 'payment'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid STRAT URI'
      };
    }
  }

  /**
   * Generate QR data for payment request
   */
  generatePaymentQR(
    address: string,
    amount?: number,
    memo?: string
  ): string {
    const qrData: QRData = {
      address,
      type: 'payment'
    };

    if (amount) {
      qrData.amount = amount;
    }

    if (memo) {
      qrData.memo = memo;
    }

    return JSON.stringify(qrData);
  }

  /**
   * Generate STRAT URI for payment
   */
  generateStratURI(address: string, amount?: number, memo?: string): string {
    let uri = `strat://${address}`;

    const params = new URLSearchParams();

    if (amount) {
      params.append('amount', amount.toString());
    }

    if (memo) {
      params.append('memo', memo);
    }

    const queryString = params.toString();
    if (queryString) {
      uri += `?${queryString}`;
    }

    return uri;
  }

  /**
   * Generate QR data for wallet address only
   */
  generateWalletQR(address: string): string {
    return JSON.stringify({
      address,
      type: 'wallet'
    });
  }

  /**
   * Generate QR data for contract interaction
   */
  generateContractQR(
    contractAddress: string,
    method: string,
    params: any[]
  ): string {
    return JSON.stringify({
      address: contractAddress,
      type: 'contract',
      method,
      params
    });
  }

  /**
   * Validate address format
   */
  validateAddress(address: string): boolean {
    // STRAT address should start with STRAT and be 40 characters total
    return /^STRAT[A-Z0-9]{36}$/.test(address);
  }

  /**
   * Handle barcode scan
   */
  handleBarCodeScanned = (
    data: string,
    onSuccess: (result: QRData) => void,
    onError: (error: string) => void
  ) => {
    const result = this.parseQRData(data);

    if (result.success && result.data) {
      onSuccess(result.data);
    } else {
      onError(result.error || 'Failed to scan QR code');
    }
  };

  /**
   * Format amount for display
   */
  formatAmount(amount: number): string {
    return amount.toFixed(8) + ' STRAT';
  }

  /**
   * Validate QR data before creating transaction
   */
  validateQRData(data: QRData): { valid: boolean; error?: string } {
    if (!data.address) {
      return { valid: false, error: 'Address is required' };
    }

    if (!this.validateAddress(data.address)) {
      return { valid: false, error: 'Invalid address format' };
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        return { valid: false, error: 'Amount must be greater than 0' };
      }

      if (data.amount > 1000000000) {
        return { valid: false, error: 'Amount is too large' };
      }
    }

    if (data.memo && data.memo.length > 256) {
      return { valid: false, error: 'Memo is too long (max 256 characters)' };
    }

    return { valid: true };
  }
}

export default new QRService();
