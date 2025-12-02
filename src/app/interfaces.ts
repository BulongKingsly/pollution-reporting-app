export interface AppUser {
  uid: string;
  email: string | null;
  username?: string;  // Unique username
  fullName?: string;  // Full name from sign-up
  contact?: string;  // Contact number
  address?: string;  // Physical address
  profilePictureUrl?: string;  // Profile picture URL
  role: 'user' | 'admin';
  createdAt: any;
  barangay: string;
  suspended?: boolean;  // User suspension status
  settings?: {
    language: 'english' | 'filipino';
    textSize: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark';
    notifications: { email: boolean; announcement: boolean; upvote: boolean };
  };
}

export interface AdminResponse {
  text: string;
  date: string; // or Firebase Timestamp
}

export interface Announcement {
  id?: string;            // Firestore document ID
  title: string;
  subtitle: string;
  description: string;
  date: any;               // Firestore Timestamp
  location: string;
  barangayId?: string;     // optional: null/undefined for global announcements
  createdAt: any;          // optional for ordering
}

export interface Comment {
  id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  text: string;
  createdAt: any;
}

export interface Report {
  reporterId: string;
  reporterName: string;
  type: 'water' | 'air' | 'land';
  location: string;
  date: string;
  time: string;
  description: string;
  images: string[];
  status: 'Pending' | 'In Progress' | 'Done'; // ✅ include all statuses
  upvotes: number;
  upvotedBy?: string[];  // Array of user IDs who upvoted
  adminResponse?: AdminResponse;
  comments?: Comment[];  // Comments by admins
  lat?: number;  // Latitude coordinate
  lng?: number;  // Longitude coordinate
  createdAt: any;
  id?: string;
  barangayId?: string;  // Barangay where the report was submitted
  approved?: boolean;  // Whether report is approved by barangay admin
}
