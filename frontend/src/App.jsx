import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import Brindes from './pages/Brindes';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index                  element={<Dashboard />} />
        <Route path="estoque"         element={<Estoque />} />
        <Route path="brindes"         element={<Brindes />} />
        <Route path="movimentacoes"   element={<Movimentacoes />} />
        <Route path="relatorios"      element={<Relatorios />} />
      </Route>
    </Routes>
  );
}
