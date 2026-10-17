import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { requestService } from "@/server/services/request.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const overdueOnly = searchParams.get("overdue") === "true";

    const requests = await requestService.listRequests({
      status,
      priority,
      search,
      overdue_only: overdueOnly,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const priority = body?.priority;
    const status = body?.status;
    const customerId = body?.customer_id;
    const orderId = body?.order_id;
    const dueDate = body?.due_date;
    const assignedTo = body?.assigned_to;

    if (!title) {
      return NextResponse.json({ error: "Title is required for requests." }, { status: 400 });
    }

    const created = await requestService.createRequest(
      {
        title,
        description,
        priority,
        status,
        customer_id: customerId,
        order_id: orderId,
        due_date: dueDate,
        assigned_to: assignedTo,
      },
      user.id
    );

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
