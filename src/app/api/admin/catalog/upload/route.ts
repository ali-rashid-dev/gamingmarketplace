import { UTApi } from "uploadthing/server";
import { UserRole } from "@/generated/prisma/enums";
import { authorizeRequest, isAuthorizationResponse } from "@/lib/authorization";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, [
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  if (isAuthorizationResponse(authorization)) return authorization;

  if (!process.env.UPLOADTHING_TOKEN) {
    return Response.json(
      { error: "Image uploads are not configured. Set UPLOADTHING_TOKEN and try again." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Upload must use multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image file to upload" }, { status: 400 });
  }
  if (!allowedTypes.has(file.type)) {
    return Response.json(
      { error: "Use a JPEG, PNG, WebP, or AVIF image" },
      { status: 400 }
    );
  }
  if (file.size < 1 || file.size > MAX_IMAGE_SIZE) {
    return Response.json({ error: "Images must be smaller than 8 MB" }, { status: 400 });
  }

  const result = await new UTApi().uploadFiles(file);
  if (result.error) {
    return Response.json({ error: "Image upload failed. Please try again." }, { status: 502 });
  }

  return Response.json({ url: result.data.ufsUrl ?? result.data.url });
}
