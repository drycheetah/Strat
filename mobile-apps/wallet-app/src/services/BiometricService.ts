import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export enum BiometricType {
  NONE = 0,
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

class BiometricService {
  private static BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  /**
   * Check if device supports biometric authentication
   */
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  /**
   * Get supported biometric types
   */
  async getSupportedTypes(): Promise<BiometricType[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const supported: BiometricType[] = [];

    types.forEach((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          supported.push(BiometricType.FINGERPRINT);
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          supported.push(BiometricType.FACIAL_RECOGNITION);
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          supported.push(BiometricType.IRIS);
          break;
      }
    });

    return supported;
  }

  /**
   * Get biometric type name for display
   */
  getBiometricTypeName(type: BiometricType): string {
    switch (type) {
      case BiometricType.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case BiometricType.FACIAL_RECOGNITION:
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case BiometricType.IRIS:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(reason?: string): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isAvailable();

      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available'
        };
      }

      const supportedTypes = await this.getSupportedTypes();
      const biometricType = supportedTypes[0] || BiometricType.NONE;

      const defaultReason = `Use ${this.getBiometricTypeName(
        biometricType
      )} to access your wallet`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || defaultReason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode'
      });

      if (result.success) {
        return {
          success: true,
          biometricType
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometric(): Promise<boolean> {
    const isAvailable = await this.isAvailable();

    if (!isAvailable) {
      return false;
    }

    const result = await this.authenticate(
      'Enable biometric authentication for quick access'
    );

    if (result.success) {
      await SecureStore.setItemAsync(
        BiometricService.BIOMETRIC_ENABLED_KEY,
        'true'
      );
      return true;
    }

    return false;
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync(BiometricService.BIOMETRIC_ENABLED_KEY);
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(
      BiometricService.BIOMETRIC_ENABLED_KEY
    );
    return enabled === 'true';
  }

  /**
   * Get biometric prompt message
   */
  async getBiometricPromptMessage(): Promise<string> {
    const types = await this.getSupportedTypes();
    const primaryType = types[0] || BiometricType.NONE;

    if (primaryType === BiometricType.NONE) {
      return 'Authenticate to continue';
    }

    const typeName = this.getBiometricTypeName(primaryType);
    return `Use ${typeName} to unlock your wallet`;
  }

  /**
   * Authenticate and get wallet password
   * This is a secure way to unlock the wallet without entering password
   */
  async authenticateForWallet(): Promise<BiometricResult> {
    const isEnabled = await this.isBiometricEnabled();

    if (!isEnabled) {
      return {
        success: false,
        error: 'Biometric authentication is not enabled'
      };
    }

    const message = await this.getBiometricPromptMessage();
    return this.authenticate(message);
  }

  /**
   * Check if user should be prompted to enable biometric
   */
  async shouldPromptBiometricSetup(): Promise<boolean> {
    const isAvailable = await this.isAvailable();
    const isEnabled = await this.isBiometricEnabled();
    const hasBeenAsked = await SecureStore.getItemAsync('biometric_asked');

    return isAvailable && !isEnabled && !hasBeenAsked;
  }

  /**
   * Mark that user has been asked about biometric setup
   */
  async markBiometricAsked(): Promise<void> {
    await SecureStore.setItemAsync('biometric_asked', 'true');
  }

  /**
   * Security level check
   */
  async getSecurityLevel(): Promise<
    LocalAuthentication.SecurityLevel | number
  > {
    if (Platform.OS === 'android') {
      return await LocalAuthentication.getEnrolledLevelAsync();
    }
    // iOS doesn't have security levels, return highest
    return 3;
  }
}

export default new BiometricService();
