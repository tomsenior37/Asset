import React, { useEffect, useState } from 'react'
import { listClients, createClient } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material'
import { useAuth } from '../AuthContext.jsx'

export default function ClientsPage(){
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', code: '' })

  async function refresh(){
    const data = await listClients()
    setItems(data)
  }

  useEffect(() => { refresh() }, [])

  async function onSubmit(e){
    e.preventDefault()
    if(!form.name || !form.code) return
    await createClient(form)
    setForm({ name: '', code: '' })
    refresh()
  }

  return (
    <div>
      {isAdmin && (<div className="card">
        <h2>New Client (admin)</h2>
        <form onSubmit={onSubmit}>
          <div className="row">
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <TextField label="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
            <Button variant="contained" type="submit">Create</Button>
          </div>
        </form>
      </div>)}
      <div className="card">
        <h2>Clients</h2>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
          <TableBody>
            {items.map(x => (
              <TableRow key={x._id}>
                <TableCell>{x.name}</TableCell>
                <TableCell>{x.code}</TableCell>
                <TableCell>{new Date(x.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
