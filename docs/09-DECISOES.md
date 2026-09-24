# Decisões

## Marco 1 — fundação

- **App local com janela própria** (WinForms + WebView2 + Kestrel no mesmo processo), SQLite, sem Docker, sem navegador — mesmo modelo dos projetos OfiTools e Nexora, dos quais vieram o esqueleto da janela e o initializer com backup.
- **Login local com perfis** (Admin, RH, Gestor, Funcionário): aprovações e auditoria precisam registrar quem fez de verdade.
- **Testes automatizados concentrados nos motores de cálculo**, onde as regras são densas e um erro custa caro; o resto é verificado rodando o sistema.
- **Entrega por marcos**: o M1 cobre esqueleto e núcleo de jornada; ocorrências, fechamento, folha, documentos e integração vêm depois, sobre as mesmas bases.
- **Identificadores do domínio em pt-BR** (Funcionario, Marcacao, Apuracao, BancoHorasLancamento): banco de horas, hora ficta e apuração não têm tradução fiel, e a tela e a CLT falam assim. O encanamento HTTP mantém nomes em inglês (GlobalExceptionHandler, OriginGuardMiddleware, BusinessRuleException...).
- **Política versionada por vigência**, nunca editada no lugar: o passado continua calculável com a regra da época e cada resultado guarda a versão usada. Uma nova versão recalcula desde a vigência (até 400 dias atrás).
- **Marcação nunca é editada nem apagada** (espírito da Portaria 671): correção é um ajuste (inclusão ou desconsideração) com justificativa e aprovação de outra pessoa.
- **Motor puro no Domain** com entrada/saída explícitas; regras aplicadas saem como códigos e a tradução pt-BR com base legal fica na Application (dá para melhorar o texto sem recalcular).
- **Tolerância**: padrão "integral ao exceder" (CLT art. 58 §1º + Súmula 366); a alternativa "descontar por marcação" existe para política de empresa/convenção.
- **Dia inteiro com um tipo só**: o dia de referência é o da entrada da jornada; horas depois da meia-noite não viram outro tipo de dia.
- **Débitos em minutos de relógio** (sem conversão noturna), extras noturnas em hora ficta.
- **Dia de hoje sempre provisório**: aparece na tela, mas não lança no banco até virar o dia.
- **Recálculo síncrono** depois de cada escrita relevante (volume local pequeno); sem fila por enquanto.
- **Auditoria só de escritas em requisição** e sem os lançamentos automáticos de apuração, para não inundar a tabela (o seed gerava milhares de eventos e deixava a primeira abertura lenta).
- **Portas** 5340 (app), 5341 (API dev), 5195 (Vite) e 9335 (depuração remota do WebView2 em testes), escolhidas para não colidir com outros apps locais.
- **Paleta teal/esmeralda** e ícone de duas pessoas.
