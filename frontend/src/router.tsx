import { createBrowserRouter } from 'react-router'
import { Gate, Page, RequireAuth } from '@/components/layout/Guards'
import { RouteError } from './RouteError'
import {
  AppLayout,
  LoginPage,
  PainelPage,
  RegistrarPontoPage,
  EspelhoPage,
  AprovacoesPage,
  ApuracaoPage,
  BancoHorasPage,
  BancoFuncionarioPage,
  EmpresasPage,
  EmpresaPage,
  JornadasPage,
  JornadaEditorPage,
  FuncionariosPage,
  FuncionarioPage,
  UsuariosPage,
  PerfilPage,
  NotFoundPage,
} from './pages'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <Page><LoginPage /></Page> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Gate><PainelPage /></Gate> },
          { path: 'ponto', element: <Gate funcionario><RegistrarPontoPage /></Gate> },
          { path: 'ponto/espelho', element: <Gate><EspelhoPage /></Gate> },
          { path: 'ponto/espelho/:funcionarioId', element: <Gate><EspelhoPage /></Gate> },
          { path: 'aprovacoes', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><AprovacoesPage /></Gate> },
          { path: 'apuracao', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><ApuracaoPage /></Gate> },
          { path: 'banco-horas', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><BancoHorasPage /></Gate> },
          { path: 'banco-horas/:funcionarioId', element: <Gate><BancoFuncionarioPage /></Gate> },
          { path: 'empresas', element: <Gate perfis={['Admin', 'RH']}><EmpresasPage /></Gate> },
          { path: 'empresas/:id', element: <Gate perfis={['Admin', 'RH']}><EmpresaPage /></Gate> },
          { path: 'jornadas', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><JornadasPage /></Gate> },
          { path: 'jornadas/nova', element: <Gate perfis={['Admin', 'RH']}><JornadaEditorPage /></Gate> },
          { path: 'jornadas/:id', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><JornadaEditorPage /></Gate> },
          { path: 'funcionarios', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><FuncionariosPage /></Gate> },
          { path: 'funcionarios/novo', element: <Gate perfis={['Admin', 'RH']}><FuncionarioPage /></Gate> },
          { path: 'funcionarios/:id', element: <Gate perfis={['Admin', 'RH', 'Gestor']}><FuncionarioPage /></Gate> },
          { path: 'usuarios', element: <Gate perfis={['Admin']}><UsuariosPage /></Gate> },
          { path: 'perfil', element: <Gate><PerfilPage /></Gate> },
          { path: '*', element: <Page><NotFoundPage /></Page> },
        ],
      },
    ],
  },
])
