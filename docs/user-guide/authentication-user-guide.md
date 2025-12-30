# DMS Authentication User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Account Management](#account-management)
4. [Session Management](#session-management)
5. [Troubleshooting](#troubleshooting)
6. [Security Best Practices](#security-best-practices)
7. [Frequently Asked Questions](#frequently-asked-questions)

## Getting Started

The DMS (Dividend Management System) application provides secure access to your portfolio management tools through AWS Cognito authentication. This guide will help you understand how to use the authentication system effectively.

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Valid DMS user account

### Accessing the Application

Navigate to your DMS application URL. If you're not already logged in, you'll be automatically redirected to the login page.

## Logging In

### Step-by-Step Login Process

1. **Navigate to the Login Page**

   - Open your web browser
   - Go to the DMS application URL
   - You'll see the DMS Login page with the application logo

2. **Enter Your Credentials**

   - **Email Address**: Enter your registered email address
   - **Password**: Enter your password
   - Ensure your credentials are entered correctly

3. **Optional: Remember Me**

   - Check the "Remember me for 90 days" box if you want to stay logged in longer
   - This is recommended only on personal, secure devices
   - Your session will be extended to 90 days instead of the default 1 hour

4. **Sign In**
   - Click the "Sign In" button
   - The system will verify your credentials
   - Upon successful authentication, you'll be redirected to the main application

### Password Requirements

When creating or changing your password, ensure it meets these requirements:

- **Minimum 8 characters**
- **At least one uppercase letter** (A-Z)
- **At least one lowercase letter** (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&\*)

### Common Login Issues

**Invalid Credentials**

- Double-check your email address for typos
- Verify your password is correct
- Check if Caps Lock is enabled

**Account Locked**

- Contact your system administrator
- Wait for the lockout period to expire (typically 15 minutes)

## Account Management

### Accessing Your Profile

1. After logging in, look for your welcome message in the top-right corner
2. Click on the user profile icon (👤) to access your profile
3. Select "Profile" from the dropdown menu

### Changing Your Password

1. **Navigate to Profile**

   - Click on your profile icon in the top-right corner
   - Select "Profile" from the dropdown menu

2. **Access Security Settings**

   - Navigate to the "Security" tab
   - Look for the "Change Password" section

3. **Update Your Password**

   - Enter your current password
   - Enter your new password (must meet requirements above)
   - Confirm your new password
   - Click "Change Password" to save

4. **Confirmation**
   - You'll receive a confirmation message
   - You may be prompted to log in again with your new password

### Account Information

Your profile displays:

- Email address (cannot be changed directly)
- Account creation date
- Last login information
- Session details

## Session Management

### Understanding Sessions

- **Default Session Duration**: 1 hour with automatic refresh
- **Extended Session**: 90 days when "Remember Me" is enabled
- **Automatic Refresh**: Your session refreshes automatically while you're active
- **Session Warning**: You'll receive a warning 10 minutes before expiration

### Session Security Features

- **Automatic Logout**: Sessions expire after inactivity
- **Token Refresh**: Authentication tokens refresh automatically in the background
- **Secure Storage**: Session data is stored securely using HTTP-only cookies
- **Single Sign-On**: One login provides access to all DMS features

### Managing Multiple Sessions

- You can be logged in from multiple devices
- Each session is independent and secure
- Logging out from one device doesn't affect other sessions
- For security, we recommend logging out from shared or public computers

## Troubleshooting

### Cannot Log In

**Check Your Credentials**

1. Verify your email address is spelled correctly
2. Ensure your password is correct
3. Check if Caps Lock is enabled
4. Try typing your password in a text editor first to verify it

**Browser Issues**

1. Clear your browser cache and cookies
2. Try using an incognito/private browser window
3. Disable browser extensions temporarily
4. Try a different browser

**Network Issues**

1. Check your internet connection
2. Try refreshing the page
3. Verify you can access other websites
4. Contact your IT department if on a corporate network

### Session Expired Messages

**Why This Happens**

- Your session has timed out due to inactivity
- Your authentication token has expired
- Network connectivity issues occurred

**How to Resolve**

1. Simply log in again to continue working
2. Enable "Remember Me" for longer sessions
3. Keep the application tab active to prevent timeouts

### Forgot Password

**Recovery Process**

1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for reset instructions
4. Follow the link in the email
5. Create a new password that meets the requirements
6. Return to the login page and sign in with your new password

**Important Notes**

- Password reset links expire after 24 hours
- Check your spam/junk folder if you don't see the email
- Contact your administrator if you don't receive the reset email

### Page Not Loading After Login

1. **Clear Browser Cache**

   - Go to browser settings
   - Clear browsing data
   - Refresh the page

2. **Check Network Connection**

   - Verify internet connectivity
   - Try accessing other websites

3. **Disable Browser Extensions**
   - Temporarily disable ad blockers
   - Disable other browser extensions
   - Try logging in again

## Security Best Practices

### Password Security

- **Use a Strong Password**: Follow all password requirements
- **Don't Share Passwords**: Never share your login credentials
- **Regular Updates**: Change your password periodically
- **Unique Passwords**: Don't reuse passwords from other systems

### Session Security

- **Secure Devices**: Only use "Remember Me" on personal, secure devices
- **Public Computers**: Always log out completely when using shared computers
- **Close Browser**: Close browser windows when finished on public computers
- **Lock Your Screen**: Lock your computer when stepping away

### Recognizing Security Threats

**Phishing Attempts**

- Never enter your credentials on suspicious websites
- Verify the URL is correct before logging in
- Be wary of emails asking for your password

**Suspicious Activity**

- Report any unauthorized access immediately
- Change your password if you suspect it's been compromised
- Contact your system administrator for security concerns

### Safe Browsing Practices

- **Verify URLs**: Always check you're on the correct DMS domain
- **HTTPS Security**: Ensure the login page uses HTTPS (look for the lock icon)
- **Keep Browsers Updated**: Use the latest version of your browser
- **Antivirus Software**: Keep your antivirus software up to date

## Frequently Asked Questions

### General Questions

**Q: How long does my session last?**
A: By default, sessions last 1 hour but refresh automatically while you're active. With "Remember Me" enabled, sessions can last up to 90 days.

**Q: Can I be logged in from multiple devices?**
A: Yes, you can have multiple active sessions across different devices and browsers.

**Q: What happens if I forget to log out?**
A: Your session will automatically expire after the timeout period. For security, always log out from shared computers.

### Technical Questions

**Q: Why do I need to log in again sometimes?**
A: This can happen due to session expiration, security policies, or system updates. Simply log in again to continue.

**Q: Is my data secure?**
A: Yes, DMS uses enterprise-grade security including encrypted connections, secure token storage, and AWS Cognito authentication.

**Q: Can I change my email address?**
A: Contact your system administrator to change your email address, as this typically requires administrative access.

### Troubleshooting Questions

**Q: The login page won't load. What should I do?**
A: Try clearing your browser cache, using a different browser, or checking your internet connection. Contact IT support if the problem persists.

**Q: I'm getting "Session Expired" messages frequently. Why?**
A: This might be due to browser settings, network issues, or security policies. Try enabling "Remember Me" or contact your administrator.

**Q: My password doesn't work, but I'm sure it's correct.**
A: Check for Caps Lock, try typing in a text editor first, or use the "Forgot Password" feature to reset it.

## Getting Help

### Contact Information

**System Administrator**

- Contact your local system administrator for account issues
- They can help with password resets, account access, and permissions

**Technical Support**

- For technical issues with the application
- Report bugs or unexpected behavior
- Request new features or improvements

**Security Concerns**

- Report any suspected security incidents immediately
- Contact your security team for policy questions
- Report phishing attempts or suspicious activity

### Additional Resources

- **System Status**: Check with your administrator for system maintenance schedules
- **Training**: Ask about additional training resources for the DMS application
- **Documentation**: This user guide and other technical documentation are available in the docs folder

---

_This guide was last updated as part of Epic K implementation. For the most current information, please check with your system administrator._
