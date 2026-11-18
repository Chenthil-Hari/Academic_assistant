import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, JWTPayload } from "./jwt";
import connectToDatabase from "../db/connection";
import { User, IUser } from "../db/models/User";

export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: JWTPayload | null; errorResponse?: NextResponse }> {
  const user = getUserFromRequest(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export async function getFullUserFromRequest(
  req: NextRequest
): Promise<{ userDoc: IUser | null; errorResponse?: NextResponse }> {
  const { user, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !user) {
    return { userDoc: null, errorResponse };
  }

  await connectToDatabase();
  const userDoc = await User.findById(user.userId);
  if (!userDoc) {
    return {
      userDoc: null,
      errorResponse: NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      ),
    };
  }

  return { userDoc };
}
