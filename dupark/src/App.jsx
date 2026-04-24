import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './component/header'
import Footer from './component/footer'
import Home from './pages/Home'
import Category from './pages/Category'
import ProjectDetail from './pages/ProjectDetail'


function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:category" element={<Category />} />
        <Route path="/:category/:id" element={<ProjectDetail />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}


export default App