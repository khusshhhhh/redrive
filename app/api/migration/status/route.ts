import { NextResponse } from "next/server";
import { MigrationUtils } from "@/app/libs/migration-helper";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function GET() {
  try {
    // Get migration status
    const status = await MigrationUtils.getMigrationStatus();
    
    return NextResponse.json({
      message: "Migration status retrieved successfully",
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Migration status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get migration status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, tableName, batchSize = 100 } = body;

    switch (action) {
      case 'test-connections':
        const testResult = await MigrationUtils.testConnections();
        return NextResponse.json({
          message: "Connection test completed",
          success: testResult
        });

      case 'batch-sync':
        if (!tableName) {
          return NextResponse.json(
            { error: "tableName is required for batch-sync" },
            { status: 400 }
          );
        }

        const syncResult = await MigrationUtils.batchSync(tableName, batchSize);
        return NextResponse.json({
          message: `Batch sync completed for ${tableName}`,
          ...syncResult
        });

      case 'status':
        const status = await MigrationUtils.getMigrationStatus();
        return NextResponse.json({
          message: "Migration status retrieved",
          status
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: test-connections, batch-sync, status" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Migration operation error:", error);
    return NextResponse.json(
      {
        error: "Migration operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}