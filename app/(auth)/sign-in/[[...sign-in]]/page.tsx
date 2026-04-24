import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-enervia-50 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-enervia-500">Enervia Simulatie</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Log in met je Enervia Google-account
        </p>
      </div>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#1F4D3F",
            borderRadius: "0.5rem",
          },
        }}
      />
    </div>
  );
}
