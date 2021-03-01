import React, { useState, useEffect } from 'react'

function App() {

  const [text, setText] = useState('Unloaded')

  useEffect(async () => {
    const res = await fetch('/data')
    setText(await res.text())
  })

  return (
    <div className="App">
      <h1>App</h1>
      <p>{text}</p>
    </div>
  )
}

export default App
