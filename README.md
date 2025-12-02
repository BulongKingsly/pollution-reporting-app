# Pollution Reporting App

A comprehensive barangay-based pollution reporting and management system built with Angular 20, Firebase, and Bootstrap 5.

## Features

### User Features
- **Report Submission**: Submit pollution reports with images, location (Leaflet map), type, and description
- **Image Compression**: Automatic image compression before upload for optimal storage
- **Barangay-scoped Data**: View reports and announcements specific to your barangay
- **Dashboard Metrics**: See total, pending, and resolved reports for your barangay
- **User Authentication**: Secure login and signup with Firebase Authentication
- **Profile Management**: Update personal information and settings

### Admin Features

#### Main Admin (Global)
- **Barangay Management**: Create, update, and delete barangays
- **User Management**: Assign/remove admin roles, manage users across all barangays
- **Global Analytics**: View aggregated statistics and charts across all barangays with Chart.js
- **System-wide Announcements**: Post announcements visible to all barangays

#### Barangay Admin (Scoped)
- **Local User Management**: Promote/demote users and manage suspensions within their barangay
- **Configuration**: Add/remove streets and pollution types for their barangay
- **Local Announcements**: Post announcements visible only to their barangay residents
- **Barangay Analytics**: View statistics and trends specific to their barangay

### Technology Stack
- **Frontend**: Angular 20 (standalone components)
- **UI Framework**: Bootstrap 5, Font Awesome icons
- **Backend**: Firebase (Firestore Database, Storage, Authentication)
- **Maps**: Leaflet for interactive location selection
- **Charts**: Chart.js for analytics visualization
- **Security**: Client-side and server-side role-based access control

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Firebase project with Firestore, Storage, and Authentication enabled

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pollution-reporting-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Create or update `src/environments/environment.ts` with your Firebase configuration:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "your-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "your-sender-id",
       appId: "your-app-id"
     }
   };
   ```

4. **Deploy Firestore Security Rules**
   
   Deploy the security rules from `firestore.rules` to your Firebase project:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Development server

To start a local development server, run:

```bash
npm start
```

Or using Angular CLI:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`.

## Initial Setup

### Creating the First Admin User

1. **Sign up a regular user** through the signup page
2. **Manually promote to admin** in Firebase Console:
   - Go to Firestore Database
   - Navigate to the `users` collection
   - Find your user document
   - Edit the document and set:
     - `role: "admin"`
     - `barangay: ""` (empty string for main admin, or specific barangay ID for barangay admin)

### Creating Barangays

1. Login as a main admin (user with `role: "admin"` and `barangay: ""`)
2. Navigate to Admin Dashboard
3. Use the "Create New Barangay" form to add barangays
4. Assign barangay admins from the user list

### Admin Role Types

- **Main Admin**: `role: "admin"` with `barangay: ""`
  - Full system access
  - Can create/delete barangays
  - Can assign any user as admin
  - Views global analytics

- **Barangay Admin**: `role: "admin"` with `barangay: "<barangay-id>"`
  - Scoped to their barangay
  - Can manage users within their barangay
  - Can configure streets and pollution types
  - Views barangay-specific analytics

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project for production:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory.

For Firebase Hosting deployment:

```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
src/
├── app/
│   ├── admin-dashboard/         # Main admin dashboard
│   ├── barangay-admin/          # Barangay-scoped admin UI
│   ├── analytics/               # Analytics with Chart.js
│   ├── home/                    # Home page with barangay-scoped reports
│   ├── submit-report/           # Report submission with Leaflet map
│   ├── login/                   # Authentication
│   ├── sign-up/                 # User registration with barangay selection
│   ├── profile/                 # User profile management
│   ├── settings-page/           # User settings
│   ├── help-page/               # Help and support
│   ├── guard/                   # Route guards (admin, auth)
│   └── services/                # Core services
│       ├── auth-guard.ts        # Authentication service
│       ├── users.ts             # User management
│       ├── barangays.service.ts # Barangay CRUD operations
│       ├── reports.ts           # Report management
│       └── announcements.ts     # Announcements service
├── environments/                # Environment configurations
└── firestore.rules             # Firestore security rules
```

## Security

### Client-Side Authorization
All admin services (`UsersService`, `BarangaysService`, `AnnouncementsService`) enforce role-based access:
- Check current user's role and barangay before operations
- Main admins can perform global operations
- Barangay admins restricted to their barangay scope

### Server-Side Security
Firestore security rules enforce:
- Users can only read/write their own data
- Reports are scoped by barangay
- Admin operations verified by role and barangay fields
- Announcements follow barangay scoping rules

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Verify environment.ts configuration
2. **Permission denied errors**: Check Firestore security rules are deployed
3. **Images not uploading**: Ensure Firebase Storage is enabled and rules allow writes
4. **Admin features not visible**: Verify user role is "admin" in Firestore

### Support

For issues or questions, refer to the Help page in the application or contact your system administrator.

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Bootstrap Documentation](https://getbootstrap.com/docs)
- [Leaflet Documentation](https://leafletjs.com)
- [Chart.js Documentation](https://www.chartjs.org)

## License

This project is licensed under the MIT License.
