import React, { useState } from 'react'
import { login } from '../services/auth'
import { TextField, Button } from '@mui/material'

export default function LoginPage(){
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [err, setErr] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setErr('')
    try{
      await login(email, password)
      window.location.href = '/'
    }catch(e){
      setErr(e.response?.data?.error || e.message)
    }
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div className="row">
          <TextField label="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <TextField label="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <Button variant="contained" type="submit">Login</Button>
        </div>
      </form>
      {err && <p style={{color:'crimson'}}>{err}</p>}
    </div>
  )
}
