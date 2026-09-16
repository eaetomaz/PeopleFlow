import { isRouteErrorResponse, useRouteError } from 'react-router'
import { RefreshCw } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'

export function RouteError() {
  const error = useRouteError()
  const chunk = error instanceof Error && /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(error.message)
  const title = chunk ? 'Uma nova versão está disponível' : isRouteErrorResponse(error) ? `Erro ${error.status}` : 'Algo deu errado'
  const text = chunk ? 'Recarregue a página para usar a versão mais recente.' : 'A tela não conseguiu ser exibida. Recarregar costuma resolver.'
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <LogoMark size={52} />
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mt-2 text-fg-2">{text}</p>
        </div>
        <Button onClick={() => window.location.reload()} icon={<RefreshCw className="size-4" />}>
          Recarregar
        </Button>
      </div>
    </div>
  )
}
