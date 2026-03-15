# Phase 6: Integration Testing Guide

## Overview
This guide provides comprehensive testing procedures for verifying all features implemented in Phases 2-5:
- **Phase 2**: Email System Integration
- **Phase 3**: Authorization Middleware (Role-Based Access Control)
- **Phase 4**: Profile Field Validation
- **Phase 5**: Frontend Profile Pages

---

## Phase 2: Email System Integration Testing

### Setup (Development)
1. Email system is configured to use **Ethereal (test) mode** by default in `.env`:
   ```
   EMAIL_PROVIDER=test
   ```
2. No SMTP credentials needed for testing - uses temporary Ethereal accounts
3. Logs will show test email preview URLs

### Test Scenarios

#### 2.1 Test Donor Registration Email
**Action**: Create a new donor account via admin
1. Navigate to Admin Dashboard → Donors → Create New Donor
2. Fill in: Name, Email, Password, optional Pledge Amount
3. Click "Create Donor"

**Expected Result**:
- Donor account created successfully (message displayed)
- In backend logs: Look for email preview URL
- Email should contain: Welcome message, login instructions, donor name

**Test Command** (if testing via API):
```bash
curl -X POST http://localhost:3001/api/admin/donors \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Donor",
    "email": "test.donor@example.com",
    "password": "SecurePass123",
    "pledgeAmount": 1000
  }'
```

#### 2.2 Test Payment Confirmation Email
**Action**: Record a payment for a donor
1. Navigate to Admin Dashboard → Select a Donor
2. Click "Add Payment"
3. Fill in: Amount ($50+), Date (today), Method (Card, Bank Transfer, Cash, or Check)
4. Click "Save Payment"

**Expected Result**:
- Payment recorded successfully
- In backend logs: Email preview URL
- Email should contain: Payment amount, method, date, pledge progress (total paid vs. pledge amount)

#### 2.3 Test Engagement Confirmation Email
**Action**: Create or update a pledge/engagement
1. Navigate to Admin Dashboard → Select Donor → Engagement section
2. Enter Pledge Amount and Start/End dates
3. Click "Create Engagement" or "Update Engagement"

**Expected Result**:
- Engagement saved successfully
- Email sent with confirmation
- Email contains: Pledge amount, start/end dates, donor name

**Donor Side** - Create engagement via self-service:
1. Login as donor
2. Navigate to Dashboard → Engagement section
3. Enter pledge amount and dates
4. Email should be sent immediately

#### 2.4 Test Request Status Update Emails
**Action**: Process requests with different statuses
1. Navigate to Admin Dashboard → Requests
2. Select a request

**Test Approve**:
- Click "Approve Request"
- Email sent to requester
- Email contains: "approved" status, request type

**Test Decline**:
- Click "Decline Request"
- Email sent to requester
- Email contains: "declined" status, contact message

**Test Place on Hold**:
- Click "Hold Request"
- Email sent to requester
- Email contains: "under review" message

#### 2.5 Test Admin Account Creation Email
**Action**: Create a new admin account
1. Navigate to Admin Dashboard → Admins → Create Admin
2. Fill in: Name, Email, Password
3. Click "Create Admin"

**Expected Result**:
- Admin account created
- Email sent to admin's email address
- Email contains: Login credentials, security warning, login URL
- **SECURITY NOTE**: Password in email is temporary - should be changed on first login

#### 2.6 Test Donor Deactivation Email
**Action**: Deactivate a donor account
1. Navigate to Admin Dashboard → Donors
2. Select a donor
3. Click "Deactivate"

**Expected Result**:
- Donor marked as inactive
- Email sent to donor
- Email contains: Deactivation notice, contact message

### Logging Email Test Results
Check the backend console for test email URLs:
```
[info] Mail sent: Test email preview URL: https://ethereal.email/message/xxxxx
```

Open URL in browser to see the actual rendered email.

---

## Phase 3: Authorization/Role-Based Access Control Testing

### Setup
1. Database contains 3 roles with specific capabilities:
   - **admin**: Full access (all 17 capabilities)
   - **moderator**: Partial access (5 capabilities)
   - **donor**: Limited access (3 capabilities)

2. Test accounts (from seed data):
   - Admin: `admin@masjid.com` / `admin123` (has admin role)
   - Donor 1: `ahmed@example.com` / `demo123` (has donor role)

### Capability List
```
Admin Donor Management (5):
  - admin.donors.view
  - admin.donors.create
  - admin.donors.edit
  - admin.donors.delete
  - admin.donors.deactivate

Admin Request Management (3):
  - admin.requests.view
  - admin.requests.approve
  - admin.requests.reject

Admin Management (4):
  - admin.admins.view
  - admin.admins.create
  - admin.admins.edit
  - admin.admins.delete

Admin Statistics & Logs (2):
  - admin.statistics.view
  - admin.logs.view

Donor Self-Service (3):
  - donor.profile.view
  - donor.profile.edit
  - donor.payments.view
```

### Test Scenarios

#### 3.1 Test Admin with Full Access
**Login as**: `admin@masjid.com` / `admin123`

**Test each endpoint** (should all return 200):
- GET `/api/admin/donors` - View all donors
- POST `/api/admin/donors` - Create new donor
- GET `/api/admin/admins` - List admins
- POST `/api/admin/admins` - Create admin
- GET `/api/admin/requests` - List requests
- PUT `/api/admin/requests/:id/approve` - Approve request
- GET `/api/admin/logs` - View activity logs
- GET `/api/admin/stats` - View statistics

**Expected Result**: All endpoints return 200 OK

#### 3.2 Test Insufficient Permissions
**Setup**: Assign donor role to a test admin account

**Test with donor-only role**:
- Try accessing `/api/admin/donors` → Should return **403 Forbidden**
- Try deleting a donor → Should return **403 Forbidden**
- Try accessing `/api/admin/stats` → Should return **403 Forbidden**

**Response Format**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions. Required capability: admin.donors.delete"
  }
}
```

#### 3.3 Test Capability Checks on Each Admin Route

| Endpoint | Method | Required Capability | Test User |
|----------|--------|-------------------|-----------|
| `/api/admin/donors` | GET | admin.donors.view | admin ✅ |
| `/api/admin/donors` | POST | admin.donors.create | admin ✅ |
| `/api/admin/donors/:id` | GET | admin.donors.view | admin ✅ |
| `/api/admin/donors/:id` | PUT | admin.donors.edit | admin ✅ |
| `/api/admin/donors/:id` | DELETE | admin.donors.delete | admin ✅ |
| `/api/admin/admins` | GET | admin.admins.view | admin ✅ |
| `/api/admin/admins` | POST | admin.admins.create | admin ✅ |
| `/api/admin/admins/:id` | PUT | admin.admins.edit | admin ✅ |
| `/api/admin/admins/:id` | DELETE | admin.admins.delete | admin ✅ |
| `/api/admin/requests` | GET | admin.requests.view | admin ✅ |
| `/api/admin/requests/:id/approve` | PUT | admin.requests.approve | admin ✅ |
| `/api/admin/requests/:id/decline` | PUT | admin.requests.reject | admin ✅ |
| `/api/admin/logs` | GET | admin.logs.view | admin ✅ |
| `/api/admin/stats` | GET | admin.statistics.view | admin ✅ |

### Testing Tools

#### Using cURL
```bash
# Test with admin token
ADMIN_TOKEN="your_admin_access_token"

# Should succeed
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/donors

# Test unauthorized access (use donor token)
DONOR_TOKEN="your_donor_access_token"
curl -H "Authorization: Bearer $DONOR_TOKEN" \
  http://localhost:3001/api/admin/donors
# Expected: 403 Forbidden
```

#### Using Frontend
1. Login as admin
2. Verify all admin dashboard pages load
3. Try accessing URLs via browser console:
   ```javascript
   fetch('/api/admin/donors', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
   }).then(r => r.json()).then(d => console.log(d));
   ```

---

## Phase 4: Profile Field Validation Testing

### Fields Added
1. **phoneNumber** - Phone format validation
2. **address** - Max 255 chars
3. **city** - Max 100 chars
4. **country** - Max 100 chars
5. **postalCode** - Max 20 chars
6. **dateOfBirth** - Date-time format
7. **taxNumber** - Max 50 chars
8. **companyName** - Max 200 chars

### Test Scenarios

#### 4.1 Test Valid Profile Update
**Action**: Update profile with valid data
1. Login as donor
2. Navigate to Profile → Edit Profile
3. Fill in:
   - Phone: `+1-555-0123`
   - Address: `123 Main Street`
   - City: `New York`
   - Country: `USA`
   - Postal Code: `10001`
   - Date of Birth: `1990-01-15`
   - Tax Number: `12-3456789`
   - Company: `ABC Corporation`
4. Click "Save Changes"

**Expected Result**:
- "Profile updated successfully" message
- Redirects to profile view page
- All fields display updated values

#### 4.2 Test Invalid Phone Number
**Action**: Enter invalid phone format
1. Go to Edit Profile
2. Phone field: `invalid-phone`
3. Click Save

**Expected Result**:
- Error message: "Invalid phone number format"
- Form remains on edit page
- Data is not saved

#### 4.3 Test Field Length Validation
**Action**: Enter text exceeding max length
1. Go to Edit Profile
2. Company name: Enter 250+ characters
3. Click Save

**Expected Result**:
- Error message about max length
- Form doesn't submit

#### 4.4 Test Optional Fields
**Action**: Leave optional fields blank
1. Go to Edit Profile
2. Clear all optional fields (keep name and email)
3. Click Save

**Expected Result**:
- Save succeeds
- Optional fields show as "Not set" in profile view

#### 4.5 Test Date Format Validation
**Action**: Test date of birth validation
1. Enter invalid date: `2025-13-45`
2. Click Save

**Expected Result**:
- Validation error
- Form doesn't submit

### API Testing (Optional)

```bash
# Valid profile update (all fields)
curl -X PUT http://localhost:3001/api/donors/me \
  -H "Authorization: Bearer YOUR_DONOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Donor",
    "email": "john@example.com",
    "phoneNumber": "+1-555-0123",
    "address": "123 Main Street",
    "city": "New York",
    "country": "USA",
    "postalCode": "10001",
    "dateOfBirth": "1990-01-15T00:00:00Z",
    "taxNumber": "12-3456789",
    "companyName": "ABC Corp"
  }'

# Invalid phone
curl -X PUT http://localhost:3001/api/donors/me \
  -H "Authorization: Bearer YOUR_DONOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "invalid"
  }'
# Expected: 400 Bad Request
```

---

## Phase 5: Frontend Profile Pages Testing

### Test Profile View Page (`/donor/profile`)

#### 5.1 Navigate to Profile Page
**Action**:
1. Login as donor
2. Click in header/navbar → "My Profile" or navigate to `/donor/profile`

**Expected Result**:
- Page loads with donor information
- Displays all profile fields in read-only format
- "Edit Profile" button visible in top-right
- "Back to Dashboard" link at bottom

#### 5.2 Verify All Sections Display
Check these sections are visible:
1. **Basic Information**: Name, Email
2. **Contact Information**: Phone, Address, City, Country, Postal Code
3. **Additional Information**: DOB, Tax Number, Company
4. **Account Status**: Active/Inactive badge, Member Since date

**Expected Result**:
- All sections display correctly
- Empty fields show "Not set" in italics
- Fields with values display the actual data
- Date fields formatted as readable dates

#### 5.3 Test Edit Profile Button
**Action**: Click "Edit Profile" button on profile view page

**Expected Result**:
- Redirects to `/donor/profile/edit`
- Edit form loads with current data pre-filled

### Test Edit Profile Page (`/donor/profile/edit`)

#### 5.4 Load Edit Page
**Action**: Navigate to `/donor/profile/edit` directly

**Expected Result**:
- Edit form loads
- All fields pre-filled with current values
- Form is fully functional

#### 5.5 Edit Single Field
**Action**:
1. Change phone number: `+1-555-9876`
2. Leave all other fields unchanged
3. Click "Save Changes"

**Expected Result**:
- "Profile updated successfully" message
- Redirects to profile view
- Phone number updated (other fields unchanged)

#### 5.6 Edit Multiple Fields
**Action**:
1. Change: Name, Address, City, Tax Number
2. Click "Save Changes"

**Expected Result**:
- All changed fields updated
- Success message displays
- Redirects to profile view

#### 5.7 Test Cancel Button
**Action**:
1. Make changes to form
2. Click "Cancel"

**Expected Result**:
- No changes saved
- Redirects back to `/donor/profile`

#### 5.8 Test Clear Optional Fields
**Action**:
1. Go to Edit Profile
2. Clear all optional fields (Phone, Address, City, Country, Postal, DOB, Tax, Company)
3. Click "Save Changes"

**Expected Result**:
- Fields are cleared in database
- Profile view shows "Not set" for cleared fields

#### 5.9 Test Required Field Validation
**Action**:
1. Go to Edit Profile
2. Clear Name field
3. Try to save

**Expected Result**:
- Browser validation prevents submission
- Error message: "Please fill in this field"

#### 5.10 Test Error Handling
**Action**:
1. Go to Edit Profile
2. Simulate network failure (open DevTools → Network → Offline)
3. Try to save

**Expected Result**:
- Error message displays
- Form remains on edit page
- Can retry after network restored

#### 5.11 Test Loading States
**Action**:
1. Go to Edit Profile
2. Check button text during save

**Expected Result**:
- Button shows "Saving..." while request in progress
- Button disabled during save
- Changes back to "Save Changes" when complete

### Navigation Testing

#### 5.12 Test Links Between Pages
**Actions**:
1. From Dashboard → Click "My Profile" link → Should go to `/donor/profile`
2. From Profile view → Click "Edit Profile" → Should go to `/donor/profile/edit`
3. From Profile edit → Click "Cancel" or "Back to Dashboard" → Should navigate away

**Expected Result**:
- All navigation links work correctly
- Pages load expected content

### Responsive Design Testing

#### 5.13 Test Mobile Responsiveness
**Device Tests** (use browser DevTools):
- iPhone SE (375px width)
- iPad (768px width)
- Desktop (1200px+ width)

**Expected Result**:
- All form fields visible and usable
- Layout adjusts for screen size
- Text readable on all sizes

---

## End-to-End Testing Checklist

### Complete User Journey Test

#### Scenario: New Donor Registration → Profile Setup → Email Notification

**Step 1**: Admin creates donor account
- [ ] Email confirmation sent
- [ ] Check email preview URL in logs
- [ ] Verify email contains welcome message

**Step 2**: Donor logs in and views profile
- [ ] Donor can login with provided credentials
- [ ] Profile page loads with basic info
- [ ] Optional fields show "Not set"

**Step 3**: Donor updates profile
- [ ] Navigate to edit profile
- [ ] Fill in all optional fields
- [ ] Save changes successfully
- [ ] Verify all fields updated in profile view

**Step 4**: Admin verifies role-based access
- [ ] Admin can view donor details
- [ ] Admin can edit donor engagement
- [ ] Payment recorded → confirmation email sent
- [ ] Check admin access logs

**Step 5**: Verify email integrations
- [ ] Profile update email sent (if configured)
- [ ] Payment confirmation email sent
- [ ] Check email preview URLs in logs

### Regression Testing

After completing integration tests, verify these critical functions still work:

- [ ] Donor login (basic password + Google!)
- [ ] Admin login
- [ ] Dashboard loading and stats
- [ ] Payment recording
- [ ] Request processing
- [ ] Activity log creation
- [ ] PDF downloads
- [ ] File uploads

---

## Troubleshooting Guide

### Email Not Sending
**Problem**: No email sent or preview URL not in logs
**Solutions**:
1. Check `.env`: `EMAIL_PROVIDER=test`
2. Check backend logs for errors
3. Verify nodemailer installed: `npm list nodemailer`
4. Restart backend server: `npm run dev`

### Authorization Returns 403
**Problem**: Getting "Insufficient permissions" when should have access
**Solutions**:
1. Check admin has correct role assigned in database
2. Verify role has capability assigned
3. Check middleware chain: `requireAdmin` → `requireCapability`
4. Verify capability name matches exactly

### Profile Edit Not Saving
**Problem**: Form submits but no changes appear
**Solutions**:
1. Check network request in DevTools (Network tab)
2. Check response status and error message
3. Verify backend `/api/donors/me` accepts PUT request
4. Check schema validation rules

### Frontend Pages Not Loading
**Problem**: 404 on `/donor/profile`
**Solutions**:
1. Verify files exist: `app/donor/profile/page.jsx` and `app/donor/profile/edit/page.jsx`
2. Check Next.js dev server running: `npm run dev` from project root
3. Clear Next.js cache: `rm -rf .next` then `npm run dev`
4. Check import statements in components

---

## Performance Testing (Optional)

### Response Time Benchmarks
- Profile load: < 500ms
- Profile update: < 1000ms
- Email send: < 2000ms (async)
- Authorization check: < 100ms

### Load Testing
- Simulate 100 concurrent profile updates
- Monitor database connection pool
- Check email queue performance

---

## Security Testing

### Authorization Security
- [ ] Cannot access `/api/admin/X` without valid token
- [ ] Cannot access admin endpoints with donor token
- [ ] Capabilities properly enforce permissions
- [ ] Cannot escalate own permissions

### Data Protection
- [ ] Sensitive data (passwords) not exposed in responses
- [ ] PII fields only accessible by user or admin
- [ ] Email addresses validated before update
- [ ] Phone numbers handle international formats

### Input Validation
- [ ] XSS prevention (test with `<script>` in fields)
- [ ] SQL injection prevention (test with SQL commands)
- [ ] Long input truncated per schema limits

---

## Sign-Off Checklist

All phases complete when:
- [ ] Phase 2: All email types sent and preview URLs accessible
- [ ] Phase 3: Authorization middleware active on all admin routes
- [ ] Phase 4: Profile fields validate correctly
- [ ] Phase 5: Both profile pages load and function correctly
- [ ] Phase 6: All integration tests pass
- [ ] All 50+ test scenarios verified
- [ ] No regressions in existing features
- [ ] Performance within acceptable limits
- [ ] Security validated

**Status**: Ready for UAT (User Acceptance Testing) and Production Deployment

---

**Document Created**: 2026-03-15
**Last Updated**: 2026-03-15
**Backend Status**: ✅ Running
**Frontend Status**: ✅ Ready
**Database Status**: ✅ Seeded with test data
