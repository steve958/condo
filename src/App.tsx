import { useEffect, useMemo, useState } from 'react'
import './App.css'

export type Todo = {
  id: string
  title: string
  completed: boolean
}

type Filter = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'condo.todos'

function useLocalStorageTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Todo[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  return { todos, setTodos }
}

function App() {
  const { todos, setTodos } = useLocalStorageTodos()
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed)
      case 'completed':
        return todos.filter(t => t.completed)
      default:
        return todos
    }
  }, [todos, filter])

  function addTodo(title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    setTodos(prev => [{ id: crypto.randomUUID(), title: trimmed, completed: false }, ...prev])
    setInput('')
  }

  function toggle(id: string) {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  function remove(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  function rename(id: string, title: string) {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, title } : t)))
  }

  function clearCompleted() {
    setTodos(prev => prev.filter(t => !t.completed))
  }

  async function loadSample() {
    try {
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { todos: Todo[] }
      // Merge unique by id
      setTodos(prev => {
        const seen = new Set(prev.map(t => t.id))
        const merged = [...prev]
        for (const t of data.todos) if (!seen.has(t.id)) merged.push(t)
        return merged
      })
    } catch (e) {
      console.warn('Failed to load sample todos:', e)
    }
  }

  return (
    <div className="page">
      <div className="split">
        <aside className="image-col">
          <div className="image-row">
            <img src="/img1.png" alt="Decorative image 1" loading="eager" />
            <img src="/img2.png" alt="Decorative image 2" loading="eager" />
          </div>
        </aside>

        <main className="todo-col">
          <form
            onSubmit={e => {
              e.preventDefault()
              addTodo(input)
            }}
            style={{ display: 'flex', gap: 8, marginBottom: 16 }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Add a task..."
              style={{ flex: 1, padding: '10px 12px' }}
            />
            <button type="submit">Add</button>
            <button className="btn-clear" type="button" onClick={loadSample} title="Load serverless sample">
              Load sample
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['all', 'active', 'completed'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ fontWeight: filter === f ? 700 : 400 }}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="btn-clear" onClick={clearCompleted}>Clear completed</button>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
            {filtered.map(t => (
              <TodoItem key={t.id} todo={t} onToggle={toggle} onRemove={remove} onRename={rename} />)
            )}
          </ul>

          {todos.length === 0 && (
            <p style={{ opacity: 0.7 }}>No tasks yet. Add one to get started.</p>
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
  onRename,
}: {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onRename: (id: string, title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 10,
      }}
    >
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} />
      {editing ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            onRename(todo.id, title.trim() || todo.title)
            setEditing(false)
          }}
          style={{ flex: 1 }}
        >
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditing(false)}
            style={{ width: '100%', padding: '6px 8px' }}
          />
        </form>
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          style={{ flex: 1, textDecoration: todo.completed ? 'line-through' : 'none' }}
        >
          {todo.title}
        </span>
      )}
      <button onClick={() => setEditing(v => !v)}>{editing ? 'Save' : 'Edit'}</button>
      <button onClick={() => onRemove(todo.id)} aria-label={`Delete ${todo.title}`}>
        Delete
      </button>
    </li>
  )
}

export default App
