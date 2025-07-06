import { NextRequest, NextResponse } from "next/server";
import { DualDatabaseService } from "@/app/libs/dual-database";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin (you might want to add admin check)
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tableName, limit = 100 } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: "tableName is required" },
        { status: 400 }
      );
    }

    const supportedTables = ['users', 'listings', 'reservations', 'reviews', 'chats', 'messages'];
    if (!supportedTables.includes(tableName)) {
      return NextResponse.json(
        { error: `Unsupported table: ${tableName}. Supported tables: ${supportedTables.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting sync for table: ${tableName} with limit: ${limit}`);
    
    const result = await DualDatabaseService.syncMongoToSupabase(tableName, limit);
    
    console.log(`✅ Sync completed for ${tableName}:`, result);

    return NextResponse.json({
      message: `Synchronization completed for ${tableName}`,
      synced: result.synced,
      errors: result.errors,
      total: result.synced + result.errors
    });

  } catch (error) {
    console.error("❌ Sync error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      message: "Sync API is available",
      supportedTables: ['users', 'listings', 'reservations', 'reviews', 'chats', 'messages'],
      usage: {
        endpoint: "/api/sync",
        method: "POST",
        body: {
          tableName: "string (required)",
          limit: "number (optional, default: 100)"
        }
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get sync info" },
      { status: 500 }
    );
  }
}