import { Pipe, PipeTransform, effect } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Make it impure so it updates when language changes
})
export class TranslatePipe implements PipeTransform {
  private currentValue: string = '';

  constructor(private translationService: TranslationService) {
    // Update whenever language changes
    effect(() => {
      this.translationService.language(); // Track the signal
      // Force re-evaluation by clearing cache
      this.currentValue = '';
    });
  }

  transform(key: string): string {
    return this.translationService.translate(key);
  }
}
