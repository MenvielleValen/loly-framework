import React from "react";
import { Link } from "@lolyjs/core/components";

type User = {
  id: string;
  name: string;
};

type ProfileProps = {
  user?: User | null;
  profileData?: {
    email: string;
    memberSince: string;
  };
};

export default function ProfilePage({ user, profileData }: ProfileProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Profile</h1>

      <div className="space-y-6">
        {user && (
          <div className="p-4 border border-border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-2">
              <p>
                <strong>Name:</strong> {user.name}
              </p>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              {profileData && (
                <>
                  <p>
                    <strong>Email:</strong> {profileData.email}
                  </p>
                  <p>
                    <strong>Member Since:</strong> {profileData.memberSince}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Navigation Test</h2>
          <p className="text-muted-foreground mb-4">
            This page was reached via client-side navigation (SPA). The global middleware executed
            and established ctx.locals.user correctly.
          </p>
          <Link
            href="/examples/auth/dashboard"
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Back to Dashboard (SPA)
          </Link>
        </div>
      </div>
    </div>
  );
}

