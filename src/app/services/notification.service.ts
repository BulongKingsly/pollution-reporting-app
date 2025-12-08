import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationData {
  message: string;
  type: NotificationType;
  title?: string;
}

export interface ConfirmData {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface PromptData {
  message: string;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Notification state
  notification = signal<NotificationData | null>(null);
  showNotification = signal(false);

  // Confirm dialog state
  confirmData = signal<ConfirmData | null>(null);
  showConfirmDialog = signal(false);
  private confirmResolve: ((value: boolean) => void) | null = null;

  // Prompt dialog state
  promptData = signal<PromptData | null>(null);
  showPromptDialog = signal(false);
  promptValue = signal('');
  private promptResolve: ((value: string | null) => void) | null = null;

  /**
   * Show a notification message
   */
  show(message: string, type: NotificationType = 'info', title?: string): void {
    this.notification.set({ message, type, title });
    this.showNotification.set(true);
  }

  /**
   * Show success notification
   */
  success(message: string, title?: string): void {
    this.show(message, 'success', title || 'Success');
  }

  /**
   * Show error notification
   */
  error(message: string, title?: string): void {
    this.show(message, 'error', title || 'Error');
  }

  /**
   * Show warning notification
   */
  warning(message: string, title?: string): void {
    this.show(message, 'warning', title || 'Warning');
  }

  /**
   * Show info notification
   */
  info(message: string, title?: string): void {
    this.show(message, 'info', title || 'Notice');
  }

  /**
   * Close the notification
   */
  close(): void {
    this.showNotification.set(false);
    setTimeout(() => this.notification.set(null), 300);
  }

  /**
   * Show a confirm dialog and return a promise
   */
  confirm(message: string, title?: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> {
    this.confirmData.set({ message, title, confirmText, cancelText });
    this.showConfirmDialog.set(true);

    return new Promise<boolean>((resolve) => {
      this.confirmResolve = resolve;
    });
  }

  /**
   * Handle confirm dialog response
   */
  onConfirmResponse(result: boolean): void {
    this.showConfirmDialog.set(false);
    if (this.confirmResolve) {
      this.confirmResolve(result);
      this.confirmResolve = null;
    }
    setTimeout(() => this.confirmData.set(null), 300);
  }

  /**
   * Show a prompt dialog and return a promise with the input value or null if cancelled
   */
  prompt(message: string, title?: string, defaultValue = '', placeholder = '', confirmText = 'OK', cancelText = 'Cancel'): Promise<string | null> {
    this.promptData.set({ message, title, defaultValue, placeholder, confirmText, cancelText });
    this.promptValue.set(defaultValue);
    this.showPromptDialog.set(true);

    return new Promise<string | null>((resolve) => {
      this.promptResolve = resolve;
    });
  }

  /**
   * Handle prompt dialog response
   */
  onPromptResponse(confirmed: boolean): void {
    this.showPromptDialog.set(false);
    if (this.promptResolve) {
      this.promptResolve(confirmed ? this.promptValue() : null);
      this.promptResolve = null;
    }
    setTimeout(() => {
      this.promptData.set(null);
      this.promptValue.set('');
    }, 300);
  }

  /**
   * Update prompt input value
   */
  setPromptValue(value: string): void {
    this.promptValue.set(value);
  }
}
