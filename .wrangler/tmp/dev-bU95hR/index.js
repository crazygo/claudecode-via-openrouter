var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function validateOpenAIToolCalls(messages) {
  const validatedMessages = [];
  for (let i = 0; i < messages.length; i++) {
    const currentMessage = { ...messages[i] };
    if (currentMessage.role === "assistant" && currentMessage.tool_calls) {
      const validToolCalls = [];
      const immediateToolMessages = [];
      let j = i + 1;
      while (j < messages.length && messages[j].role === "tool") {
        immediateToolMessages.push(messages[j]);
        j++;
      }
      currentMessage.tool_calls.forEach((toolCall) => {
        const hasImmediateToolMessage = immediateToolMessages.some(
          (toolMsg) => toolMsg.tool_call_id === toolCall.id
        );
        if (hasImmediateToolMessage) {
          validToolCalls.push(toolCall);
        }
      });
      if (validToolCalls.length > 0) {
        currentMessage.tool_calls = validToolCalls;
      } else {
        delete currentMessage.tool_calls;
      }
      if (currentMessage.content || currentMessage.tool_calls) {
        validatedMessages.push(currentMessage);
      }
    } else if (currentMessage.role === "tool") {
      let hasImmediateToolCall = false;
      if (i > 0) {
        const prevMessage = messages[i - 1];
        if (prevMessage.role === "assistant" && prevMessage.tool_calls) {
          hasImmediateToolCall = prevMessage.tool_calls.some(
            (toolCall) => toolCall.id === currentMessage.tool_call_id
          );
        } else if (prevMessage.role === "tool") {
          for (let k = i - 1; k >= 0; k--) {
            if (messages[k].role === "tool") continue;
            if (messages[k].role === "assistant" && messages[k].tool_calls) {
              hasImmediateToolCall = messages[k].tool_calls.some(
                (toolCall) => toolCall.id === currentMessage.tool_call_id
              );
            }
            break;
          }
        }
      }
      if (hasImmediateToolCall) {
        validatedMessages.push(currentMessage);
      }
    } else {
      validatedMessages.push(currentMessage);
    }
  }
  return validatedMessages;
}
__name(validateOpenAIToolCalls, "validateOpenAIToolCalls");
__name2(validateOpenAIToolCalls, "validateOpenAIToolCalls");
function mapModel(anthropicModel) {
  if (anthropicModel.includes("/")) {
    return anthropicModel;
  }
  if (anthropicModel.includes("haiku")) {
    return "anthropic/claude-3.5-haiku";
  } else if (anthropicModel.includes("sonnet")) {
    return "anthropic/claude-sonnet-4";
  } else if (anthropicModel.includes("opus")) {
    return "anthropic/claude-opus-4";
  }
  return anthropicModel;
}
__name(mapModel, "mapModel");
__name2(mapModel, "mapModel");
function formatAnthropicToOpenAI(body) {
  const { model, messages, system = [], temperature, tools, stream } = body;
  const openAIMessages = Array.isArray(messages) ? messages.flatMap((anthropicMessage) => {
    const openAiMessagesFromThisAnthropicMessage = [];
    if (!Array.isArray(anthropicMessage.content)) {
      if (typeof anthropicMessage.content === "string") {
        openAiMessagesFromThisAnthropicMessage.push({
          role: anthropicMessage.role,
          content: anthropicMessage.content
        });
      }
      return openAiMessagesFromThisAnthropicMessage;
    }
    if (anthropicMessage.role === "assistant") {
      const assistantMessage = { role: "assistant", content: null };
      let textContent = "";
      const toolCalls = [];
      anthropicMessage.content.forEach((contentPart) => {
        if (contentPart.type === "text") {
          textContent += (typeof contentPart.text === "string" ? contentPart.text : JSON.stringify(contentPart.text)) + "\n";
        } else if (contentPart.type === "tool_use") {
          toolCalls.push({
            id: contentPart.id,
            type: "function",
            function: {
              name: contentPart.name,
              arguments: JSON.stringify(contentPart.input)
            }
          });
        }
      });
      const trimmedTextContent = textContent.trim();
      if (trimmedTextContent.length > 0) {
        assistantMessage.content = trimmedTextContent;
      }
      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }
      if (assistantMessage.content || assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        openAiMessagesFromThisAnthropicMessage.push(assistantMessage);
      }
    } else if (anthropicMessage.role === "user") {
      let userTextMessageContent = "";
      const subsequentToolMessages = [];
      anthropicMessage.content.forEach((contentPart) => {
        if (contentPart.type === "text") {
          userTextMessageContent += (typeof contentPart.text === "string" ? contentPart.text : JSON.stringify(contentPart.text)) + "\n";
        } else if (contentPart.type === "tool_result") {
          subsequentToolMessages.push({
            role: "tool",
            tool_call_id: contentPart.tool_use_id,
            content: typeof contentPart.content === "string" ? contentPart.content : JSON.stringify(contentPart.content)
          });
        }
      });
      const trimmedUserText = userTextMessageContent.trim();
      if (trimmedUserText.length > 0) {
        openAiMessagesFromThisAnthropicMessage.push({
          role: "user",
          content: trimmedUserText
        });
      }
      openAiMessagesFromThisAnthropicMessage.push(...subsequentToolMessages);
    }
    return openAiMessagesFromThisAnthropicMessage;
  }) : [];
  const systemMessages = Array.isArray(system) ? system.map((item) => {
    const content = { type: "text", text: item.text };
    if (model.includes("claude")) {
      content.cache_control = { "type": "ephemeral" };
    }
    return { role: "system", content: [content] };
  }) : [{
    role: "system",
    content: [{
      type: "text",
      text: system,
      ...model.includes("claude") ? { cache_control: { "type": "ephemeral" } } : {}
    }]
  }];
  const data = {
    model: mapModel(model),
    messages: [...systemMessages, ...openAIMessages],
    temperature,
    stream
  };
  if (tools) {
    data.tools = tools.map((item) => ({
      type: "function",
      function: {
        name: item.name,
        description: item.description,
        parameters: item.input_schema
      }
    }));
  }
  data.messages = [...systemMessages, ...validateOpenAIToolCalls(openAIMessages)];
  return data;
}
__name(formatAnthropicToOpenAI, "formatAnthropicToOpenAI");
__name2(formatAnthropicToOpenAI, "formatAnthropicToOpenAI");
function streamOpenAIToAnthropic(openaiStream, model) {
  const messageId = "msg_" + Date.now().toString(36) + Math.random().toString(36).substr(2);
  const generateNonce = /* @__PURE__ */ __name(() => Math.random().toString(36).substr(2), "generateNonce");
  const enqueueSSE = /* @__PURE__ */ __name2((controller, eventType, data) => {
    const sseMessage = `event: ${eventType}
data: ${JSON.stringify(data)}

`;
    controller.enqueue(new TextEncoder().encode(sseMessage));
  }, "enqueueSSE");
  return new ReadableStream({
    async start(controller) {
      let contentBlockIndex = 0;
      let hasStartedTextBlock = false;
      let isToolUse = false;
      let currentToolCallId = null;
      let toolCallJsonMap = /* @__PURE__ */ new Map();
      let currentUsage = {
        input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 1,
        service_tier: "standard"
      };
      const messageStart = {
        nonce: generateNonce(),
        type: "message_start",
        message: {
          id: messageId,
          type: "message",
          role: "assistant",
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { ...currentUsage }
        }
      };
      enqueueSSE(controller, "message_start", messageStart);
      const reader = openaiStream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputTokenCount = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              const lines2 = buffer.split("\n");
              for (const line of lines2) {
                if (line.trim() && line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    processStreamChunk(parsed);
                  } catch (e) {
                  }
                }
              }
            }
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim() && line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                processStreamChunk(parsed);
              } catch (e) {
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      function processStreamChunk(parsed) {
        const delta = parsed.choices?.[0]?.delta;
        if (parsed.usage) {
          currentUsage.input_tokens = parsed.usage.prompt_tokens || currentUsage.input_tokens;
          currentUsage.output_tokens = parsed.usage.completion_tokens || currentUsage.output_tokens;
        }
        if (!delta) return;
        if (Math.random() < 0.1) {
          enqueueSSE(controller, "ping", {
            nonce: generateNonce(),
            type: "ping"
          });
        }
        if (delta.tool_calls?.length > 0) {
          for (const toolCall of delta.tool_calls) {
            const toolCallId = toolCall.id;
            if (toolCallId && toolCallId !== currentToolCallId) {
              if (isToolUse || hasStartedTextBlock) {
                enqueueSSE(controller, "content_block_stop", {
                  type: "content_block_stop",
                  index: contentBlockIndex
                });
              }
              isToolUse = true;
              hasStartedTextBlock = false;
              currentToolCallId = toolCallId;
              contentBlockIndex++;
              toolCallJsonMap.set(toolCallId, "");
              const toolBlock = {
                type: "tool_use",
                id: toolCallId,
                name: toolCall.function?.name,
                input: {}
              };
              enqueueSSE(controller, "content_block_start", {
                nonce: generateNonce(),
                type: "content_block_start",
                index: contentBlockIndex,
                content_block: toolBlock
              });
            }
            if (toolCall.function?.arguments && currentToolCallId) {
              const currentJson = toolCallJsonMap.get(currentToolCallId) || "";
              toolCallJsonMap.set(currentToolCallId, currentJson + toolCall.function.arguments);
              enqueueSSE(controller, "content_block_delta", {
                nonce: generateNonce(),
                type: "content_block_delta",
                index: contentBlockIndex,
                delta: {
                  type: "input_json_delta",
                  partial_json: toolCall.function.arguments
                }
              });
            }
          }
        } else if (delta.content) {
          outputTokenCount += Math.ceil(delta.content.length / 4);
          if (isToolUse) {
            enqueueSSE(controller, "content_block_stop", {
              type: "content_block_stop",
              index: contentBlockIndex
            });
            isToolUse = false;
            currentToolCallId = null;
            contentBlockIndex++;
          }
          if (!hasStartedTextBlock) {
            enqueueSSE(controller, "content_block_start", {
              nonce: generateNonce(),
              type: "content_block_start",
              index: contentBlockIndex,
              content_block: { type: "text", text: "" }
            });
            hasStartedTextBlock = true;
          }
          const eventData = {
            type: "content_block_delta",
            index: contentBlockIndex,
            delta: { type: "text_delta", text: delta.content }
          };
          if (Math.random() < 0.5) {
            eventData.nonce = generateNonce();
          }
          enqueueSSE(controller, "content_block_delta", eventData);
        }
      }
      __name(processStreamChunk, "processStreamChunk");
      __name2(processStreamChunk, "processStreamChunk");
      if (isToolUse || hasStartedTextBlock) {
        enqueueSSE(controller, "content_block_stop", {
          type: "content_block_stop",
          index: contentBlockIndex
        });
      }
      const finalOutputTokens = currentUsage.output_tokens || outputTokenCount || 1;
      enqueueSSE(controller, "message_delta", {
        nonce: generateNonce(),
        type: "message_delta",
        delta: {
          stop_reason: isToolUse ? "tool_use" : "end_turn",
          stop_sequence: null
        },
        usage: { output_tokens: finalOutputTokens }
      });
      enqueueSSE(controller, "message_stop", {
        nonce: generateNonce(),
        type: "message_stop"
      });
      controller.close();
    }
  });
}
__name(streamOpenAIToAnthropic, "streamOpenAIToAnthropic");
__name2(streamOpenAIToAnthropic, "streamOpenAIToAnthropic");
function formatOpenAIToAnthropic(completion, model) {
  const messageId = "msg_" + Date.now().toString(36) + Math.random().toString(36).substr(2);
  let content = [];
  if (completion.choices[0].message.content) {
    content = [{ text: completion.choices[0].message.content, type: "text" }];
  } else if (completion.choices[0].message.tool_calls) {
    content = completion.choices[0].message.tool_calls.map((item) => {
      return {
        type: "tool_use",
        id: item.id,
        name: item.function?.name,
        input: item.function?.arguments ? JSON.parse(item.function.arguments) : {}
      };
    });
  }
  const usage = completion.usage ? {
    input_tokens: completion.usage.prompt_tokens || 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    output_tokens: completion.usage.completion_tokens || 0,
    service_tier: "standard"
  } : {
    input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    output_tokens: 0,
    service_tier: "standard"
  };
  const result = {
    id: messageId,
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: completion.choices[0].finish_reason === "tool_calls" ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage
  };
  return result;
}
__name(formatOpenAIToAnthropic, "formatOpenAIToAnthropic");
__name2(formatOpenAIToAnthropic, "formatOpenAIToAnthropic");
var indexHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Claude Code + OpenRouter</title>
<style>body{font-family:monospace;max-width:800px;margin:20px auto;background:#000;color:#0f0;padding:20px}
.header{border-bottom:1px solid #0f0;padding-bottom:10px;margin-bottom:20px}
.step{margin:20px 0;padding:10px;border:1px solid #333}
.code{background:#111;color:#0f0;padding:10px;margin:10px 0;border:1px solid #333;overflow-x:auto}
.btn{background:#333;color:#0f0;border:1px solid #0f0;padding:5px 10px;cursor:pointer}
.btn:hover{background:#0f0;color:#000}
a{color:#0f0}a:visited{color:#090}</style></head>
<body><div class="header"><h1>\u{1F680} Claude Code + OpenRouter</h1><p>Terminal-style setup guide</p></div>

<div class="step"><h2>\u26A1 One-line Install (Recommended)</h2>
<div class="code">bash -c "$(curl -fsSL https://cc.yovy.app/install.sh)"</div>
<button class="btn" onclick="copy('bash -c "$(curl -fsSL https://cc.yovy.app/install.sh)"')">Copy</button>
<p>Installs Node.js, Claude Code, and configures environment</p></div>

<div class="step"><h2>1. Manual: Install Claude Code</h2>
<div class="code">npm install -g @anthropic-ai/claude-code</div>
<button class="btn" onclick="copy('npm install -g @anthropic-ai/claude-code')">Copy</button>
<p>Or download from <a href="https://claude.ai/code">claude.ai/code</a></p></div>

<div class="step"><h2>2. Manual: Get OpenRouter API Key</h2>
<p>Sign up at <a href="https://openrouter.ai">openrouter.ai</a> and get your API key</p></div>

<div class="step"><h2>3. Manual: Configure</h2>
<p>Add to ~/.bashrc or ~/.zshrc:</p>
<div class="code">export ANTHROPIC_BASE_URL="https://cc.yovy.app"
export ANTHROPIC_API_KEY="your-openrouter-api-key"</div>
<button class="btn" onclick="copy('export ANTHROPIC_BASE_URL="https://cc.yovy.app"\\nexport ANTHROPIC_API_KEY="your-openrouter-api-key"')">Copy</button>

<p>Optional models (browse at <a href="https://openrouter.ai/models">openrouter.ai/models</a>):</p>
<div class="code">export ANTHROPIC_MODEL="moonshotai/kimi-k2"
export ANTHROPIC_SMALL_FAST_MODEL="google/gemini-2.5-flash"</div>
<button class="btn" onclick="copy('export ANTHROPIC_MODEL="moonshotai/kimi-k2"\\nexport ANTHROPIC_SMALL_FAST_MODEL="google/gemini-2.5-flash"')">Copy</button>

<p>Reload shell:</p>
<div class="code">source ~/.bashrc</div>
<button class="btn" onclick="copy('source ~/.bashrc')">Copy</button></div>

<div class="step"><h2>\u{1F389} Ready!</h2>
<p>Run <code>claude</code> in terminal</p></div>

<div class="step"><p>Links: <a href="https://github.com/luohy15/y-router">y-router</a> | 
<a href="https://openrouter.ai">OpenRouter</a> | <a href="https://claude.ai/code">Claude Code</a> | 
<a href="/terms">Terms</a> | <a href="/privacy">Privacy</a></p></div>

<script>function copy(text){navigator.clipboard.writeText(text).then(()=>alert('Copied!')).catch(()=>{
const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();
document.execCommand('copy');document.body.removeChild(t);alert('Copied!')})}<\/script></body></html>`;
var termsHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Terms - y-router</title>
<style>body{font-family:monospace;max-width:800px;margin:20px auto;background:#000;color:#0f0;padding:20px;line-height:1.4}
h1,h2,h3{color:#0f0;margin:20px 0 10px 0}ul{margin-left:20px}a{color:#0f0}</style></head>
<body><p><a href="/">Home</a> | <a href="/terms">Terms</a> | <a href="/privacy">Privacy</a></p>

<h1>Terms of Service</h1>
<p>Last updated: July 12, 2025</p>

<h2>Important</h2>
<p>By using y-router (cc.yovy.app), you acknowledge this is a third-party service not affiliated with Anthropic, OpenAI, or OpenRouter. Use at your own risk.</p>

<h2>1. Service Description</h2>
<p>y-router converts requests between Anthropic's Claude API format and OpenAI-compatible formats. Acts as a proxy for API compatibility.</p>

<h2>2. User Responsibilities</h2>
<ul><li>Provide your own valid API keys</li>
<li>Responsible for security and costs of your API keys</li>
<li>Comply with all laws and connected API provider terms</li>
<li>Not use for illegal, harmful, or malicious purposes</li></ul>

<h2>3. Service Limitations</h2>
<ul><li>Provided "as is" without warranties</li>
<li>No guaranteed availability</li>
<li>May modify, suspend, or discontinue anytime</li>
<li>Rate limits may apply</li></ul>

<h2>4. Data and Privacy</h2>
<ul><li>Processes requests real-time, doesn't store user data</li>
<li>Forwards to third-party providers per their policies</li>
<li>Review connected service privacy policies</li></ul>

<h2>5. Limitation of Liability</h2>
<p>Not liable for damages including data loss, service interruptions, cost overruns, security breaches, or TOS violations.</p>

<h2>6. Contact</h2>
<p>Questions: <a href="https://github.com/luohy15/y-router">GitHub repository</a></p>

<p>y-router is independent, open-source. Not affiliated with Anthropic, OpenAI, or OpenRouter.</p></body></html>`;
var privacyHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Privacy - y-router</title>
<style>body{font-family:monospace;max-width:800px;margin:20px auto;background:#000;color:#0f0;padding:20px;line-height:1.4}
h1,h2,h3{color:#0f0;margin:20px 0 10px 0}ul{margin-left:20px}a{color:#0f0}</style></head>
<body><p><a href="/">Home</a> | <a href="/terms">Terms</a> | <a href="/privacy">Privacy</a></p>

<h1>Privacy Policy</h1>
<p>Last updated: July 12, 2025</p>

<h2>Privacy First</h2>
<p>y-router is a transparent proxy that doesn't store your data. Requests are processed by third-party providers with their own policies.</p>

<h2>1. What We Process</h2>
<ul><li>API requests/responses in transit</li>
<li>Request metadata for operation</li>
<li>Technical info for format conversion</li></ul>

<h2>2. What We DON'T Store</h2>
<ul><li>Your API keys</li>
<li>Conversation content</li>
<li>Personal info</li>
<li>Request history beyond necessity</li></ul>

<h2>3. Data Flow</h2>
<p>Your App \u2192 y-router \u2192 API Provider \u2192 y-router \u2192 Your App<br>
y-router acts as pass-through, doesn't retain data.</p>

<h2>4. Third-Party Services</h2>
<p>Data processed by API providers with own policies:</p>
<ul><li>OpenRouter: <a href="https://openrouter.ai/privacy">Privacy Policy</a></li>
<li>Anthropic: <a href="https://www.anthropic.com/privacy">Privacy Policy</a></li></ul>

<h2>5. Technical</h2>
<ul><li>Runs on Cloudflare Workers</li>
<li>No persistent storage for user data</li>
<li>Minimal operational logs</li>
<li>HTTPS encryption</li></ul>

<h2>6. Self-Hosting</h2>
<p>For max privacy: deploy y-router yourself for full control</p>

<h2>7. Contact</h2>
<p>Privacy questions: <a href="https://github.com/luohy15/y-router/issues">GitHub Issues</a></p>

<p>y-router is independent, open-source. Data requests should go to relevant API providers.</p></body></html>`;
var installSh = `#!/bin/bash
set -e

install_nodejs() {
    echo "\u{1F680} Installing Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    \\. "$HOME/.nvm/nvm.sh"
    nvm install 22
    echo "\u2705 Node.js: $(node -v), npm: $(npm -v)"
}

if command -v node >/dev/null 2>&1; then
    major_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$major_version" -ge 18 ]; then
        echo "Node.js already installed: $(node -v)"
    else
        install_nodejs
    fi
else
    install_nodejs
fi

if command -v claude >/dev/null 2>&1; then
    echo "Claude Code already installed: $(claude --version)"
else
    echo "Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code
fi

echo "Configuring Claude Code..."
node --eval 'const homeDir=os.homedir();const filePath=path.join(homeDir,".claude.json");
if(fs.existsSync(filePath)){const content=JSON.parse(fs.readFileSync(filePath,"utf-8"));
fs.writeFileSync(filePath,JSON.stringify({...content,hasCompletedOnboarding:true},2),"utf-8")}
else{fs.writeFileSync(filePath,JSON.stringify({hasCompletedOnboarding:true}),"utf-8")}'

echo "\u{1F527} Select provider:"
echo "1) OpenRouter (default)"
echo "2) Moonshot"
read -p "Choice [1]: " provider_choice
provider_choice=\${provider_choice:-1}

case "$provider_choice" in
    1)
        provider="openrouter"
        default_base_url="https://cc.yovy.app"
        api_key_url="https://openrouter.ai/keys"
        default_model_main="anthropic/claude-sonnet-4"
        default_model_small="anthropic/claude-3.5-haiku"
        ;;
    2)
        provider="moonshot"
        echo "Moonshot endpoint:"
        echo "1) Global (.ai)"
        echo "2) China (.cn)"
        read -p "Choice [1]: " endpoint_choice
        endpoint_choice=\${endpoint_choice:-1}
        
        if [ "$endpoint_choice" = "2" ]; then
            default_base_url="https://api.moonshot.cn/anthropic/"
            api_key_url="https://platform.moonshot.cn/console/api-keys"
        else
            default_base_url="https://api.moonshot.ai/anthropic/"
            api_key_url="https://platform.moonshot.ai/console/api-keys"
        fi
        
        echo "\u26A0\uFE0F  Important: Moonshot requires account credit before use"
        default_model_main="kimi-k2-0711-preview"
        default_model_small="moonshot-v1-8k"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

read -p "Base URL [$default_base_url]: " base_url
base_url=\${base_url:-$default_base_url}

echo "\u{1F511} Enter $provider API key (get from: $api_key_url):"
read -s api_key
echo "\u2705 API key received (\${#api_key} chars)"

if [ -z "$api_key" ]; then
    echo "\u274C API key required"
    exit 1
fi

read -p "Main model [$default_model_main]: " model_main
model_main=\${model_main:-$default_model_main}

read -p "Small model [$default_model_small]: " model_small
model_small=\${model_small:-$default_model_small}

current_shell=$(basename "$SHELL")
case "$current_shell" in
    bash) rc_file="$HOME/.bashrc" ;;
    zsh) rc_file="$HOME/.zshrc" ;;
    fish) rc_file="$HOME/.config/fish/config.fish" ;;
    *) rc_file="$HOME/.profile" ;;
esac

echo "\u{1F4DD} Configuring $rc_file..."

if [ -f "$rc_file" ]; then
    cp "$rc_file" "\${rc_file}.backup.$(date +%Y%m%d_%H%M%S)"
    grep -v "^# Claude Code\\|^export ANTHROPIC_" "$rc_file" > "\${rc_file}.tmp" || true
    mv "\${rc_file}.tmp" "$rc_file"
fi

cat >> "$rc_file" << EOF

# Claude Code environment variables for $provider
export ANTHROPIC_BASE_URL=$base_url
export ANTHROPIC_API_KEY=$api_key
export ANTHROPIC_MODEL=$model_main
export ANTHROPIC_SMALL_FAST_MODEL=$model_small
EOF

echo "\u{1F389} Installation completed!"
echo "\u{1F504} Restart terminal or run: source $rc_file"
echo "\u{1F680} Then run: claude"`;
function buildOpenRouterHeaders(bearerToken, env) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${bearerToken}`
  };
  const appReferer = env.OPENROUTER_APP_REFERER || "https://xline.askman.dev";
  headers["HTTP-Referer"] = appReferer;
  return headers;
}
__name(buildOpenRouterHeaders, "buildOpenRouterHeaders");
__name2(buildOpenRouterHeaders, "buildOpenRouterHeaders");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/terms" && request.method === "GET") {
      return new Response(termsHtml, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/privacy" && request.method === "GET") {
      return new Response(privacyHtml, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname === "/install.sh" && request.method === "GET") {
      return new Response(installSh, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/v1/messages/count_tokens" && request.method === "POST") {
      const anthropicRequest = await request.json();
      const openaiRequest = formatAnthropicToOpenAI(anthropicRequest);
      const bearerToken = request.headers.get("x-api-key");
      const baseUrl = env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
      const tokenCountRequest = {
        ...openaiRequest,
        max_tokens: 1,
        stream: false
      };
      const openaiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: buildOpenRouterHeaders(bearerToken, env),
        body: JSON.stringify(tokenCountRequest)
      });
      if (!openaiResponse.ok) {
        return new Response(await openaiResponse.text(), { status: openaiResponse.status });
      }
      const openaiData = await openaiResponse.json();
      const anthropicTokenResponse = {
        input_tokens: openaiData.usage?.prompt_tokens || 0
      };
      return new Response(JSON.stringify(anthropicTokenResponse), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/v1/messages" && request.method === "POST") {
      const anthropicRequest = await request.json();
      const openaiRequest = formatAnthropicToOpenAI(anthropicRequest);
      const bearerToken = request.headers.get("x-api-key");
      const baseUrl = env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
      const openaiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: buildOpenRouterHeaders(bearerToken, env),
        body: JSON.stringify(openaiRequest)
      });
      if (!openaiResponse.ok) {
        return new Response(await openaiResponse.text(), { status: openaiResponse.status });
      }
      if (openaiRequest.stream) {
        const anthropicStream = streamOpenAIToAnthropic(openaiResponse.body, openaiRequest.model);
        return new Response(anthropicStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } else {
        const openaiData = await openaiResponse.json();
        const anthropicResponse = formatOpenAIToAnthropic(openaiData, openaiRequest.model);
        return new Response(JSON.stringify(anthropicResponse), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Not Found", { status: 404 });
  }
};

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Y6jVgK/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Y6jVgK/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
