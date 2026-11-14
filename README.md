# SOS Escola

Aplicativo de capacitação em primeiros socorros na escola, conforme a Lei Lucas.

## Firebase e Vercel

O deploy do Vercel usa `vercel.json`: instala as dependências, executa `npm run build` e publica `html/`. O build gera o bundle do Firebase usado pelo site.

Antes do primeiro acesso:

1. No Firebase Console, habilite **Authentication → E-mail/senha** e crie as contas da equipe. O site não permite cadastro público.
2. Em **Authentication → Settings → Authorized domains**, adicione o domínio de produção do Vercel e os domínios de preview que serão usados.
3. Publique as regras de `database.rules.json` em **Realtime Database → Rules**. Elas permitem que usuários autenticados gravem apenas registros próprios; somente usuários listados em `sos_escola_instructors` podem ler a base completa.
4. Em **Realtime Database → Data**, adicione `sos_escola_instructors/{UID}: true` para cada instrutor. Obtenha o UID em **Authentication → Users**.

O endereço do Realtime Database fica no código cliente e não é uma credencial. A proteção dos dados depende da autenticação e das regras do banco. Não use regras públicas de leitura ou escrita e não coloque chaves de conta de serviço no site.
