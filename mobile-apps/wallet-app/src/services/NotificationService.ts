import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface NotificationData {
  type: 'transaction' | 'mining' | 'price' | 'governance' | 'social';
  title: string;
  body: string;
  data?: any;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Initialize notifications and get push token
   */
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permissions');
        return null;
      }

      // Get push token
      const token = await this.getPushToken();
      this.pushToken = token;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      return token;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  /**
   * Get Expo push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const token = await Notifications.getExpoPushTokenAsync({
        projectId
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Configure Android notification channels
   */
  private async configureAndroidChannels(): Promise<void> {
    // Transactions channel
    await Notifications.setNotificationChannelAsync('transactions', {
      name: 'Transactions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default'
    });

    // Mining channel
    await Notifications.setNotificationChannelAsync('mining', {
      name: 'Mining Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#2196F3'
    });

    // Price alerts channel
    await Notifications.setNotificationChannelAsync('price', {
      name: 'Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800'
    });

    // Governance channel
    await Notifications.setNotificationChannelAsync('governance', {
      name: 'Governance',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#9C27B0'
    });

    // Social channel
    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social Updates',
      importance: Notifications.AndroidImportance.LOW,
      lightColor: '#E91E63'
    });
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(notification: NotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH
      },
      trigger: null // Send immediately
    });
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    notification: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: true
      },
      trigger
    });
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Notification handlers
   */

  // Notify on incoming transaction
  async notifyTransaction(
    amount: number,
    from: string,
    txHash: string
  ): Promise<void> {
    await this.sendLocalNotification({
      type: 'transaction',
      title: 'Incoming Transaction',
      body: `Received ${amount.toFixed(4)} STRAT from ${from.substring(
        0,
        10
      )}...`,
      data: {
        type: 'transaction',
        txHash,
        amount,
        from
      }
    });
  }

  // Notify on transaction confirmation
  async notifyConfirmation(txHash: string, confirmations: number): Promise<void> {
    await this.sendLocalNotification({
      type: 'transaction',
      title: 'Transaction Confirmed',
      body: `Your transaction has ${confirmations} confirmations`,
      data: {
        type: 'confirmation',
        txHash,
        confirmations
      }
    });
  }

  // Notify on mining reward
  async notifyMiningReward(amount: number, blockHeight: number): Promise<void> {
    await this.sendLocalNotification({
      type: 'mining',
      title: 'Block Mined!',
      body: `You earned ${amount.toFixed(4)} STRAT mining block #${blockHeight}`,
      data: {
        type: 'mining',
        amount,
        blockHeight
      }
    });
  }

  // Notify on price alert
  async notifyPriceAlert(
    currentPrice: number,
    targetPrice: number,
    direction: 'above' | 'below'
  ): Promise<void> {
    await this.sendLocalNotification({
      type: 'price',
      title: 'Price Alert',
      body: `STRAT is now $${currentPrice.toFixed(
        2
      )}, ${direction} your target of $${targetPrice.toFixed(2)}`,
      data: {
        type: 'price_alert',
        currentPrice,
        targetPrice,
        direction
      }
    });
  }

  // Notify on governance proposal
  async notifyProposal(
    proposalId: string,
    title: string,
    endDate: Date
  ): Promise<void> {
    await this.sendLocalNotification({
      type: 'governance',
      title: 'New Governance Proposal',
      body: title,
      data: {
        type: 'proposal',
        proposalId,
        endDate: endDate.toISOString()
      }
    });
  }

  // Notify on social interaction
  async notifySocial(
    type: 'like' | 'comment' | 'follow',
    username: string
  ): Promise<void> {
    const messages = {
      like: `${username} liked your post`,
      comment: `${username} commented on your post`,
      follow: `${username} started following you`
    };

    await this.sendLocalNotification({
      type: 'social',
      title: 'Social Update',
      body: messages[type],
      data: {
        type: 'social',
        action: type,
        username
      }
    });
  }

  /**
   * Get push token for server registration
   */
  getPushTokenSync(): string | null {
    return this.pushToken;
  }

  /**
   * Register push token with backend
   */
  async registerPushToken(token: string, address: string): Promise<boolean> {
    try {
      // TODO: Send token to backend
      // await api.registerPushToken({ token, address });
      return true;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return false;
    }
  }

  /**
   * Add notification listener
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();
