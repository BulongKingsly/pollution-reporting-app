import { Injectable, signal, computed } from '@angular/core';

export type Language = 'english' | 'filipino';

interface Translations {
  [key: string]: {
    english: string;
    filipino: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage = signal<Language>('english');

  // Expose as readonly computed signal
  language = computed(() => this.currentLanguage());

  private translations: Translations = {
    // Navigation
    'nav.home': { english: 'Home', filipino: 'Tahanan' },
    'nav.help': { english: 'Help', filipino: 'Tulong' },
    'nav.settings': { english: 'Settings', filipino: 'Mga Setting' },
    'nav.admin': { english: 'Admin', filipino: 'Admin' },
    'nav.newReport': { english: 'New Report', filipino: 'Bagong Ulat' },
    'nav.myProfile': { english: 'My Profile', filipino: 'Aking Profile' },
    'nav.logout': { english: 'Logout', filipino: 'Mag-logout' },

    // Admin Dashboard
    'admin.reportsManagement': { english: 'Reports Management', filipino: 'Pamamahala ng mga Ulat' },
    'admin.announcements': { english: 'Announcements', filipino: 'Mga Pabatid' },
    'admin.usersControl': { english: 'Users Control', filipino: 'Kontrol ng mga User' },
    'admin.barangays': { english: 'Barangays', filipino: 'Mga Barangay' },
    'admin.analytics': { english: 'Analytics', filipino: 'Analytics' },
    'admin.goToHome': { english: 'Go to Home', filipino: 'Bumalik sa Tahanan' },

    // Report Status
    'status.all': { english: 'All', filipino: 'Lahat' },
    'status.pending': { english: 'Pending', filipino: 'Naghihintay' },
    'status.inProgress': { english: 'In Progress', filipino: 'Isinasagawa' },
    'status.done': { english: 'Done', filipino: 'Tapos Na' },

    // Report Types
    'type.water': { english: 'Water', filipino: 'Tubig' },
    'type.air': { english: 'Air', filipino: 'Hangin' },
    'type.land': { english: 'Land', filipino: 'Lupa' },

    // Common Actions
    'action.edit': { english: 'Edit', filipino: 'I-edit' },
    'action.delete': { english: 'Delete', filipino: 'Tanggalin' },
    'action.save': { english: 'Save', filipino: 'I-save' },
    'action.cancel': { english: 'Cancel', filipino: 'Kanselahin' },
    'action.submit': { english: 'Submit', filipino: 'Isumite' },
    'action.update': { english: 'Update', filipino: 'I-update' },
    'action.search': { english: 'Search', filipino: 'Maghanap' },
    'action.filter': { english: 'Filter', filipino: 'I-filter' },
    'action.create': { english: 'Create', filipino: 'Lumikha' },
    'action.view': { english: 'View', filipino: 'Tingnan' },
    'action.close': { english: 'Close', filipino: 'Isara' },
    'action.confirm': { english: 'Confirm', filipino: 'Kumpirmahin' },

    // Labels
    'label.reportedBy': { english: 'Reported by', filipino: 'Nag-ulat' },
    'label.location': { english: 'Location', filipino: 'Lokasyon' },
    'label.description': { english: 'Description', filipino: 'Deskripsyon' },
    'label.status': { english: 'Status', filipino: 'Katayuan' },
    'label.type': { english: 'Type', filipino: 'Uri' },
    'label.date': { english: 'Date', filipino: 'Petsa' },
    'label.time': { english: 'Time', filipino: 'Oras' },
    'label.image': { english: 'Image', filipino: 'Larawan' },
    'label.images': { english: 'Images', filipino: 'Mga Larawan' },
    'label.comments': { english: 'Comments', filipino: 'Mga Komento' },
    'label.upvotes': { english: 'Upvotes', filipino: 'Boto' },
    'label.posted': { english: 'Posted', filipino: 'Nai-post' },
    'label.created': { english: 'Created', filipino: 'Nilikha' },

    // Settings
    'settings.title': { english: 'Settings', filipino: 'Mga Setting' },
    'settings.language': { english: 'Language', filipino: 'Wika' },
    'settings.textSize': { english: 'Text Size', filipino: 'Laki ng Teksto' },
    'settings.theme': { english: 'Theme', filipino: 'Tema' },
    'settings.notifications': { english: 'Notifications', filipino: 'Mga Notipikasyon' },
    'settings.english': { english: 'English', filipino: 'Ingles' },
    'settings.filipino': { english: 'Filipino', filipino: 'Filipino' },
    'settings.small': { english: 'Small', filipino: 'Maliit' },
    'settings.medium': { english: 'Medium', filipino: 'Katamtaman' },
    'settings.large': { english: 'Large', filipino: 'Malaki' },
    'settings.light': { english: 'Light', filipino: 'Maliwanag' },
    'settings.dark': { english: 'Dark', filipino: 'Madilim' },
    'settings.changePassword': { english: 'Change Password', filipino: 'Palitan ang Password' },
    'settings.currentPassword': { english: 'Current Password', filipino: 'Kasalukuyang Password' },
    'settings.newPassword': { english: 'New Password', filipino: 'Bagong Password' },
    'settings.confirmPassword': { english: 'Confirm Password', filipino: 'Kumpirmahin ang Password' },

    // Profile
    'profile.title': { english: 'Profile', filipino: 'Profile' },
    'profile.fullName': { english: 'Full Name', filipino: 'Buong Pangalan' },
    'profile.email': { english: 'Email', filipino: 'Email' },
    'profile.username': { english: 'Username', filipino: 'Username' },
    'profile.contact': { english: 'Contact', filipino: 'Contact' },
    'profile.address': { english: 'Address', filipino: 'Address' },
    'profile.barangay': { english: 'Barangay', filipino: 'Barangay' },
    'profile.role': { english: 'Role', filipino: 'Tungkulin' },
    'profile.uploadPhoto': { english: 'Upload Photo', filipino: 'Mag-upload ng Larawan' },

    // Help Page
    'help.title': { english: 'Help & Support', filipino: 'Tulong at Suporta' },
    'help.faq': { english: 'Frequently Asked Questions', filipino: 'Mga Madalas Itanong' },
    'help.contact': { english: 'Contact Information', filipino: 'Impormasyon sa Pakikipag-ugnayan' },
    'help.barangay': { english: 'Barangay', filipino: 'Barangay' },
    'help.adminEmail': { english: 'Admin Email', filipino: 'Admin Email' },
    'help.adminContact': { english: 'Admin Contact', filipino: 'Admin Contact' },

    // Submit Report
    'report.submit': { english: 'Submit Report', filipino: 'Magsumite ng Ulat' },
    'report.title': { english: 'Report Pollution', filipino: 'Mag-ulat ng Polusyon' },
    'report.selectType': { english: 'Select Type', filipino: 'Pumili ng Uri' },
    'report.selectLocation': { english: 'Select Location', filipino: 'Pumili ng Lokasyon' },
    'report.enterDescription': { english: 'Enter Description', filipino: 'Maglagay ng Deskripsyon' },
    'report.uploadImages': { english: 'Upload Images', filipino: 'Mag-upload ng Larawan' },
    'report.dateTaken': { english: 'Date Taken', filipino: 'Petsa ng Pagkuha' },
    'report.timeTaken': { english: 'Time Taken', filipino: 'Oras ng Pagkuha' },

    // Messages
    'message.success': { english: 'Success!', filipino: 'Tagumpay!' },
    'message.error': { english: 'Error', filipino: 'May Mali' },
    'message.loading': { english: 'Loading...', filipino: 'Naglo-load...' },
    'message.noData': { english: 'No data available', filipino: 'Walang available na data' },
    'message.confirmDelete': { english: 'Are you sure you want to delete this?', filipino: 'Sigurado ka bang gusto mong tanggalin ito?' },

    // Login/Signup
    'auth.login': { english: 'Login', filipino: 'Mag-login' },
    'auth.signup': { english: 'Sign Up', filipino: 'Mag-sign Up' },
    'auth.emailOrUsername': { english: 'Email or Username', filipino: 'Email o Username' },
    'auth.password': { english: 'Password', filipino: 'Password' },
    'auth.forgotPassword': { english: 'Forgot Password?', filipino: 'Nakalimutan ang Password?' },
    'auth.dontHaveAccount': { english: "Don't have an account?", filipino: 'Wala pang account?' },
    'auth.alreadyHaveAccount': { english: 'Already have an account?', filipino: 'Mayroon nang account?' },
    'auth.resetPassword': { english: 'Reset Password', filipino: 'I-reset ang Password' },
  };

  constructor() {}

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    document.documentElement.lang = lang === 'filipino' ? 'fil' : 'en';
  }

  translate(key: string): string {
    const translation = this.translations[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translation[this.currentLanguage()];
  }

  // Convenience method for templates
  t(key: string): string {
    return this.translate(key);
  }
}
