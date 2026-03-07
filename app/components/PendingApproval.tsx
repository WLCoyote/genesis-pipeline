"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  message: string;
}

export default function PendingApproval({ message }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-sm">
        <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Pending Approval
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>
        <button
          onClick={handleSignOut}
          className="text-sm text-ds-blue hover:underline cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
