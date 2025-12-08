import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// ============================================
// CONFIGURATION - Set these in Firebase Config
// ============================================
// Run: firebase functions:config:set
//   email.user="your-email@gmail.com"
//   email.pass="your-app-password"
// ============================================

// Get configuration (with fallbacks for local development)
const getConfig = () => {
  const config = functions.config();
  return {
    email: {
      user: config.email?.user || process.env.EMAIL_USER || '',
      pass: config.email?.pass || process.env.EMAIL_PASS || ''
    }
  };
};

// Create email transporter (Gmail)
const createEmailTransporter = () => {
  const config = getConfig();
  if (!config.email.user || !config.email.pass) {
    console.warn('Email configuration not set. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.pass // Use App Password for Gmail
    }
  });
};

// Send Email
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const transporter = createEmailTransporter();
  if (!transporter) return false;

  const config = getConfig();

  try {
    await transporter.sendMail({
      from: `"Pollution Report" <${config.email.user}>`,
      to,
      subject,
      html
    });

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Get user notification preferences
const getUserSettings = async (uid: string) => {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const userData = userDoc.data();
  return {
    email: userData?.email || '',
    emailVerified: userData?.emailVerified || false,
    phoneNumber: userData?.phoneNumber || '',
    fullName: userData?.fullName || 'User',
    settings: userData?.settings?.notifications || {
      email: true,
      announcement: true,
      upvote: true,
      passwordChange: true,
      reportStatus: true
    }
  };
};

// ============================================
// FIRESTORE TRIGGER: Report Status Change
// ============================================
export const onReportStatusChange = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const reportId = context.params.reportId;

    // Check if status changed or approved changed
    const statusChanged = before.status !== after.status;
    const approvedChanged = before.approved !== after.approved;

    if (!statusChanged && !approvedChanged) {
      return;
    }

    const reporterId = after.reporterId;
    if (!reporterId) return;

    const user = await getUserSettings(reporterId);

    let statusMessage = '';
    let notificationTitle = '';
    let subject = '';
    let notificationType = '';

    // Report was approved (accepted by admin)
    if (!before.approved && after.approved) {
      notificationTitle = '✅ Report Accepted';
      statusMessage = `Your pollution report at "${after.location}" has been accepted and is now being processed.`;
      subject = `✅ Report Accepted - ${after.type} Pollution`;
      notificationType = 'report_accepted';
    }
    // Status changed to In Progress
    else if (before.status !== 'In Progress' && after.status === 'In Progress') {
      notificationTitle = '🔄 Report In Progress';
      statusMessage = `Your pollution report at "${after.location}" is now being worked on.`;
      subject = `🔄 Report In Progress - ${after.type} Pollution`;
      notificationType = 'report_in_progress';
    }
    // Status changed to Done
    else if (before.status !== 'Done' && after.status === 'Done') {
      notificationTitle = '🎉 Report Resolved';
      statusMessage = `Congratulations! Your pollution report at "${after.location}" has been resolved. Thank you for helping keep our community clean!`;
      subject = `🎉 Report Resolved - ${after.type} Pollution`;
      notificationType = 'report_done';
    }
    // Report was rejected/unapproved
    else if (before.approved && !after.approved) {
      notificationTitle = '❌ Report Rejected';
      statusMessage = `Your report at "${after.location}" has been rejected. Please contact an admin if you have questions.`;
      subject = `❌ Report Rejected - ${after.type} Pollution`;
      notificationType = 'report_rejected';
    }
    else {
      return;
    }

    // Create in-app notification for the user
    const notificationData = {
      userId: reporterId,
      type: notificationType,
      title: notificationTitle,
      message: statusMessage,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reportId: reportId,
      barangayId: after.barangayId || null
    };

    try {
      await admin.firestore().collection('notifications').add(notificationData);
      console.log(`In-app notification created for user ${reporterId} - ${notificationType}`);
    } catch (error) {
      console.error('Error creating in-app notification:', error);
    }

    // Only send email if user has reportStatus notifications enabled and email is verified
    if (user.settings.reportStatus && user.settings.email && user.email && user.emailVerified) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${notificationType === 'report_done' ? '#198754' : notificationType === 'report_accepted' || notificationType === 'report_in_progress' ? '#0dcaf0' : notificationType === 'report_rejected' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center;">
            <h1>${notificationTitle}</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>Hi <strong>${user.fullName}</strong>,</p>
            <p>${statusMessage}</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${notificationType === 'report_done' ? '#198754' : notificationType === 'report_rejected' ? '#dc3545' : '#0dcaf0'};">
              <p><strong>Report ID:</strong> ${reportId}</p>
              <p><strong>Type:</strong> ${after.type} Pollution</p>
              <p><strong>Location:</strong> ${after.location}</p>
              <p><strong>Status:</strong> <span style="color: ${after.status === 'Done' ? '#198754' : after.status === 'In Progress' ? '#0dcaf0' : '#ffc107'}; font-weight: bold;">${after.status}</span></p>
            </div>
            <p>Thank you for helping keep our community clean!</p>
            <hr>
            <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
          </div>
        </div>
      `;

      await sendEmail(user.email, subject, html);
    }
  });

// ============================================
// CLOUD FUNCTION: Send Report Rejection Warning
// ============================================
export const onReportRejection = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify caller is admin
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can send rejection notices');
  }

  const { reportId, reporterId, reportLocation, reportType, reason } = data;

  if (!reportId || !reporterId) {
    throw new functions.https.HttpsError('invalid-argument', 'reportId and reporterId are required');
  }

  const user = await getUserSettings(reporterId);

  const subject = `⚠️ Report Rejected - Action Required`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
        <h1>⚠️ Report Rejected</h1>
      </div>
      <div style="padding: 20px; background: #f8f9fa;">
        <p>Hi <strong>${user.fullName}</strong>,</p>
        <p>Your pollution report has been rejected by an administrator:</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc3545;">
          <p><strong>Report Type:</strong> ${reportType}</p>
          <p><strong>Location:</strong> ${reportLocation}</p>
          <p><strong>Reason for Rejection:</strong> ${reason || 'Content not related to pollution reporting'}</p>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #ffc107;">
          <p style="color: #856404; margin: 0;"><strong>⚠️ WARNING:</strong> Repeatedly posting unrelated, inappropriate, or false reports may result in your account being suspended.</p>
        </div>
        <p>Please ensure your future reports are:</p>
        <ul>
          <li>Related to actual pollution issues (water, air, or land)</li>
          <li>Include accurate location information</li>
          <li>Have relevant photos when possible</li>
          <li>Provide clear descriptions of the problem</li>
        </ul>
        <p>If you believe this was a mistake, please contact your barangay administrator.</p>
        <hr>
        <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
      </div>
    </div>
  `;

  const results = { email: false };

  // Always send rejection notices regardless of user preferences (important)
  if (user.email) {
    results.email = await sendEmail(user.email, subject, html);
  }

  return { success: true, results };
});

// ============================================
// CLOUD FUNCTION: Delete User Auth
// ============================================
export const deleteUserAuth = functions.https.onCall(async (data, context) => {
  // Verify the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Get the caller's user document to verify admin status
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  // Verify caller is an admin
  if (!callerData || callerData.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
  }

  // Get the target user's UID from the request
  const { uid } = data;
  if (!uid || typeof uid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required');
  }

  // Prevent self-deletion
  if (uid === callerUid) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot delete yourself');
  }

  // Get target user's document to verify permissions
  const targetDoc = await admin.firestore().collection('users').doc(uid).get();
  const targetData = targetDoc.data();

  if (!targetData) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  // Check if caller is a barangay admin (has barangay assigned)
  const isMainAdmin = !callerData.barangay || callerData.barangay === '';

  if (!isMainAdmin) {
    // Barangay admins can only delete users in their barangay
    if (targetData.barangay !== callerData.barangay) {
      throw new functions.https.HttpsError('permission-denied', 'You can only delete users in your barangay');
    }
    // Barangay admins cannot delete other admins
    if (targetData.role === 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Barangay admins cannot delete other admins');
    }
  }

  try {
    // Delete the user's authentication account
    await admin.auth().deleteUser(uid);

    // Optionally delete their Firestore document as well
    await admin.firestore().collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', `Failed to delete user: ${error.message}`);
  }
});

// ============================================
// FIRESTORE TRIGGER: Report Upvote Notification
// ============================================
export const onReportUpvote = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const reportId = context.params.reportId;

    // Check if upvotes increased
    const beforeUpvotes = before.upvotes || 0;
    const afterUpvotes = after.upvotes || 0;

    if (afterUpvotes <= beforeUpvotes) {
      return; // No new upvote
    }

    const reporterId = after.reporterId;
    if (!reporterId) return;

    const user = await getUserSettings(reporterId);

    const notificationTitle = '👍 New Upvote!';
    const message = `Your pollution report at "${after.location}" received an upvote! Total: ${afterUpvotes}`;

    // Create in-app notification
    const notificationData = {
      userId: reporterId,
      type: 'upvote',
      title: notificationTitle,
      message: message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reportId: reportId,
      barangayId: after.barangayId || null
    };

    try {
      await admin.firestore().collection('notifications').add(notificationData);
      console.log(`Upvote notification created for user ${reporterId}`);
    } catch (error) {
      console.error('Error creating upvote notification:', error);
    }

    // Check if user wants upvote email notifications
    if (!user.settings.upvote) return;

    const subject = `👍 Your Report Received an Upvote!`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #198754; color: white; padding: 20px; text-align: center;">
          <h1>👍 New Upvote!</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p>Hi <strong>${user.fullName}</strong>,</p>
          <p>${message}</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Report:</strong> ${after.type} Pollution at ${after.location}</p>
            <p><strong>Total Upvotes:</strong> <span style="color: #198754; font-weight: bold; font-size: 1.2em;">${afterUpvotes}</span></p>
          </div>
          <p>Thank you for contributing to a cleaner community!</p>
          <hr>
          <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
        </div>
      </div>
    `;

    // Only send email if verified
    if (user.settings.email && user.email && user.emailVerified) {
      await sendEmail(user.email, subject, html);
    }
  });

// ============================================
// FIRESTORE TRIGGER: Admin Response/Comment Notification
// ============================================
export const onAdminResponse = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const reportId = context.params.reportId;

    // Check if admin response was added or updated
    const beforeResponse = before.adminResponse?.text || '';
    const afterResponse = after.adminResponse?.text || '';

    // Check if comments were added
    const beforeComments = before.comments?.length || 0;
    const afterComments = after.comments?.length || 0;

    const hasNewResponse = afterResponse && afterResponse !== beforeResponse;
    const hasNewComment = afterComments > beforeComments;

    if (!hasNewResponse && !hasNewComment) {
      return;
    }

    const reporterId = after.reporterId;
    if (!reporterId) return;

    // Get the latest comment to check if it's from an admin
    let latestComment: any = null;
    let isAdminComment = false;
    if (hasNewComment && after.comments && after.comments.length > 0) {
      latestComment = after.comments[after.comments.length - 1];
      isAdminComment = latestComment.userRole === 'admin';

      // Don't notify the user if they made the comment themselves
      if (latestComment.userId === reporterId) {
        return;
      }
    }

    const user = await getUserSettings(reporterId);

    let notificationTitle = '';
    let message = '';
    let notificationType = '';
    let subject = '';
    let html = '';

    if (hasNewComment && isAdminComment) {
      notificationTitle = '💬 Admin Comment';
      message = `An admin commented on your report at "${after.location}": "${latestComment.text.substring(0, 50)}${latestComment.text.length > 50 ? '...' : ''}"`;
      notificationType = 'admin_comment';
      subject = `💬 New Comment on Your Report`;

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0dcaf0; color: white; padding: 20px; text-align: center;">
            <h1>💬 New Admin Comment</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>Hi <strong>${user.fullName}</strong>,</p>
            <p>An administrator has commented on your pollution report:</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0dcaf0;">
              <p><strong>Report:</strong> ${after.type} Pollution at ${after.location}</p>
              <p><strong>Comment:</strong></p>
              <p style="font-style: italic; color: #333;">"${latestComment.text}"</p>
              <p style="color: #6c757d; font-size: 12px;">- ${latestComment.userName || 'Admin'}</p>
            </div>
            <p>You can view your report and respond in the app.</p>
            <hr>
            <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
          </div>
        </div>
      `;
    } else if (hasNewResponse) {
      notificationTitle = '📝 Admin Response';
      message = `An admin responded to your report at "${after.location}": "${afterResponse.substring(0, 50)}${afterResponse.length > 50 ? '...' : ''}"`;
      notificationType = 'admin_response';
      subject = `📝 Admin Response to Your Report`;

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6f42c1; color: white; padding: 20px; text-align: center;">
            <h1>📝 Admin Response</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>Hi <strong>${user.fullName}</strong>,</p>
            <p>An administrator has responded to your pollution report:</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6f42c1;">
              <p><strong>Report:</strong> ${after.type} Pollution at ${after.location}</p>
              <p><strong>Admin Response:</strong></p>
              <p style="font-style: italic; color: #333;">"${afterResponse}"</p>
            </div>
            <p>Thank you for your report!</p>
            <hr>
            <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
          </div>
        </div>
      `;
    } else {
      // Regular user comment, don't notify
      return;
    }

    // Create in-app notification
    const notificationData = {
      userId: reporterId,
      type: notificationType,
      title: notificationTitle,
      message: message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reportId: reportId,
      barangayId: after.barangayId || null,
      fromUserName: latestComment?.userName || 'Admin'
    };

    try {
      await admin.firestore().collection('notifications').add(notificationData);
      console.log(`Admin response notification created for user ${reporterId}`);
    } catch (error) {
      console.error('Error creating admin response notification:', error);
    }

    // Only send email if user has notifications enabled and email is verified
    if (user.settings.reportStatus && user.settings.email && user.email && user.emailVerified) {
      await sendEmail(user.email, subject, html);
    }
  });

// ============================================
// FIRESTORE TRIGGER: New Announcement Notification
// ============================================
export const onNewAnnouncement = functions.firestore
  .document('announcements/{announcementId}')
  .onCreate(async (snapshot) => {
    const announcement = snapshot.data();

    if (!announcement) return;

    const barangayId = announcement.barangayId;
    const title = announcement.title || 'New Announcement';
    const description = announcement.description || '';

    // Get all users who should receive this announcement
    let usersQuery;
    if (barangayId) {
      // Barangay-specific announcement
      usersQuery = admin.firestore().collection('users').where('barangay', '==', barangayId);
    } else {
      // Global announcement - notify all users
      usersQuery = admin.firestore().collection('users');
    }

    const usersSnapshot = await usersQuery.get();

    const subject = `📢 ${title}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fd7e14; color: white; padding: 20px; text-align: center;">
          <h1>📢 New Announcement</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">${title}</h2>
          ${announcement.subtitle ? `<h4 style="color: #6c757d;">${announcement.subtitle}</h4>` : ''}
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p>${description}</p>
          </div>
          <p style="color: #6c757d; font-size: 12px;">Posted on ${new Date().toLocaleDateString()}</p>
          <hr>
          <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
        </div>
      </div>
    `;

    // Send notifications to all applicable users
    const notificationPromises: Promise<void>[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userSettings = userData?.settings?.notifications || {
        email: true,
        announcement: true
      };

      // Check if user wants announcement notifications
      if (!userSettings.announcement) return;

      const userEmail = userData?.email;
      const emailVerified = userData?.emailVerified || false;
      const userName = userData?.fullName || 'User';

      const personalizedHtml = html.replace('New Announcement', `Hi ${userName}, New Announcement`);

      // Only send email to verified email addresses
      if (userSettings.email && userEmail && emailVerified) {
        notificationPromises.push(
          sendEmail(userEmail, subject, personalizedHtml).then(() => {})
        );
      }
    });

    await Promise.all(notificationPromises);
    console.log(`Announcement notifications sent to ${notificationPromises.length} recipients`);
  });

// ============================================
// VERIFICATION HELPER FUNCTIONS
// ============================================

// Generate a random 6-digit code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================
// EMAIL VERIFICATION FUNCTIONS
// ============================================

// Send Email Verification Code
export const sendEmailVerificationCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;

  // Get user's email from Firestore
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const userData = userDoc.data();

  if (!userData || !userData.email) {
    throw new functions.https.HttpsError('failed-precondition', 'User email not found');
  }

  const email = userData.email;

  try {
    // Generate 6-digit code
    const code = generateVerificationCode();

    // Store code in Firestore with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await admin.firestore().collection('emailVerifications').doc(uid).set({
      code,
      email,
      expiresAt,
      attempts: 0,
      createdAt: new Date()
    });

    // Send email with verification code
    const subject = '🔐 Verify Your Email - Pollution Report App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #198754; color: white; padding: 20px; text-align: center;">
          <h1>Email Verification</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p>Hi <strong>${userData.fullName || 'User'}</strong>,</p>
          <p>Your email verification code is:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="color: #198754; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
        </div>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, html);

    if (emailSent) {
      console.log(`Email verification code sent to ${email} for user ${uid}`);
      return { success: true, message: 'Verification code sent to your email' };
    } else {
      return { success: false, error: 'Failed to send email. Please try again.' };
    }
  } catch (error) {
    console.error('Error sending email verification code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification code');
  }
});

// Verify Email Code
export const verifyEmailCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const { code } = data;

  if (!code) {
    return { success: false, message: 'Verification code is required' };
  }

  try {
    const verificationRef = admin.firestore().collection('emailVerifications').doc(uid);
    const verificationDoc = await verificationRef.get();

    if (!verificationDoc.exists) {
      return { success: false, message: 'No verification code found. Please request a new code.' };
    }

    const verificationData = verificationDoc.data();

    // Check if code has expired
    const expiresAt = verificationData?.expiresAt?.toDate?.() || new Date(verificationData?.expiresAt);
    if (new Date() > expiresAt) {
      await verificationRef.delete();
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    // Check attempts (max 5)
    const attempts = (verificationData?.attempts || 0) + 1;
    if (attempts > 5) {
      await verificationRef.delete();
      return { success: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    // Update attempts
    await verificationRef.update({ attempts });

    // Verify code
    if (verificationData?.code !== code) {
      return { success: false, message: `Invalid code. ${5 - attempts} attempts remaining.` };
    }

    // Code is valid! Update user's email verification status
    await admin.firestore().collection('users').doc(uid).update({
      emailVerified: true,
      emailVerifiedAt: new Date()
    });

    // Delete the verification document
    await verificationRef.delete();

    console.log(`Email verified for user ${uid}`);
    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    console.error('Error verifying email code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify code');
  }
});

// ============================================
// PASSWORD CHANGE VERIFICATION FUNCTIONS
// ============================================

// Send Password Change Verification Code
export const sendPasswordChangeCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;

  // Get user's email from Firestore
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const userData = userDoc.data();

  if (!userData || !userData.email) {
    throw new functions.https.HttpsError('failed-precondition', 'User email not found');
  }

  const email = userData.email;

  try {
    // Generate 6-digit code
    const code = generateVerificationCode();

    // Store code in Firestore with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await admin.firestore().collection('passwordChangeVerifications').doc(uid).set({
      code,
      email,
      expiresAt,
      attempts: 0,
      createdAt: new Date()
    });

    // Send email with verification code
    const subject = '🔐 Password Change Verification - Pollution Report App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ffc107; color: #000; padding: 20px; text-align: center;">
          <h1>Password Change Request</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p>Hi <strong>${userData.fullName || 'User'}</strong>,</p>
          <p>You have requested to change your password. Your verification code is:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="color: #ffc107; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #dc3545;"><strong>⚠️ If you did not request this password change, please ignore this email and ensure your account is secure.</strong></p>
          <hr>
          <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
        </div>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, html);

    if (emailSent) {
      console.log(`Password change verification code sent to ${email} for user ${uid}`);
      return { success: true, message: 'Verification code sent to your email' };
    } else {
      return { success: false, error: 'Failed to send email. Please try again.' };
    }
  } catch (error) {
    console.error('Error sending password change verification code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification code');
  }
});

// Verify Password Change Code
export const verifyPasswordChangeCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const { code } = data;

  if (!code) {
    return { success: false, message: 'Verification code is required' };
  }

  try {
    const verificationRef = admin.firestore().collection('passwordChangeVerifications').doc(uid);
    const verificationDoc = await verificationRef.get();

    if (!verificationDoc.exists) {
      return { success: false, message: 'No verification code found. Please request a new code.' };
    }

    const verificationData = verificationDoc.data();

    // Check if code has expired
    const expiresAt = verificationData?.expiresAt?.toDate?.() || new Date(verificationData?.expiresAt);
    if (new Date() > expiresAt) {
      await verificationRef.delete();
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    // Check attempts (max 5)
    const attempts = (verificationData?.attempts || 0) + 1;
    if (attempts > 5) {
      await verificationRef.delete();
      return { success: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    // Update attempts
    await verificationRef.update({ attempts });

    // Verify code
    if (verificationData?.code !== code) {
      return { success: false, message: `Invalid code. ${5 - attempts} attempts remaining.` };
    }

    // Code is valid! Delete the verification document
    await verificationRef.delete();

    console.log(`Password change verified for user ${uid}`);
    return { success: true, message: 'Code verified successfully' };
  } catch (error) {
    console.error('Error verifying password change code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify code');
  }
});

// ============================================
// CUSTOM PASSWORD RESET EMAIL FUNCTION
// ============================================

// Send custom formatted password reset email
export const sendCustomPasswordResetEmail = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  try {
    // Check if user exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Don't reveal if user exists or not for security
        return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
      }
      throw error;
    }

    // Get user data from Firestore for personalization
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const userName = userData?.fullName || userData?.username || 'User';

    // Generate password reset link
    const actionCodeSettings = {
      url: 'https://local-pollution-report-app.web.app/login',
      handleCodeInApp: false
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // Send nicely formatted email
    const subject = '🔑 Reset Your Password - Pollution Report App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>🔑 Password Reset</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We received a request to reset the password for your Pollution Report App account associated with <strong>${email}</strong>.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background: #198754; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              Reset Your Password
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="background: white; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #0d6efd;">${resetLink}</p>

          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ This link will expire in 1 hour.</strong></p>
          </div>

          <p style="color: #6c757d;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
          <p style="color: #6c757d; font-size: 12px; text-align: center;">
            Pollution Report App - Keeping our barangays clean<br>
            <em>This is an automated message, please do not reply.</em>
          </p>
        </div>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, html);

    if (emailSent) {
      console.log(`Password reset email sent to ${email}`);
      return { success: true, message: 'Password reset link has been sent to your email.' };
    } else {
      return { success: false, error: 'Failed to send email. Please try again.' };
    }
  } catch (error: any) {
    console.error('Error sending password reset email:', error);

    if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address.' };
    }

    return { success: false, error: 'Failed to send reset email. Please try again.' };
  }
});

// ============================================
// FIRESTORE TRIGGER: New Report Notification to Admins
// ============================================
export const onNewReportSubmitted = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snapshot, context) => {
    const report = snapshot.data();
    const reportId = context.params.reportId;

    if (!report) return;

    const barangayId = report.barangayId;
    const reporterName = report.reporterName || 'A user';
    const pollutionType = report.type || 'Unknown';
    const location = report.location || 'Unknown location';

    // Get admins to notify:
    // 1. Barangay admins assigned to this barangay
    // 2. Main admins (admins with no barangay assigned)
    const adminsToNotify: Array<{
      id: string;
      email: string;
      fullName: string;
      emailVerified: boolean;
      isMainAdmin: boolean;
    }> = [];

    // Get barangay admins for this specific barangay
    if (barangayId) {
      const barangayAdminsSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .where('barangay', '==', barangayId)
        .get();

      barangayAdminsSnapshot.forEach((doc) => {
        const adminData = doc.data();
        adminsToNotify.push({
          id: doc.id,
          email: adminData.email || '',
          fullName: adminData.fullName || 'Admin',
          emailVerified: adminData.emailVerified || false,
          isMainAdmin: false
        });
      });
    }

    // Get main admins (no barangay assigned or empty barangay)
    const mainAdminsSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    mainAdminsSnapshot.forEach((doc) => {
      const adminData = doc.data();
      // Main admin = no barangay or empty barangay
      const isMainAdmin = !adminData.barangay || adminData.barangay === '';
      if (isMainAdmin) {
        // Avoid duplicates
        if (!adminsToNotify.find(a => a.id === doc.id)) {
          adminsToNotify.push({
            id: doc.id,
            email: adminData.email || '',
            fullName: adminData.fullName || 'Admin',
            emailVerified: adminData.emailVerified || false,
            isMainAdmin: true
          });
        }
      }
    });

    if (adminsToNotify.length === 0) {
      console.log('No admins to notify for new report');
      return;
    }

    // Create in-app notifications and send emails
    const notificationPromises: Promise<any>[] = [];
    const emailPromises: Promise<any>[] = [];

    const notificationTitle = '📋 New Report Submitted';
    const notificationMessage = `${reporterName} submitted a new ${pollutionType} pollution report at ${location}`;

    for (const adminUser of adminsToNotify) {
      // Create in-app notification
      const notificationData = {
        userId: adminUser.id,
        type: 'new_report',
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        reportId: reportId,
        barangayId: barangayId || null,
        fromUserId: report.reporterId || null,
        fromUserName: reporterName
      };

      notificationPromises.push(
        admin.firestore().collection('notifications').add(notificationData)
      );

      // Send email notification if admin has verified email
      if (adminUser.email && adminUser.emailVerified) {
        const subject = `📋 New ${pollutionType} Pollution Report - ${barangayId || 'Your Area'}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0d6efd; color: white; padding: 20px; text-align: center;">
              <h1>📋 New Report Submitted</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <p>Hi <strong>${adminUser.fullName}</strong>,</p>
              <p>A new pollution report has been submitted${adminUser.isMainAdmin ? '' : ' in your barangay'}:</p>
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0d6efd;">
                <p><strong>Report ID:</strong> ${reportId}</p>
                <p><strong>Pollution Type:</strong> ${pollutionType}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Submitted by:</strong> ${reporterName}</p>
                ${barangayId ? `<p><strong>Barangay:</strong> ${barangayId}</p>` : ''}
                <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
              </div>
              <p>Please log in to the admin dashboard to review and take action on this report.</p>
              <hr>
              <p style="color: #6c757d; font-size: 12px;">Pollution Report App - Keeping our barangays clean</p>
            </div>
          </div>
        `;

        emailPromises.push(sendEmail(adminUser.email, subject, html));
      }
    }

    try {
      await Promise.all([...notificationPromises, ...emailPromises]);
      console.log(`Notifications sent to ${adminsToNotify.length} admins for new report ${reportId}`);
    } catch (error) {
      console.error('Error sending new report notifications:', error);
    }
  });

