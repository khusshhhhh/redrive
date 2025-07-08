# Supabase Integration Diagnosis Report

## **Problem Summary**
Data is submitting to MongoDB but not to Supabase despite having environment variables configured.

## **Issues Identified**

### 1. **❌ Environment Variables Not Set**
- **Required variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Current status**: No Supabase environment variables found in the system
- **Impact**: Supabase client cannot connect to your database

### 2. **❌ Wrong API Routes Being Used**
- **Current**: Frontend calls `/api/listings` (MongoDB only)
- **Required**: Frontend should call `/api/listings-dual` (MongoDB + Supabase)
- **Files affected**:
  - `app/components/modals/RentModal.tsx`
  - `app/edit-utility/[listingId]/page.tsx`
  - `app/properties/MyUtilitiesClient.tsx`
  - And others...

### 3. **❌ Dual Database Routes Not Accessible**
- **Issue**: You have `route-dual.ts` files but they're not mapped to accessible endpoints
- **Solution**: Need to create proper dual route endpoints

### 4. **⚠️ Supabase Schema May Not Be Applied**
- **File exists**: `supabase/schema.sql` 
- **Status**: Unknown if applied to actual Supabase database
- **Required**: Tables must exist in Supabase for data insertion to work

## **Code Analysis**

### **Working MongoDB Flow:**
```typescript
// route.ts - Only writes to MongoDB
const listing = await prisma.listing.create({ data });
```

### **Expected Dual Database Flow:**
```typescript
// route-dual.ts - Writes to both databases
const result = await DualDatabaseService.createListing(listingData);
// This handles both MongoDB and Supabase insertion
```

### **Supabase Configuration:**
```typescript
// app/libs/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// These are undefined in your environment
```

## **Step-by-Step Solution**

### **Step 1: Set Environment Variables**
1. Update `.env.local` with your actual Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Get these values from your Supabase dashboard:
   - Go to Settings → API
   - Copy Project URL, anon public key, and service_role secret key

### **Step 2: Apply Supabase Schema**
1. Go to your Supabase dashboard → SQL Editor
2. Copy and run the entire content of `supabase/schema.sql`
3. Verify tables are created successfully

### **Step 3: Switch to Dual Database Routes**
Run the provided script:
```bash
node switch-to-dual-database.js
```

Or manually update API calls in your frontend files from:
- `/api/listings` → `/api/listings-dual`
- `/api/reservations` → `/api/reservations-dual`

### **Step 4: Restart Development Server**
```bash
npm run dev
```

### **Step 5: Test the Integration**
1. Try creating a new listing
2. Check browser console for any Supabase errors
3. Verify data appears in both MongoDB and Supabase

## **Verification Steps**

### **Check Environment Variables:**
```bash
printenv | grep SUPABASE
```
Should show your three Supabase variables.

### **Check API Routes:**
- Verify `/api/listings-dual` endpoint exists and responds
- Check network tab when submitting forms

### **Check Supabase Connection:**
- Look for console errors related to Supabase
- Verify tables exist in Supabase dashboard

## **Common Error Messages and Solutions**

### **"Missing Supabase environment variables"**
- **Cause**: Environment variables not set or wrong names
- **Solution**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **"relation 'listings' does not exist"**
- **Cause**: Schema not applied to Supabase
- **Solution**: Run the SQL schema in Supabase dashboard

### **"Failed to create listing in Supabase"**
- **Cause**: Data format mismatch or constraint violations
- **Solution**: Check Supabase logs in dashboard for specific errors

## **Additional Notes**

1. **Error Handling**: The dual database service will continue working with MongoDB even if Supabase fails
2. **Data Sync**: Use the sync API (`/api/sync`) to migrate existing MongoDB data to Supabase
3. **Environment**: Make sure to set environment variables in production deployment as well

## **Next Steps After Fix**

1. **Monitor Supabase Logs**: Check for any ongoing insertion errors
2. **Sync Existing Data**: Run sync operations for existing MongoDB data
3. **Update Other Endpoints**: Apply similar dual database pattern to other API routes (reviews, messages, etc.)
4. **Enable Row Level Security**: Configure RLS policies in Supabase for production security