# UL8 Archive

Site público de novidades fotográficas para o servidor Minecraft UL8, pensado para GitHub Pages + Firebase.

## O que já vem feito

- Galeria pública preta com fotografias em moldura branca.
- Modal ao clicar numa fotografia.
- Título, descrição curta, descrição completa e data.
- Posts `FEATURED`.
- Posts `CLASSIFIED` com imagem censurada até o visitante clicar em Reveal.
- Página `/admin.html` sem link no site público.
- Login com Firebase Authentication (email/password).
- Upload por drag & drop ou seletor de ficheiros.
- Imagem por URL externa.
- Preview antes de publicar.
- Editar e apagar publicações.
- Firebase Firestore para dados.
- Firebase Storage para imagens locais.
- Security Rules: leitura pública, escrita apenas para o teu UID.
- Layout responsivo para PC e telemóvel.

---

# CONFIGURAÇÃO — passo a passo

## 1. Colocar a logo

Coloca a tua imagem nesta localização:

```text
assets/ulsmp8.png
```

O nome deve ser exatamente `ulsmp8.png`.

## 2. Criar projeto Firebase

1. Entra na Firebase Console.
2. Cria um projeto novo.
3. Adiciona uma Web App ao projeto (`</>`).
4. O Firebase vai mostrar um objeto chamado `firebaseConfig`.
5. Abre `js/firebase.js` e substitui os valores `COLOCA_AQUI` pelos valores do teu projeto.

Exemplo da estrutura:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  projectId: "...",
  storageBucket: "...firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

> O `firebaseConfig` de uma app Web não é uma password. A segurança é feita pelas Security Rules.

## 3. Ativar Authentication

Firebase Console:

```text
Build > Authentication > Get started > Sign-in method
```

Ativa:

```text
Email/Password
```

Depois vai a `Users` e cria **apenas a tua conta de administrador**.

Não existe botão de criar conta no site.

## 4. Copiar o teu UID

Em:

```text
Authentication > Users
```

Copia o UID da tua conta.

Abre:

```text
firestore.rules
storage.rules
```

E substitui nas duas:

```text
COLOCA_AQUI_O_TEU_ADMIN_UID
```

pelo teu UID verdadeiro.

## 5. Criar Firestore

Vai a:

```text
Build > Firestore Database > Create database
```

Escolhe Production Mode.

Depois abre a aba `Rules` e cola o conteúdo de `firestore.rules`.

Publica as regras.

Não precisas de criar manualmente a coleção `posts`; o painel cria-a na primeira publicação.

## 6. Ativar Storage

Vai a:

```text
Build > Storage > Get started
```

Depois abre `Rules`, cola `storage.rules` e publica.

Atenção: projetos Firebase atuais podem exigir o plano Blaze para ativar/usar Cloud Storage. Consulta o painel Firebase para as condições atuais do teu projeto.

## 7. Testar localmente

Como o projeto usa JavaScript Modules, não abras apenas `index.html` com `file:///`.

Podes usar, por exemplo, VS Code + extensão Live Server.

Ou Python:

```bash
python -m http.server 8080
```

Depois:

```text
http://localhost:8080
http://localhost:8080/admin.html
```

## 8. Publicar no GitHub Pages

1. Cria um repositório no GitHub, por exemplo `UL8`.
2. Envia todos os ficheiros desta pasta para o repositório.
3. GitHub > Settings > Pages.
4. Em `Build and deployment`, escolhe `Deploy from a branch`.
5. Branch: `main`.
6. Folder: `/ (root)`.
7. Save.

O endereço será semelhante a:

```text
https://TEU-UTILIZADOR.github.io/UL8/
```

Admin:

```text
https://TEU-UTILIZADOR.github.io/UL8/admin.html
```

## Segurança

O facto de `admin.html` não estar ligado no site público é apenas conveniência visual.

A segurança real é:

- Firebase Authentication identifica a conta.
- Firestore Rules verificam o UID antes de aceitar qualquer write.
- Storage Rules verificam o UID antes de aceitar upload/delete.
- Visitantes têm apenas leitura dos posts e imagens.

Mesmo que alguém encontre `/admin.html`, não consegue publicar sem uma conta autorizada pelas Rules.

## Estrutura

```text
UL8-Archive/
├── index.html
├── admin.html
├── firestore.rules
├── storage.rules
├── README.md
├── assets/
│   └── ulsmp8.png   <- adiciona tu
├── css/
│   ├── style.css
│   └── admin.css
└── js/
    ├── firebase.js
    ├── gallery.js
    └── admin.js
```
