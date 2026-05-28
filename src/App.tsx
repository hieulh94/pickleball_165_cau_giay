import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EventPage } from './pages/EventPage'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:id" element={<EventPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
