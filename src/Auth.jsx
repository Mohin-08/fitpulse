import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // Email sign-in link
  const signInWithEmail = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setMessage(error.message)
    else setMessage('Check your email for sign-in link')
  }

  // OAuth sign-in with GitHub
  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
    if (error) setMessage(error.message)
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h1>Sign In / Sign Up</h1>
      {message && <p>{message}</p>}
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      <button onClick={signInWithEmail} style={{ width: '100%', padding: 10, marginBottom: 12 }}>
        Sign in with Email
      </button>
      <hr />
      <button onClick={signInWithGitHub} style={{ width: '100%', padding: 10 }}>
        Sign In with GitHub
      </button>
    </div>
  )
}
