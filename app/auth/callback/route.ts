import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Auto-provision: if user authenticated but not in users table,
      // check for a matching invite and create their user row
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const serviceClient = createServiceClient();
        const { data: existingUser } = await serviceClient
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingUser) {
          const userEmail = user.email?.toLowerCase();
          if (userEmail) {
            const { data: invite } = await serviceClient
              .from("user_invites")
              .select("*")
              .eq("email", userEmail)
              .single();

            if (invite) {
              // Create the user row from the invite
              await serviceClient.from("users").insert({
                id: user.id,
                email: userEmail,
                name: invite.name,
                phone: invite.phone,
                role: invite.role,
                is_active: true,
              });

              // Remove the used invite
              await serviceClient
                .from("user_invites")
                .delete()
                .eq("id", invite.id);
            }
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`http://localhost:3000${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(
          `${request.nextUrl.origin}${next}`
        );
      }
    }
  }

  // If code exchange fails, redirect to login with error
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("error", "auth_failed");
  return NextResponse.redirect(loginUrl);
}
