import { AccessKeyForm } from './access-key-form';

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <p className="hint mb-2 tracking-wide uppercase">Foundry</p>
      <h1 className="page-title">Your AI co-founder</h1>
      <p className="lede">
        Turn a rough idea into a validated business plan — talk to real customers, prove people will
        pay, and build a pack the AI keeps up to date with you, one guided step at a time.
      </p>
      <div className="mt-8">
        <AccessKeyForm />
      </div>
    </main>
  );
}
