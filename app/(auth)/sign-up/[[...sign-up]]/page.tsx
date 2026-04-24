import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-enervia-50 p-6">
      <SignUp
        appearance={{ variables: { colorPrimary: "#1F4D3F", borderRadius: "0.5rem" } }}
      />
    </div>
  );
}
