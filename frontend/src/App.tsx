import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-surface font-sans flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4 font-mono">
          Skills Platform
        </h1>
        <p className="text-text-secondary mb-6">
          Frontend scaffold ready. Edit <code className="font-mono bg-border px-2 py-1 rounded text-sm">src/App.tsx</code> to get started.
        </p>
        <button
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </div>
    </div>
  )
}

export default App
