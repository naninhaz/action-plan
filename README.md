# SOS Escola

Aplicativo de capacitação em primeiros socorros na escola, conforme a Lei Lucas.

## Firebase e Vercel

O deploy do Vercel usa `vercel.json`: instala as dependências, executa `npm run build` e publica `html/` com Node.js 22 ou superior. O build gera o bundle do Firebase usado pelo site. A rota `api/register.js` cria contas pelo servidor usando o Firebase Admin SDK; credenciais administrativas nunca devem ser incluídas nos arquivos do site.

### Configuração do cadastro

1. No Firebase Console, habilite **Authentication → E-mail/senha**.
2. No Vercel, configure `FIREBASE_SERVICE_ACCOUNT` com o JSON de uma conta de serviço dedicada e `INSTRUCTOR_SIGNUP_CODE` com o código privado de convite.
3. Dê à conta de serviço somente as permissões necessárias para administrar usuários do Firebase Authentication e gravar no Realtime Database. Salve os valores como variáveis privadas do Vercel; nunca os envie pelo chat, publique no repositório ou coloque no HTML/JavaScript.
4. Publique as regras antes de usar cadastro, treinamento e avaliações, executando `npx --yes firebase-tools@latest deploy --only database --project sos-escola-a6ccb`. O projeto usa `firebase.json` para publicar `database.rules.json`; as regras deixam cada pessoa ler o próprio perfil e restringem perfis e registros completos a instrutores autorizados.
5. Em **Authentication → Settings → Authorized domains**, mantenha o domínio de produção do Vercel e adicione domínios de preview que serão usados.
6. Faça um novo deploy do Vercel depois de configurar as variáveis.

O código de convite é verificado somente pela função do servidor e tentativas inválidas são limitadas. Ao se cadastrar, informar um código válido define o perfil de instrutor; sem código, a conta é de equipe escolar e exige a função na unidade. O cadastro também tem limite por rede para reduzir criação automatizada de contas. Cada pessoa cria uma senha Firebase própria (mínimo de 6 caracteres); o código de convite não é a senha da conta. O papel de instrutor dá acesso à área de avaliação do app, não privilégios administrativos no projeto Firebase. Um código curto e compartilhado continua sujeito a tentativa de adivinhação; prefira um segredo longo e aleatório.

O cadastro guarda nome, e-mail e função escolar no perfil do Realtime Database. No perfil do instrutor, avaliação prática e métricas ficam em abas separadas. A aba de métricas mostra cadastros, resultados por etapa, função escolar e tema dos casos respondidos, além de checklists práticos; as respostas antigas são agrupadas pelo título do caso. Os indicadores são atualizados em tempo real enquanto uma dessas abas estiver aberta. O endereço do Realtime Database fica no código cliente e não é uma credencial; a proteção dos dados depende da autenticação e das regras. Não use regras públicas de leitura ou escrita.
