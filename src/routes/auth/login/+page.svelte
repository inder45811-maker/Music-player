<script lang="ts">
  /**
   * Login page. Posts JSON to /api/auth/login. Social login buttons start the
   * Google/Apple OAuth flows handled by dedicated server routes.
   */
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';
  let busy = false;

  async function submit() {
    busy = true;
    error = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        await goto('/');
      } else {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Login failed.';
      }
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Log in · Resonate</title></svelte:head>

<div class="auth">
  <h1>Welcome back</h1>

  <div class="social">
    <a class="btn google" href="/api/auth/social/google/start">Continue with Google</a>
    <a class="btn apple" href="/api/auth/social/apple/start">Continue with Apple</a>
  </div>

  <div class="divider">or</div>

  <form on:submit|preventDefault={submit}>
    <label>Email<input type="email" bind:value={email} required autocomplete="email" /></label>
    <label
      >Password<input
        type="password"
        bind:value={password}
        required
        autocomplete="current-password"
      /></label
    >
    {#if error}<p class="error">{error}</p>{/if}
    <button disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
  </form>

  <p class="links">
    <a href="/auth/forgot">Forgot password?</a> · <a href="/auth/register">Create account</a>
  </p>
</div>

<style>
  .auth {
    max-width: 360px;
    margin: 3rem auto;
    padding: 1.5rem;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 12px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
  }
  input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  button {
    padding: 0.6rem;
    background: #1db954;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .social {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .btn {
    text-align: center;
    padding: 0.6rem;
    border-radius: 8px;
    text-decoration: none;
    border: 1px solid #ddd;
    color: #111;
  }
  .apple {
    background: #000;
    color: #fff;
  }
  .divider {
    text-align: center;
    opacity: 0.5;
    margin: 1rem 0;
  }
  .error {
    color: #c0264b;
    font-size: 0.85rem;
  }
  .links {
    margin-top: 1rem;
    font-size: 0.85rem;
    text-align: center;
  }
</style>
