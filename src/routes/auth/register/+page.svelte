<script lang="ts">
  /** Registration page. Posts JSON to /api/auth/register. */
  import { goto } from '$app/navigation';

  let email = '';
  let username = '';
  let displayName = '';
  let password = '';
  let error = '';
  let busy = false;

  async function submit() {
    busy = true;
    error = '';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, username, displayName, password })
      });
      if (res.ok) {
        await goto('/');
      } else {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Registration failed.';
      }
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Sign up · Resonate</title></svelte:head>

<div class="auth">
  <h1>Create your account</h1>
  <form on:submit|preventDefault={submit}>
    <label>Email<input type="email" bind:value={email} required autocomplete="email" /></label>
    <label>Username<input bind:value={username} required minlength="3" maxlength="30" /></label>
    <label>Display name<input bind:value={displayName} maxlength="60" /></label>
    <label
      >Password<input
        type="password"
        bind:value={password}
        required
        autocomplete="new-password"
      /></label
    >
    {#if error}<p class="error">{error}</p>{/if}
    <button disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
  </form>
  <p class="links">Already have an account? <a href="/auth/login">Log in</a></p>
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
