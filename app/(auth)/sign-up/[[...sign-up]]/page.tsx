import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-enervia-50 to-white p-6">
      <Link
        href="/"
        className="text-2xl font-bold text-enervia-700 tracking-wider mb-8"
      >
        KADANS
      </Link>
      <SignUp
        appearance={{
          variables: { colorPrimary: "#1F4D3F", borderRadius: "0.5rem" },
        }}
      />
      <p className="text-xs text-muted-foreground mt-6">
        Al een account?{" "}
        <Link href="/sign-in" className="text-enervia-600 hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  );
}
