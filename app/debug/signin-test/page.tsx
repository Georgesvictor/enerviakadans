import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Clerk SignIn test</h1>
      <p style={{ marginBottom: 20, fontSize: 12, color: "#666" }}>
        Als hieronder geen knop/form verschijnt → Clerk-configuratie in je
        dashboard mist authentication-methoden.
      </p>
      <SignIn />
    </div>
  );
}
