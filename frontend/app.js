const API_URL = "http://127.0.0.1:8000";
const THEME_KEY = "chatbot_theme";

const state = {
  token: localStorage.getItem("chatbot_token") || "",
  user: null,
  conversations: [],
  activeConversationId: null,
  authMode: "login",
  theme: localStorage.getItem(THEME_KEY) || "obsidian",
};

const elements = {
  authScreen: document.getElementById("auth-screen"),
  chatScreen: document.getElementById("chat-screen"),
  authTitle: document.getElementById("auth-title"),
  authForm: document.getElementById("auth-form"),
  authSubmitBtn: document.getElementById("auth-submit-btn"),
  authSwitchCopy: document.getElementById("auth-switch-copy"),
  authSwitchBtn: document.getElementById("auth-switch-btn"),
  authFeedback: document.getElementById("auth-feedback"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  logoutBtn: document.getElementById("logout-btn"),
  userEmail: document.getElementById("user-email"),
  newChatBtn: document.getElementById("new-chat-btn"),
  themeSelect: document.getElementById("theme-select"),
  conversationList: document.getElementById("conversation-list"),
  conversationTitle: document.getElementById("conversation-title"),
  messages: document.getElementById("messages"),
  messageForm: document.getElementById("message-form"),
  messageInput: document.getElementById("message-input"),
  chatFeedback: document.getElementById("chat-feedback"),
};

function setFeedback(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? "#d56f52" : "";
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  elements.themeSelect.value = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function toggleScreens(isAuthenticated) {
  elements.authScreen.classList.toggle("hidden", isAuthenticated);
  elements.chatScreen.classList.toggle("hidden", !isAuthenticated);
}

function renderAuthMode() {
  const isLogin = state.authMode === "login";
  elements.authTitle.textContent = isLogin ? "Entrar" : "Criar conta";
  elements.authSubmitBtn.textContent = isLogin ? "Entrar" : "Cadastrar";
  elements.authSwitchCopy.textContent = isLogin ? "Ainda nao tem conta?" : "Ja possui conta?";
  elements.authSwitchBtn.textContent = isLogin ? "Criar conta" : "Entrar";
  setFeedback(elements.authFeedback, "");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      throw new Error(data.detail[0].msg || "Erro de validacao.");
    }
    throw new Error(data.detail || "Erro na requisicao.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function renderMessages(messages = []) {
  elements.messages.innerHTML = "";

  if (!messages.length) {
    elements.messages.innerHTML = `
      <div class="message assistant">
        <span class="message-role">Assistente</span>
        Sua conversa vai aparecer aqui. Comece com uma pergunta, ideia ou pedido.
      </div>
    `;
    return;
  }

  messages.forEach((message) => {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${message.role}`;

    const role = document.createElement("span");
    role.className = "message-role";
    role.textContent = message.role === "user" ? "Voce" : "Assistente";

    const content = document.createElement("div");
    message.content.split("\n").forEach((line, index) => {
      if (index > 0) {
        content.appendChild(document.createElement("br"));
      }
      content.appendChild(document.createTextNode(line));
    });

    wrapper.appendChild(role);
    wrapper.appendChild(content);
    elements.messages.appendChild(wrapper);
  });

  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderConversations() {
  elements.conversationList.innerHTML = "";

  if (!state.conversations.length) {
    elements.conversationList.innerHTML = "<small>Nenhuma conversa ainda.</small>";
    return;
  }

  state.conversations.forEach((conversation) => {
    const item = document.createElement("div");
    item.className = `conversation-item ${conversation.id === state.activeConversationId ? "active" : ""}`;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "conversation-meta";

    const title = document.createElement("strong");
    title.textContent = conversation.title;

    const timestamp = document.createElement("small");
    timestamp.textContent = new Date(conversation.updated_at).toLocaleString("pt-BR");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete";
    deleteButton.textContent = "Excluir";
    deleteButton.setAttribute("aria-label", `Excluir conversa ${conversation.title}`);
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await deleteConversation(conversation.id);
      } catch (error) {
        setFeedback(elements.chatFeedback, error.message, true);
      }
    });

    trigger.appendChild(title);
    trigger.appendChild(timestamp);
    trigger.addEventListener("click", () => openConversation(conversation.id));

    item.appendChild(trigger);
    item.appendChild(deleteButton);
    elements.conversationList.appendChild(item);
  });
}

async function loadConversations() {
  if (!state.user) {
    state.conversations = [];
    renderConversations();
    return;
  }

  state.conversations = await request("/conversations");
  renderConversations();
}

async function openConversation(conversationId) {
  const conversation = await request(`/conversations/${conversationId}`);
  state.activeConversationId = conversation.id;
  elements.conversationTitle.textContent = conversation.title;
  renderMessages(conversation.messages);
  renderConversations();
}

async function createConversation() {
  const conversation = await request("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Nova conversa" }),
  });

  state.activeConversationId = conversation.id;
  elements.conversationTitle.textContent = conversation.title;
  await loadConversations();
  renderMessages([]);
  setFeedback(elements.chatFeedback, "Nova conversa criada.");
  return true;
}

async function deleteConversation(conversationId) {
  await request(`/conversations/${conversationId}`, {
    method: "DELETE",
  });

  const wasActiveConversation = state.activeConversationId === conversationId;
  if (wasActiveConversation) {
    state.activeConversationId = null;
  }

  await loadConversations();

  if (wasActiveConversation) {
    if (state.conversations[0]) {
      await openConversation(state.conversations[0].id);
    } else {
      elements.conversationTitle.textContent = "Selecione ou crie uma conversa";
      renderMessages();
    }
  }

  setFeedback(elements.chatFeedback, "Conversa excluida.");
}

async function refreshSession() {
  if (!state.token) {
    state.user = null;
    state.activeConversationId = null;
    state.conversations = [];
    toggleScreens(false);
    renderConversations();
    renderMessages();
    return;
  }

  try {
    state.user = await request("/auth/me");
    elements.userEmail.textContent = state.user.email;
    toggleScreens(true);
    await loadConversations();

    if (state.activeConversationId) {
      await openConversation(state.activeConversationId);
      return;
    }

    if (state.conversations[0]) {
      await openConversation(state.conversations[0].id);
      return;
    }

    elements.conversationTitle.textContent = "Selecione ou crie uma conversa";
    renderMessages();
  } catch (error) {
    localStorage.removeItem("chatbot_token");
    state.token = "";
    state.user = null;
    state.activeConversationId = null;
    state.conversations = [];
    toggleScreens(false);
    renderConversations();
    renderMessages();
    setFeedback(elements.authFeedback, error.message, true);
  }
}

async function submitAuth() {
  const email = elements.email.value.trim();
  const password = elements.password.value.trim();

  if (!email || !password) {
    setFeedback(elements.authFeedback, "Preencha email e senha.", true);
    return;
  }

  const isLogin = state.authMode === "login";
  const endpoint = isLogin ? "/auth/login" : "/auth/register";
  const response = await request(endpoint, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!isLogin) {
    state.authMode = "login";
    renderAuthMode();
    setFeedback(elements.authFeedback, "Conta criada. Agora faca login.");
    elements.password.value = "";
    return;
  }

  state.token = response.access_token;
  localStorage.setItem("chatbot_token", state.token);
  setFeedback(elements.authFeedback, "Login realizado com sucesso.");
  await refreshSession();
}

async function sendMessage(event) {
  event.preventDefault();

  if (!state.activeConversationId) {
    await createConversation();
  }

  const content = elements.messageInput.value.trim();
  if (!content) {
    return;
  }

  elements.messageInput.value = "";
  elements.messageInput.style.height = "auto";
  setFeedback(elements.chatFeedback, "Consultando a IA...");

  try {
    await request(`/conversations/${state.activeConversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    await loadConversations();
    await openConversation(state.activeConversationId);
    setFeedback(elements.chatFeedback, "Resposta recebida.");
  } catch (error) {
    setFeedback(elements.chatFeedback, error.message, true);
  }
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await submitAuth();
  } catch (error) {
    setFeedback(elements.authFeedback, error.message, true);
  }
});

elements.authSwitchBtn.addEventListener("click", () => {
  state.authMode = state.authMode === "login" ? "register" : "login";
  renderAuthMode();
});

elements.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("chatbot_token");
  state.token = "";
  state.user = null;
  state.activeConversationId = null;
  state.conversations = [];
  elements.conversationTitle.textContent = "Selecione ou crie uma conversa";
  toggleScreens(false);
  renderConversations();
  renderMessages();
  setFeedback(elements.chatFeedback, "");
  setFeedback(elements.authFeedback, "Sessao encerrada.");
});

elements.newChatBtn.addEventListener("click", async () => {
  try {
    await createConversation();
  } catch (error) {
    setFeedback(elements.chatFeedback, error.message, true);
  }
});

elements.themeSelect.addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

elements.messageForm.addEventListener("submit", sendMessage);
elements.messageInput.addEventListener("input", () => {
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
});

applyTheme(state.theme);
renderAuthMode();
renderMessages();
renderConversations();
refreshSession();
