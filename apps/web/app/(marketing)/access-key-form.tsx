'use client';

import { useState, type FormEvent } from 'react';

export function AccessKeyForm() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-access-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { explanation?: string };
        setError(body.explanation ?? 'Sign-in failed.');
        return;
      }
      window.location.assign('/home');
    } catch {
      setError('Sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <label className="field">
        <span>Enter your access PIN</span>
        <input
          className="input"
          name="pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="••••••"
          required
        />
        <span className="hint">
          This was generated when the app was set up. Google sign-in is coming later.
        </span>
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Continue'}
      </button>
      {error === null ? null : <p className="alert">{error}</p>}
    </form>
  );
}
