import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth-guard';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarangaysService, Barangay } from '../services/barangays.service';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.html',
  imports: [RouterLink, CommonModule, FormsModule],
})
export class SignUp {
  username = '';
  fullName = '';
  email = '';
  contact = '';
  address = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  barangays$: Observable<(Barangay & { id?: string })[]> | null = null;
  selectedBarangay = '';

  constructor(private auth: AuthService, private router: Router, private barangaysService: BarangaysService) {
    this.barangays$ = this.barangaysService.getAllBarangays();
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Check if username already exists
    if (this.username) {
      try {
        const usernameExists = await this.auth.checkUsernameExists(this.username);
        if (usernameExists) {
          this.errorMessage = 'Username already taken. Please choose a different one.';
          return;
        }
      } catch (error: any) {
        this.errorMessage = 'Error checking username availability';
        return;
      }
    }

    try {
      // Register user with default role 'user'
      await this.auth.register(this.email, this.password, 'user', this.selectedBarangay, this.fullName, this.contact, this.address, this.username);

      // Success message
      this.successMessage = 'Account created successfully! Redirecting to home...';

      // Redirect after short delay
      setTimeout(() => this.router.navigate(['/']), 1500);

    } catch (error: any) {
      this.errorMessage = error.message || 'Registration failed';
    }
  }
}
