# Claude Code via OpenRouter

一个基于 [y-router](https://github.com/luohy15/y-router) 开发的 API 转换服务，让您可以通过 OpenRouter 和其他 OpenAI 兼容的 API 提供商使用 Claude Code。

An API translation service based on [y-router](https://github.com/luohy15/y-router) that enables you to use Claude Code with OpenRouter and other OpenAI-compatible API providers.

## 功能特性 | Features

- 🔄 **API 格式转换**: 在 Anthropic Claude API 格式和 OpenAI API 格式之间进行双向转换
- 🌐 **多提供商支持**: 支持 OpenRouter、Moonshot 等多个 API 提供商
- 📡 **流式响应**: 完整支持流式和非流式响应
- 🛠️ **工具调用**: 完整支持 function calling 和 tool use
- 🚀 **一键安装**: 提供自动化安装脚本
- 🐳 **容器化部署**: 支持 Docker 和 Cloudflare Workers 部署

- 🔄 **API Format Translation**: Bidirectional translation between Anthropic Claude API format and OpenAI API format
- 🌐 **Multi-Provider Support**: Support for OpenRouter, Moonshot, and other API providers
- 📡 **Streaming Support**: Full support for both streaming and non-streaming responses
- 🛠️ **Tool Calling**: Complete support for function calling and tool use
- 🚀 **One-Click Install**: Automated installation script
- 🐳 **Containerized Deployment**: Support for Docker and Cloudflare Workers deployment

## 快速开始 | Quick Start

### 一键安装 | One-line Install (推荐 | Recommended)

```bash
bash -c "$(curl -fsSL https://cc.yovy.app/install.sh)"
```

此脚本将自动：
- 安装 Node.js（如需要）
- 安装 Claude Code
- 配置您的环境变量
- 设置 OpenRouter 或 Moonshot 提供商

This script will automatically:
- Install Node.js (if needed)
- Install Claude Code
- Configure your environment variables
- Set up OpenRouter or Moonshot providers

### 手动设置 | Manual Setup

**第一步 | Step 1:** 安装 Claude Code | Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

**第二步 | Step 2:** 获取 API 密钥 | Get API Key
- OpenRouter: [openrouter.ai](https://openrouter.ai)
- Moonshot: [platform.moonshot.ai](https://platform.moonshot.ai)

**第三步 | Step 3:** 配置环境变量 | Configure Environment Variables

将以下内容添加到您的 shell 配置文件（`~/.bashrc` 或 `~/.zshrc`）：
Add the following to your shell config file (`~/.bashrc` or `~/.zshrc`):

```bash
# 使用 OpenRouter | Using OpenRouter
export ANTHROPIC_BASE_URL="https://cc.yovy.app"
export ANTHROPIC_API_KEY="your-openrouter-api-key"

# 可选：指定模型 | Optional: Specify models
export ANTHROPIC_MODEL="anthropic/claude-sonnet-4"
export ANTHROPIC_SMALL_FAST_MODEL="anthropic/claude-3.5-haiku"
```

**第四步 | Step 4:** 重新加载配置并运行 | Reload config and run
```bash
source ~/.bashrc
claude
```

## 工作原理 | How It Works

本项目作为转换层，提供以下功能：
This project acts as a translation layer that:

- 📥 接收 Anthropic API 格式的请求（`/v1/messages`）
- 🔄 转换为 OpenAI 聊天完成格式
- 📤 转发到 OpenRouter（或任何 OpenAI 兼容的 API）
- 🔄 将响应转换回 Anthropic 格式
- 📡 支持流式和非流式响应

- 📥 Accepts requests in Anthropic's API format (`/v1/messages`)
- 🔄 Converts them to OpenAI's chat completions format
- 📤 Forwards to OpenRouter (or any OpenAI-compatible API)
- 🔄 Translates the response back to Anthropic's format
- 📡 Supports both streaming and non-streaming responses

## 部署选项 | Deployment Options

### 选项 1: Cloudflare Workers（推荐 | Recommended）

1. **克隆并部署 | Clone and deploy:**
   ```bash
   git clone https://github.com/crazygo/claudecode-via-openrouter.git
   cd claudecode-via-openrouter
   npm install -g wrangler
   wrangler deploy
   ```

2. **配置 Claude Code | Configure Claude Code:**
   - 设置 API 端点为您的 Worker URL
   - 使用您的 OpenRouter API 密钥
   - Set API endpoint to your Worker URL
   - Use your OpenRouter API key

### 选项 2: Docker 部署 | Docker Deployment

```bash
# 构建并运行 | Build and run
docker build -t claudecode-via-openrouter .
docker run -d -p 8787:8787 claudecode-via-openrouter

# 服务将在 http://localhost:8787 可用
# Service will be available at http://localhost:8787
```

## API 使用示例 | API Usage Example

向 `/v1/messages` 发送 Anthropic 格式的请求：
Send requests to `/v1/messages` using Anthropic's format:

```bash
curl -X POST https://cc.yovy.app/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-openrouter-key" \
  -d '{
    "model": "anthropic/claude-sonnet-4",
    "messages": [{"role": "user", "content": "你好，Claude！"}],
    "max_tokens": 100
  }'
```

## 支持的提供商 | Supported Providers

- **OpenRouter**: 访问多种 AI 模型 | Access to multiple AI models
- **Moonshot**: 支持 Kimi 系列模型 | Support for Kimi series models
- **其他 OpenAI 兼容提供商 | Other OpenAI-compatible providers**

## 配置示例 | Configuration Examples

### 多配置管理 | Multiple Configuration Management

使用别名管理不同的配置：
Use aliases to manage different configurations:

```bash
# OpenRouter 配置 | OpenRouter configuration
alias claude-or='ANTHROPIC_BASE_URL="https://cc.yovy.app" ANTHROPIC_API_KEY="your-or-key" claude'

# Moonshot 配置 | Moonshot configuration  
alias claude-ms='ANTHROPIC_BASE_URL="https://api.moonshot.ai/anthropic/" ANTHROPIC_API_KEY="your-ms-key" claude'
```

## GitHub Actions 集成 | GitHub Actions Integration

在工作流中使用：
Use in workflows:

```yaml
env:
  ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## 开发说明 | Development

### 本地开发 | Local Development

```bash
# 启动开发服务器 | Start development server
npm run dev

# 部署到 Cloudflare Workers | Deploy to Cloudflare Workers
npm run deploy
```

### 环境变量 | Environment Variables

- `OPENROUTER_BASE_URL`: 目标 API 的基础 URL（可选，默认为 `https://openrouter.ai/api/v1`）
- `OPENROUTER_BASE_URL`: Base URL for the target API (optional, defaults to `https://openrouter.ai/api/v1`)

## 致谢 | Acknowledgments

本项目基于 [@luohy15/y-router](https://github.com/luohy15/y-router) 开发，感谢原作者的出色工作。

This project is based on [@luohy15/y-router](https://github.com/luohy15/y-router). Thanks to the original author for the excellent work.

另外感谢以下项目的启发：
Also thanks to these inspiring projects:
- [claude-code-router](https://github.com/musistudio/claude-code-router)
- [claude-code-proxy](https://github.com/kiyo-e/claude-code-proxy)

## 免责声明 | Disclaimer

**重要法律声明 | Important Legal Notice:**

- **第三方工具 | Third-party Tool**: 本项目是独立的非官方工具，不隶属于 Anthropic PBC、OpenAI 或 OpenRouter，也未获得其认可或支持
- **服务条款 | Service Terms**: 用户有责任确保遵守所有相关方的服务条款
- **API 密钥责任 | API Key Responsibility**: 用户必须使用自己的有效 API 密钥，并对相关的使用、费用或违规行为承担全部责任
- **无保证 | No Warranty**: 本软件按"原样"提供，不提供任何保证
- **数据隐私 | Data Privacy**: 虽然本项目不会故意存储用户数据，但用户应查看所有连接服务的隐私政策

**请自行承担使用风险 | Use at your own risk and discretion.**

## 许可证 | License

MIT License

---

## 联系方式 | Contact

- 项目问题 | Issues: [GitHub Issues](https://github.com/crazygo/claudecode-via-openrouter/issues)
- 原项目 | Original Project: [@luohy15/y-router](https://github.com/luohy15/y-router)