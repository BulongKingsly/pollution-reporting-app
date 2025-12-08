import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationModalComponent } from './shared/notification-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('pollution-reporting-app');
}
