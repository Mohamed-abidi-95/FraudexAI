import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthState = 'login' | 'signup';
type UserRole = 'client' | 'admin' | null;

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms?: boolean;
}

interface ValidationError {
  message: string;
  field: string;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  authState: AuthState = 'login';
  loginForm!: FormGroup;
  signupForm!: FormGroup;
  
  // UI State
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  validationErrors: ValidationError[] = [];
  
  // User Role
  selectedRole: UserRole = null;

  // Virtual Keypad
  keypadDigits: (number | null)[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get role from query parameters
    this.route.queryParams.subscribe(params => {
      this.selectedRole = params['role'] || null;
    });
    
    this.initializeForms();
    this.shuffleKeypad();
  }

  private initializeForms(): void {
    // Login Form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Signup Form
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)]],
      confirmPassword: ['', Validators.required],
      agreeToTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator for password matching
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onToggleAuthState(state: AuthState): void {
    this.authState = state;
    this.validationErrors = [];
    this.clearPasswords();
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      if (!this.loginForm.get('password')?.value) {
        this.validationErrors = [{ field: 'password', message: 'Password is required' }];
        return;
      }
      this.handleValidationErrors(this.loginForm);
      return;
    }

    this.isLoading = true;
    const formData: LoginFormData = this.loginForm.value;

    this.authService.login(
      formData.email,
      formData.password,
      this.selectedRole as 'client' | 'admin'
    ).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.navigateAfterAuth();
      },
      error: (err) => {
        this.isLoading = false;
        let errorMessage = 'Invalid email or password';
        
        if (err.status === 401) {
          if (err.error?.detail === 'User not found') {
            errorMessage = 'User not found';
          } else if (err.error?.detail === 'Incompatible role') {
            errorMessage = 'Incompatible role selected';
          } else if (err.error?.detail === 'Invalid password') {
            errorMessage = 'Invalid password';
          }
        } else {
          errorMessage = 'Authentication server error. Please try again later.';
        }

        this.validationErrors = [{
          field: 'auth',
          message: errorMessage
        }];
      }
    });
  }

  // Virtual Keypad Methods
  shuffleKeypad(): void {
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const placeholders: (number | null)[] = [null, null, null, null];
    
    const combined = [...digits, ...placeholders];
    
    // Fisher-Yates shuffle
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    
    this.keypadDigits = combined;
  }

  onKeypadSelect(digit: number | null): void {
    if (digit === null) return;
    
    const currentPassword = this.loginForm.get('password')?.value || '';
    this.loginForm.patchValue({
      password: currentPassword + digit.toString()
    });
  }

  onClearKeypad(): void {
    this.loginForm.patchValue({ password: '' });
  }

  onKeypadSubmit(): void {
    this.onLogin();
  }

  onSignup(): void {
    if (this.signupForm.invalid) {
      this.handleValidationErrors(this.signupForm);
      return;
    }

    this.isLoading = true;
    const formData: SignupFormData = this.signupForm.value;

    // Remove confirmPassword before sending to API
    const { confirmPassword, ...submitData } = formData;

    // Simulate API call
    setTimeout(() => {
      console.log('Signup attempt:', submitData);
      
      // Register user in AuthService with their full name
      this.authService.signup(
        formData.fullName,
        formData.email,
        formData.password,
        this.selectedRole as 'client' | 'admin'
      );

      this.isLoading = false;
      
      // Navigate to appropriate dashboard based on selected role
      this.navigateAfterAuth();
    }, 1500);
  }

  onSocialLogin(provider: string): void {
    console.log(`Attempting ${provider} login`);
    this.isLoading = true;

    // Simulate social login
    setTimeout(() => {
      this.isLoading = false;
      console.log(`${provider} login successful`);
      this.navigateAfterAuth();
    }, 1500);
  }

  private handleValidationErrors(form: FormGroup): void {
    this.validationErrors = [];
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      
      if (control && control.errors) {
        let message = '';
        
        if (control.errors['required']) {
          message = `${this.formatFieldName(key)} is required`;
        } else if (control.errors['email']) {
          message = 'Please enter a valid email address';
        } else if (control.errors['minlength']) {
          const minLength = control.errors['minlength'].requiredLength;
          message = `${this.formatFieldName(key)} must be at least ${minLength} characters`;
        } else if (control.errors['pattern']) {
          message = 'Password must contain uppercase, lowercase, and numbers';
        } else if (control.errors['passwordMismatch']) {
          message = 'Passwords do not match';
        }

        if (message) {
          this.validationErrors.push({ field: key, message });
        }
      }
    });
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onBackClick(): void {
    this.router.navigate(['/select']);
  }

  private clearPasswords(): void {
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  private navigateAfterAuth(): void {
    if (this.selectedRole === 'client') {
      // Redirect to client dashboard after successful login
      this.router.navigate(['/client-hub']);
    } else if (this.selectedRole === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      // If no role selected, go back to selection page
      this.router.navigate(['/select']);
    }
  }

  getPasswordError(): string {
    const passwordControl = this.signupForm.get('password');
    if (!passwordControl || !passwordControl.errors) {
      return '';
    }

    if (passwordControl.errors['required']) {
      return 'Password is required';
    }
    if (passwordControl.errors['minlength']) {
      return 'Password must be at least 8 characters';
    }
    if (passwordControl.errors['pattern']) {
      return 'Include uppercase, lowercase, and numbers';
    }
    return '';
  }
}
