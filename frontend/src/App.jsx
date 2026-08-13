import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';         // "Entregar Brinde"
import Brindes from './pages/Brindes';
import Patrocinios from './pages/Patrocinios';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';
import PesquisaXBZ from './pages/PesquisaXBZ';
import Parametros from './pages/Parametros';
import NiveisBrinde from './pages/NiveisBrinde';
import PassoAPasso from './pages/PassoAPasso';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index                element={<Home />} />
        <Route path="entregar"      element={<Estoque />} />
        <Route path="doacao"        element={<Navigate to="/entregar" replace />} />
        <Route path="estoque"       element={<Navigate to="/entregar" replace />} />
        <Route path="brindes"       element={<Brindes />} />
        <Route path="parametros"    element={<Parametros />} />
        <Route path="niveis"        element={<NiveisBrinde />} />
        <Route path="patrocinios"   element={<Patrocinios />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="movimentacoes" element={<Movimentacoes />} />
        <Route path="relatorios"    element={<Relatorios />} />
        <Route path="pesquisa-xbz"  element={<PesquisaXBZ />} />
      </Route>
      {/* Rota kiosque - fora do Layout (sem sidebar) */}
      <Route path="/passo-a-passo" element={<PassoAPasso />} />
    </Routes>
  );
}
