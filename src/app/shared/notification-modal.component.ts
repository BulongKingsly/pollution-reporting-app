import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Notification Modal -->
    @if (notificationService.showNotification()) {
      <div class="modal-backdrop" (click)="notificationService.close()">
        <div class="modal-content notification-modal" [class]="'type-' + notificationService.notification()?.type" (click)="$event.stopPropagation()">
          <div class="modal-icon">
            @switch (notificationService.notification()?.type) {
              @case ('success') {
                <i class="fas fa-check-circle"></i>
              }
              @case ('error') {
                <i class="fas fa-times-circle"></i>
              }
              @case ('warning') {
                <i class="fas fa-exclamation-triangle"></i>
              }
              @default {
                <i class="fas fa-info-circle"></i>
              }
            }
          </div>
          @if (notificationService.notification()?.title) {
            <h4 class="modal-title">{{ notificationService.notification()?.title }}</h4>
          }
          <p class="modal-message">{{ notificationService.notification()?.message }}</p>
          <button class="modal-btn" [class]="'btn-' + notificationService.notification()?.type" (click)="notificationService.close()">
            OK
          </button>
        </div>
      </div>
    }

    <!-- Confirm Dialog Modal -->
    @if (notificationService.showConfirmDialog()) {
      <div class="modal-backdrop">
        <div class="modal-content confirm-modal" (click)="$event.stopPropagation()">
          <div class="modal-icon type-warning">
            <i class="fas fa-question-circle"></i>
          </div>
          @if (notificationService.confirmData()?.title) {
            <h4 class="modal-title">{{ notificationService.confirmData()?.title }}</h4>
          }
          <p class="modal-message">{{ notificationService.confirmData()?.message }}</p>
          <div class="modal-buttons">
            <button class="modal-btn btn-cancel" (click)="notificationService.onConfirmResponse(false)">
              {{ notificationService.confirmData()?.cancelText || 'Cancel' }}
            </button>
            <button class="modal-btn btn-confirm" (click)="notificationService.onConfirmResponse(true)">
              {{ notificationService.confirmData()?.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Prompt Dialog Modal -->
    @if (notificationService.showPromptDialog()) {
      <div class="modal-backdrop">
        <div class="modal-content prompt-modal" (click)="$event.stopPropagation()">
          <div class="modal-icon type-info">
            <i class="fas fa-edit"></i>
          </div>
          @if (notificationService.promptData()?.title) {
            <h4 class="modal-title">{{ notificationService.promptData()?.title }}</h4>
          }
          <p class="modal-message">{{ notificationService.promptData()?.message }}</p>
          <input
            type="text"
            class="prompt-input"
            [value]="notificationService.promptValue()"
            (input)="onPromptInput($event)"
            [placeholder]="notificationService.promptData()?.placeholder || ''"
            (keydown.enter)="notificationService.onPromptResponse(true)"
            #promptInput>
          <div class="modal-buttons">
            <button class="modal-btn btn-cancel" (click)="notificationService.onPromptResponse(false)">
              {{ notificationService.promptData()?.cancelText || 'Cancel' }}
            </button>
            <button class="modal-btn btn-confirm" (click)="notificationService.onPromptResponse(true)">
              {{ notificationService.promptData()?.confirmText || 'OK' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    }

    .modal-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .modal-icon i {
      display: inline-block;
    }

    .type-success .modal-icon, .modal-icon.type-success { color: #198754; }
    .type-error .modal-icon, .modal-icon.type-error { color: #dc3545; }
    .type-warning .modal-icon, .modal-icon.type-warning { color: #ffc107; }
    .type-info .modal-icon, .modal-icon.type-info { color: #0dcaf0; }

    .modal-title {
      margin: 0 0 12px 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
    }

    .modal-message {
      margin: 0 0 24px 0;
      color: #666;
      font-size: 1rem;
      line-height: 1.5;
    }

    .modal-btn {
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-success { background: #198754; color: white; }
    .btn-success:hover { background: #157347; }

    .btn-error { background: #dc3545; color: white; }
    .btn-error:hover { background: #bb2d3b; }

    .btn-warning { background: #ffc107; color: #000; }
    .btn-warning:hover { background: #ffca2c; }

    .btn-info { background: #0dcaf0; color: #000; }
    .btn-info:hover { background: #31d2f2; }

    .modal-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
    }
    .btn-cancel:hover { background: #5c636a; }

    .btn-confirm {
      background: #198754;
      color: white;
    }
    .btn-confirm:hover { background: #157347; }

    .prompt-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 20px;
      transition: border-color 0.2s ease;
    }

    .prompt-input:focus {
      outline: none;
      border-color: #198754;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .modal-content {
        background: #2d2d2d;
      }
      .modal-title { color: #fff; }
      .modal-message { color: #ccc; }
      .prompt-input {
        background: #3d3d3d;
        border-color: #4d4d4d;
        color: #fff;
      }
      .prompt-input:focus {
        border-color: #198754;
      }
    }
  `]
})
export class NotificationModalComponent {
  notificationService = inject(NotificationService);

  onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.notificationService.setPromptValue(input.value);
  }
}
