# ✦ VELMARA — Mapa Interativo

Mapa interativo para o cenário de RPG Velmara, hospedado no GitHub Pages.

---

## 📁 Estrutura do Projeto

```
velmara-map/
├── index.html              ← Página principal
├── css/
│   └── style.css           ← Estilos visuais
├── js/
│   └── app.js              ← Toda a lógica do mapa
├── data/
│   └── locations.json      ← AQUI você edita locais, NPCs, quests
└── assets/
    └── map/
        └── velmara.jpg     ← Coloque sua imagem aqui
```

---

## 🚀 Como Configurar no GitHub Pages (passo a passo)

### 1. Criar o repositório

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository**
3. Nome sugerido: `velmara-map`
4. Deixe como **Public** (obrigatório para GitHub Pages gratuito)
5. **Não** marque "Add README" — você vai enviar os arquivos manualmente
6. Clique em **Create repository**

### 2. Fazer upload dos arquivos

**Opção A — Pelo site (mais simples):**
1. Na página do repositório, clique em **Add file → Upload files**
2. Arraste TODOS os arquivos e pastas de uma vez
3. Mantenha a estrutura de pastas exatamente como está
4. Clique em **Commit changes**

**Opção B — Via Git (recomendado para atualizações frequentes):**
```bash
git clone https://github.com/SEU_USUARIO/velmara-map.git
# Copie todos os arquivos para a pasta clonada
git add .
git commit -m "Primeira versão do mapa de Velmara"
git push origin main
```

### 3. Ativar o GitHub Pages

1. No repositório, vá em **Settings** (aba no topo)
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione `Deploy from a branch`
4. Branch: `main` | Pasta: `/ (root)`
5. Clique em **Save**
6. Aguarde 1-2 minutos
7. O link aparecerá no topo: `https://SEU_USUARIO.github.io/velmara-map/`

---

## 🗺️ Adicionando o Mapa

1. Gere uma imagem do mapa com IA (Gemini, Midjourney, DALL-E, etc.)
2. Salve como `velmara.jpg` (recomendado: 2048x1300 pixels ou maior)
3. Coloque em `assets/map/velmara.jpg`
4. Abra `js/app.js` e ajuste:
   ```javascript
   const MAP_CONFIG = {
     width:  2048,  // largura real da sua imagem
     height: 1300,  // altura real da sua imagem
   };
   ```

---

## 📍 Adicionando Locais

Edite `data/locations.json`. Cada local segue este formato:

```json
{
  "id": "nome-unico-sem-espacos",
  "name": "Nome do Local",
  "type": "cidade",
  "coords": [50, 40],
  "visibility": "public",
  "region": "Nome da Região",
  "short": "Descrição curta (aparece no painel)",
  "description": "Descrição completa.",
  "atmosphere": "Como o lugar se sente.",
  "history": "História do local.",
  "factions": ["Nome da Facção"],
  "tags": ["tag1", "tag2"],
  "npcs": [
    {
      "name": "Nome do NPC",
      "role": "Papel/profissão",
      "description": "Descrição breve."
    }
  ],
  "quests": [
    {
      "name": "Nome da Quest",
      "description": "Descrição da missão."
    }
  ],
  "sublocations": [
    {
      "icon": "🏰",
      "name": "Nome do Sublocal",
      "description": "Descrição."
    }
  ],
  "master": {
    "secrets": "Segredos que só o Mestre vê.",
    "notes": "Notas de narração.",
    "hiddenNpcs": [],
    "hiddenQuests": []
  }
}
```

### Tipos disponíveis:
| Tipo | Ícone | Uso |
|------|-------|-----|
| `cidade` | 🏰 | Cidades grandes |
| `vila` | 🏘️ | Vilas e aldeias |
| `ruina` | 🏚️ | Ruínas exploráveis |
| `dungeon` | 💀 | Dungeons e masmorras |
| `pdi` | ⭐ | Pontos de interesse |
| `cristal` | 💎 | Cristais Elementares |
| `portal` | 🌀 | Portais e passagens |
| `santuario` | ⛩️ | Santuários divinos |
| `secreto` | 🔍 | Locais secretos (só Mestre) |

### Coordenadas:
- `coords: [x%, y%]` onde `[0, 0]` = canto superior esquerdo
- `[50, 50]` = centro do mapa
- Ajuste tentando e vendo no mapa

### Visibilidade:
- `"public"` → visível para todos
- `"secret"` → visível apenas com Modo Mestre ativo + segredos exibidos

---

## ⚔️ Modo Mestre

**Como ativar:**
Clique **5 vezes seguidas** no título `✦ VELMARA ✦` no topo da página.

Uma janela de senha será aberta. Jogadores não vão descobrir isso por acidente.

**Senha padrão:** `bbrae`

**Para mudar a senha:**
Abra `js/app.js` e edite:
```javascript
const MASTER_HASH = btoa('sua_nova_senha');
```

> ⚠️ **Importante:** Esta senha está no código-fonte público. Ela protege contra acesso *acidental*, não contra alguém que olhe o código intencionalmente. Para uma campanha isso é suficiente.

**O que o Modo Mestre permite:**
- Ver locais secretos (com o botão 🔒)
- Ver aba "Mestre" nos painéis (segredos, notas, NPCs ocultos, quests ocultas)
- Adicionar novos locais clicando no mapa (temporário — copie as coordenadas para o JSON)

---

## 🔄 Atualizando o Projeto

Após edições nos arquivos:

**Via GitHub web:**
1. Clique no arquivo que quer editar
2. Clique no ícone de lápis ✏️
3. Faça as alterações
4. Clique em **Commit changes**
5. Aguarde ~1 minuto para o GitHub Pages atualizar

**Via Git:**
```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```

---

## 📱 Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Android Chrome)
- ✅ Tablet
- ✅ Modo offline (após o primeiro carregamento, se a imagem estiver em cache)

---

## ❓ Problemas Comuns

**"Mapa não encontrado":**
Verifique se o arquivo está em `assets/map/velmara.jpg` (minúsculas) e se foi feito o upload corretamente.

**Marcadores em posições erradas:**
Ajuste as coordenadas `[x%, y%]` no `locations.json`. Use o Modo Mestre → botão ＋ para clicar no mapa e obter as coordenadas certas.

**Página não atualiza após edição:**
Aguarde 1-2 minutos após o commit. Force refresh com `Ctrl + Shift + R`.

**Modo Mestre não abre:**
Certifique-se de clicar exatamente 5 vezes no texto `✦ VELMARA ✦` dentro de 1,5 segundos.

---

*Velmara v1.0 — Cenário original de RPG de fantasia*
