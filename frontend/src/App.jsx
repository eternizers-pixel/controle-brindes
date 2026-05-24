import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';     // tela "Realizar Doação"
import Brindes from './pages/Brindes';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index                element={<Home />} />
        <Route path="doacao"        element={<Estoque />} />
        <Route path="estoque"       element={<Navigate to="/doacao" replace />} />
        <Route path="brindes"       element={<Brindes />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="movimentacoes" element={<Movimentacoes />} />
        <Route path="relatorios"    element={<Relatorios />} />
      </Route>
    </Routes>
  );
}
