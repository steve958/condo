import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './lib/firebase'

// Shared currency formatter (Serbian dinar)
const RSD = new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD' })
const formatRSD = (n: number) => RSD.format(n)

// EUR conversion (1 EUR = 117.17 RSD)
const EUR_RATE = 117.17
const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const formatEUR = (n: number) => EUR.format(n)

export type Todo = {
  id: string
  name: string
  room: string
  model?: string
  price?: number
  imgUrl?: string
  link?: string
  completed: boolean
}

type Filter = 'all' | 'active' | 'completed'
const filterLabel = (f: Filter) => ({ all: 'Sve', active: 'Planirano', completed: 'Kupljeno' }[f])

const ROOMS = [
  'Kuhinja', 'Dnevna soba', 'Master spavaća soba', 'Strahinjina soba', 
  'Radna soba', 'Kupatilo 1', 'Kupatilo 2', 'Hodnik', 'Terasa', 'Ostava'
]

const ROOM_COLORS: Record<string, string> = {
  'Kuhinja': '#ef4444',
  'Dnevna soba': '#f59e0b',
  'Master spavaća soba': '#8b5cf6',
  'Strahinjina soba': '#ec4899',
  'Radna soba': '#10b981',
  'Kupatilo 1': '#06b6d4',
  'Kupatilo 2': '#0ea5e9',
  'Hodnik': '#84cc16',
  'Terasa': '#22c55e',
  'Ostava': '#a3a3a3',
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])

  // New item form state
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('') // keep as string for input
  const [imgUrl, setImgUrl] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [roomFilter, setRoomFilter] = useState<string>('all')

  // Image preview lightbox
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)

  // Live Firestore subscription
  useEffect(() => {
    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const items: Todo[] = snap.docs.map(d => {
        const data = d.data() as {
          name?: string
          room?: string
          model?: string
          price?: number
          imgUrl?: string
          link?: string
          completed?: boolean
        }
        return {
          id: d.id,
          name: data.name ?? '',
          room: data.room ?? '',
          model: data.model ?? undefined,
          price: typeof data.price === 'number' ? data.price : undefined,
          imgUrl: data.imgUrl ?? undefined,
          link: data.link ?? undefined,
          completed: !!data.completed,
        }
      })
      setTodos(items)
    })
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    let result = todos
    
    // Filter by completion status
    switch (filter) {
      case 'active':
        result = result.filter(t => !t.completed)
        break
      case 'completed':
        result = result.filter(t => t.completed)
        break
      default:
        break
    }
    
    // Filter by room
    if (roomFilter !== 'all') {
      result = result.filter(t => t.room === roomFilter)
    }
    
    return result
  }, [todos, filter, roomFilter])

  const total = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = total - activeCount

  const totalValue = useMemo(
    () => todos.reduce((sum, t) => sum + (typeof t.price === 'number' ? t.price : 0), 0),
    [todos],
  )
  const totalEUR = useMemo(() => totalValue / EUR_RATE, [totalValue])

  const isValidUrl = (u: string) => {
    try {
      new URL(u)
      return true
    } catch {
      return false
    }
  }

  async function handleSubmit() {
    const n = name.trim()
    const rm = room.trim()
    const m = model.trim()
    const priceText = price.trim()
    const p = priceText ? Number.parseFloat(priceText) : NaN
    const img = imgUrl.trim()
    const lnk = link.trim()

    if (!n) {
      setError('Naziv je obavezan.')
      return
    }
    if (!rm) {
      setError('Izaberite prostoriju.')
      return
    }
    if (priceText && Number.isNaN(p)) {
      setError('Cena mora biti broj (ako je navedena).')
      return
    }
    if ((img && !isValidUrl(img)) || (lnk && !isValidUrl(lnk))) {
      setError('Unesite ispravne URL-ove za sliku i link (ako su navedeni).')
      return
    }

    setError(null)
    try {
      if (editId) {
        const payloadUpdate: Record<string, unknown> = {
          name: n,
          room: rm,
        }
        payloadUpdate.model = m ? m : deleteField()
        payloadUpdate.price = priceText ? p : deleteField()
        payloadUpdate.imgUrl = img ? img : deleteField()
        payloadUpdate.link = lnk ? lnk : deleteField()
        await updateDoc(doc(db, 'todos', editId), payloadUpdate)
      } else {
        const payload: {
          name: string
          room: string
          completed: boolean
          createdAt: ReturnType<typeof serverTimestamp>
          model?: string
          price?: number
          imgUrl?: string
          link?: string
        } = {
          name: n,
          room: rm,
          completed: false,
          createdAt: serverTimestamp(),
        }
        if (m) payload.model = m
        if (!Number.isNaN(p)) payload.price = p
        if (img) payload.imgUrl = img
        if (lnk) payload.link = lnk
        await addDoc(collection(db, 'todos'), payload)
      }

      closeModal()
    } catch (err) {
      console.warn('submit failed', err)
    }
  }

  function toggle(id: string) {
    const t = todos.find(t => t.id === id)
    if (!t) return
    updateDoc(doc(db, 'todos', id), { completed: !t.completed }).catch(err =>
      console.warn('toggle failed', err),
    )
  }

  function remove(id: string) {
    deleteDoc(doc(db, 'todos', id)).catch(err => console.warn('remove failed', err))
  }

  function openAddModal() {
    setEditId(null)
    setName('')
    setRoom('')
    setModel('')
    setPrice('')
    setImgUrl('')
    setLink('')
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(t: Todo) {
    setEditId(t.id)
    setName(t.name)
    setRoom(t.room)
    setModel(t.model ?? '')
    setPrice(typeof t.price === 'number' ? String(t.price) : '')
    setImgUrl(t.imgUrl ?? '')
    setLink(t.link ?? '')
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function openPreview(t: Todo) {
    if (t.imgUrl) setPreview({ src: t.imgUrl, alt: t.name })
  }
  function closePreview() {
    setPreview(null)
  }

  return (
    <div className="page">
      <div className="split">
        <aside className="image-col">
          <div className="image-row">
            <img src="/img1.png" alt="Dekorativna slika 1" loading="eager" />
            <img src="/img2.png" alt="Dekorativna slika 2" loading="eager" />
          </div>
        </aside>

        <main className="todo-col">
          <div className="toolbar">
            <button type="button" onClick={openAddModal}>Dodaj stavku</button>
          </div>

          {/* Modal */}
          {modalOpen && (
            <div className="modal-backdrop" onClick={closeModal}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <strong>{editId ? 'Uredi stavku' : 'Dodaj stavku'}</strong>
                  <button type="button" className="btn-clear" onClick={closeModal}>Zatvori</button>
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSubmit()
                  }}
                  className="form-grid"
                >
                  <div className="field">
                    <label className="label" htmlFor="name">Naziv (obavezno)</label>
                    <input id="name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="npr. Dyson" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="room">Prostorija (obavezno)</label>
                    <select id="room" className="input" value={room} onChange={e => setRoom(e.target.value)}>
                      <option value="">Izaberite prostoriju...</option>
                      {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="model">Model</label>
                    <input id="model" className="input" value={model} onChange={e => setModel(e.target.value)} placeholder="npr. V15 Detect" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="price">Cena</label>
                    <input id="price" className="input" value={price} onChange={e => setPrice(e.target.value)} placeholder="npr. 299.99" inputMode="decimal" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="img">URL slike</label>
                    <input id="img" className="input" value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label className="label" htmlFor="link">Link</label>
                    <input id="link" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                    <button type="submit">{editId ? 'Sačuvaj izmene' : 'Dodaj'}</button>
                  </div>
                  {error && (
                    <div className="helper error" style={{ gridColumn: '1 / -1' }}>{error}</div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Image preview lightbox */}
          {preview && (
            <div className="lightbox-backdrop" onClick={closePreview}>
              <div className="lightbox" onClick={e => e.stopPropagation()}>
                <img className="lightbox-image" src={preview.src} alt={preview.alt} />
                <button type="button" className="btn-clear lightbox-close" onClick={closePreview}>Zatvori</button>
              </div>
            </div>
          )}

          <div className="filters">
            <div className="filter-section">
              <label className="filter-label">Status:</label>
              <div className="segmented">
                {(['all', 'active', 'completed'] as Filter[]).map(f => (
                  <button
                    key={f}
                    className={`pill ${filter === f ? 'pill-active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {filterLabel(f)}
                    <span className="badge">
                      {f === 'all' ? total : f === 'active' ? activeCount : completedCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="filter-section">
              <label className="filter-label">Prostorija:</label>
              <select 
                className="input room-filter" 
                value={roomFilter} 
                onChange={e => setRoomFilter(e.target.value)}
              >
                <option value="all">Sve prostorije</option>
                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <ul className="todo-list" style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
            {filtered.map(t => (
              <TodoItem key={t.id} todo={t} onToggle={toggle} onRemove={remove} onEdit={() => openEditModal(t)} onPreview={() => openPreview(t)} />)
            )}
          </ul>

          {todos.length === 0 && (
            <p style={{ opacity: 0.7 }}>Nema stavki. Dodajte prvu da započnete.</p>
          )}

          {todos.length > 0 && (
            <div className="summary">
              <div className="summary-row">
                <span>Ukupno stavki</span>
                <strong>{total}</strong>
              </div>
              <div className="summary-row">
                <span>Ukupna cena</span>
                <strong>{formatRSD(totalValue)}</strong>
              </div>
              <div className="summary-row">
                <span>Ukupna cena (EUR)</span>
                <strong>{formatEUR(totalEUR)}</strong>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function TodoItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
  onPreview,
}: {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onEdit: () => void
  onPreview: () => void
}) {
  const roomColor = ROOM_COLORS[todo.room] ?? '#94a3b8'
  return (
    <li className="todo-card">
      <span className="room-accent" style={{ background: roomColor }} />
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} />
      <img
        className="todo-media clickable"
        src={todo.imgUrl}
        alt={todo.name}
        onClick={onPreview}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }}
      />
      <div className="todo-meta">
        <div className="todo-title">
          <span className="room-marker" style={{ background: roomColor }} />
          <h3>{todo.name}</h3>
        </div>
        <div className="todo-sub">
          <span>Prostorija: {todo.room}</span>
          {todo.model ? <span>Model: {todo.model}</span> : null}
          {typeof todo.price === 'number' ? <span>Cena: {formatRSD(todo.price)}</span> : null}
        </div>
        {todo.link ? (
          <a className="btn-link" href={todo.link} target="_blank" rel="noreferrer noopener">Otvori</a>
        ) : null}
      </div>
      <div className="todo-actions">
        <button onClick={onEdit}>Uredi</button>
        <button onClick={() => onRemove(todo.id)} aria-label={`Obriši ${todo.name}`}>
          Obriši
        </button>
      </div>
    </li>
  )
}

export default App
