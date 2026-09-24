# Segurança e perfis

## Login

- `Usuario` com hash PBKDF2 (`PasswordHasher<T>` do ASP.NET Core, formato v3), sem Identity completo.
- 5 tentativas erradas bloqueiam por 5 minutos. Mensagem única "Usuário ou senha incorretos" (não revela se o login existe).
- Trocar a senha exige a atual, 8+ caracteres com letra e número, gira o `CarimboSeguranca` (derruba outras sessões) e desliga `SenhaPadrao`.
- Admin redefine senha de outro usuário (volta `SenhaPadrao = true`).

## Cookie

`peopleflow.auth`: HttpOnly, SameSite=Strict, 10h deslizante, sem `Secure` (HTTP puro em 127.0.0.1). Sem redirecionamento: 401/403 em ProblemDetails. A cada requisição o carimbo e o `Ativo` são conferidos no banco (`OnValidatePrincipal`), então desativar ou mudar perfil derruba a sessão na hora. Chaves do DataProtection em `chaves\` protegidas com DPAPI.

CSRF: SameSite=Strict + `OriginGuardMiddleware` (origem fora da lista ou `Sec-Fetch-Site: cross-site` → 403; corpo não-JSON → 415) + escuta só em loopback. `AllowedHosts` = localhost, 127.0.0.1, [::1].

## Contas de demonstração

`admin`, `rh`, `gestor`, `funcionario`, com senhas em `ContasDemo` (`backend\PeopleFlow.Infrastructure\Persistence\Seed\DemoSeeder.cs`). `GET /api/auth/demo` só devolve a conta enquanto ela ainda tem `SenhaPadrao` **e** a senha de demonstração confere com o hash; trocou a senha, o atalho some da tela de login.

## Perfis e políticas

| Política | Perfis |
|---|---|
| Administrar | Admin |
| GerirCadastros | Admin, RH |
| AprovarAjustes | Admin, RH, Gestor |
| VerEquipe | Admin, RH, Gestor |

Escopo de dados (`AcessoService`): Admin e RH veem todas as empresas e funcionários; Gestor vê quem tem `GestorId` = ele, mais ele mesmo; Funcionário só a si. Recurso fora do escopo → 404.

Regras de aprovação: quem pediu não aprova; gestor não aprova o próprio ponto; ajuste já decidido não muda. A decisão grava quem, quando e o motivo na própria marcação.

## Auditoria

`AuditoriaInterceptor` (EF `SaveChangesInterceptor`) grava `EventoAuditoria` para toda entidade `IAuditavel` criada, alterada ou excluída numa requisição HTTP: usuário, ação, CorrelationId e antes/depois por campo. `SenhaHash`, carimbo e tentativas aparecem como `***`. Não audita escritas sem requisição (seed) nem os lançamentos automáticos de apuração no banco de horas (o recálculo os regrava a todo momento; a origem, que é a marcação ou o ajuste, já é auditada). A tela de auditoria vem no Marco 7.
