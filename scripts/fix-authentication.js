#!/usr/bin/env node

/**
 * Authentication Fix Helper Script
 * Updates API endpoints to use enhanced authentication for TestSprite compatibility
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");

// Files that need authentication updates
const filesToUpdate = [
  "app/api/listings/route.ts",
  "app/api/listings/[listingId]/route.ts",
  "app/api/reservations/route.ts",
  "app/api/reservations/[reservationId]/route.ts",
  "app/api/profile/route.ts",
];

// Check if enhanced auth middleware exists
const authMiddlewarePath = "app/libs/auth-middleware.ts";
if (!fs.existsSync(authMiddlewarePath)) {
  console.error(
    "❌ Enhanced authentication middleware not found at:",
    authMiddlewarePath
  );
  console.log(
    "Please ensure app/libs/auth-middleware.ts exists before running this script."
  );
  process.exit(1);
}

console.log("🔧 Starting authentication fixes...\n");

filesToUpdate.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Check if already updated
    if (content.includes("getCurrentUserEnhanced")) {
      console.log(`✅ Already updated: ${filePath}`);
      return;
    }

    // Replace import statement
    const oldImport =
      'import getCurrentUser from "@/app/actions/getCurrentUser";';
    const newImport =
      'import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";\nimport type { NextRequest } from "next/server";';

    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
    }

    // Replace function calls in route handlers
    const functionReplacements = [
      {
        // Basic getCurrentUser() calls
        from: /const currentUser = await getCurrentUser\(\);/g,
        to: "const currentUser = await getCurrentUserEnhanced(request);",
      },
      {
        // Function signatures that need request parameter
        from: /export async function (POST|PUT|DELETE)\(([^)]*)\) {/g,
        to: (match, method, params) => {
          if (params.includes("request") && params.includes("NextRequest")) {
            return match; // Already has proper signature
          }
          if (params.includes("request")) {
            return `export async function ${method}(request: NextRequest${
              params.includes(",")
                ? ", " + params.split(", ").slice(1).join(", ")
                : ""
            }) {`;
          }
          return `export async function ${method}(request: NextRequest${
            params ? ", " + params : ""
          }) {`;
        },
      },
    ];

    functionReplacements.forEach((replacement) => {
      if (typeof replacement.to === "function") {
        content = content.replace(replacement.from, replacement.to);
      } else {
        content = content.replace(replacement.from, replacement.to);
      }
    });

    // Write updated content
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log("\n🎉 Authentication fixes completed!");
console.log("\n📋 Next steps:");
console.log("1. Review the updated files manually");
console.log("2. Create .env.local with required environment variables");
console.log("3. Restart your development server: npm run dev");
console.log("4. Test the new /api/auth/login endpoint");
console.log("5. Re-run TestSprite tests");

console.log("\n🔧 Test the login endpoint:");
console.log("curl -X POST http://localhost:3000/api/auth/login \\");
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"test@example.com","password":"your-password"}\'');

console.log(
  "\n📚 For full implementation guide, see: testsprite_tests/comprehensive-evaluation-report.md"
);
