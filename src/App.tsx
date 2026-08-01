import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type Note = { id: string; title: string; body: string; updated_at: string }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [message, setMessage] = useState('')
  const online = navigator.onLine

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session || !online) return
    void supabase.from('personal_notes').select('id,title,body,updated_at').order('updated_at', { ascending: false })
      .then(({ data, error }) => error ? setMessage(error.message) : setNotes(data ?? []))
  }, [session, online])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) })
    setMessage(error?.message ?? '')
  }

  return <main>
    <header><span className="eyebrow">ATLANTA · 2026</span><h1>Your MagicCon field guide.</h1><p>One quiet place for the plans that matter when convention Wi-Fi does not cooperate.</p></header>
    <section className="status"><span className={online ? 'dot online' : 'dot'} />{online ? 'Online' : 'Offline · saved itinerary remains readable'}</section>
    {!supabase && <section className="card"><h2>Local setup needed</h2><p>Add the expected Supabase URL and publishable key to <code>.env.local</code>.</p></section>}
    {supabase && !session && <form className="card" onSubmit={signIn}><h2>Private access</h2><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={!online}>Sign in</button></form>}
    {session && <><section className="card"><div className="row"><div><span className="eyebrow">PERSONAL CONTINUITY</span><h2>Notes</h2></div><button className="quiet" onClick={() => void supabase?.auth.signOut()}>Sign out</button></div>{notes.length ? notes.map(note => <article key={note.id}><h3>{note.title}</h3><p>{note.body}</p><small>Updated {new Date(note.updated_at).toLocaleString()}</small></article>) : <p>No personal notes yet. This tranche proves the secure boundary before expanding the model.</p>}</section><section className="card muted"><h2>Offline contract</h2><p>The installable app shell remains readable offline. Critical itinerary caching will contain only explicitly approved fields once that model exists. Creating or changing canonical data always waits for a verified network response.</p></section></>}
    {message && <p role="alert" className="alert">{message}</p>}
  </main>
}
