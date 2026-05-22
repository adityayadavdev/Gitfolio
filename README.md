# <img src="https://gitfolio.harmnix.com/og-default.png" width="100%" alt="Gitfolio Banner">

# 🚀 Gitfolio
**Transform your GitHub into a placement-ready portfolio.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare%20Workers-f38020)](https://workers.cloudflare.com/)

Gitfolio is a high-impact portfolio generator designed specifically for developers to bridge the gap between a raw GitHub profile and a professional, recruiter-ready portfolio. Targeting the competitive placement landscape (especially in India), Gitfolio analyzes your contributions, quantifies your skill depth, and generates a polished, shareable presence that highlights your best work.

---

## ✨ Why Gitfolio?

Most developers have great code on GitHub, but recruiters often lack the time to dig through repositories. Gitfolio does the heavy lifting for you:
- **Quantified Readiness**: Moves beyond "green squares" to provide an *Interview Readiness Score*.
- **AI-Driven Polish**: Uses LLMs to turn technical commit messages into compelling project descriptions.
- **Recruiter-Centric**: Generates concise "Placement Cards" and SEO-optimized public pages.
- **Job-Fit Analysis**: Directly matches your profile against real-world LinkedIn job descriptions.

---

## 🛠️ Key Features

- 🔐 **Secure GitHub Integration**: Seamless authentication via GitHub Device Flow.
- 📊 **Developer Analytics**: Deep-dive language proficiency, activity heatmaps, and skill-gap analysis.
- 🤖 **AI Enhancements**: Automated project storytelling using Claude and Llama.
- 📄 **PDF Export**: Professional, high-quality PDF portfolio for offline submissions.
- 🪪 **Placement Card**: A "digital business card" containing your top stats and links.
- 🌐 **Public Profiles**: Stunning, SEO-friendly portfolio pages with custom OG tags for social sharing.

---

## 💎 Feature Matrix

| Feature | Free | Premium |
| :--- | :---: | :---: |
| GitHub Profile Analysis | ✅ | ✅ |
| Readiness Score | ✅ | ✅ |
| Public Portfolio Page | ✅ | ✅ |
| AI Description Enhancements | Limited | Unlimited |
| Job Match Analyzer | ❌ | ✅ |
| High-Res PDF Export | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

---

## 🏗️ Technical Architecture

Gitfolio leverages a modern, serverless architecture for maximum scalability and speed:

`Client (React 19)` $\rightarrow$ `Edge Computing (Cloudflare Workers)` $\rightarrow$ `Data (KV Storage)` $\rightarrow$ `External APIs (GitHub GraphQL/REST)`

- **Frontend**: Built with Vite and React 19 for a lightning-fast UI, using Framer Motion for professional animations.
- **Backend**: Cloudflare Workers handle the business logic and API proxying, ensuring low-latency responses globally.
- **Storage**: Cloudflare KV for caching profile data and storing user preferences.
- **Intelligence**: Multi-model AI orchestration via Anthropic (Claude) and Llama.

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide React, Dexie.js
- **Backend**: Cloudflare Workers (Serverless), KV Storage
- **AI/ML**: Anthropic Claude, Llama (via Cloudflare AI/OpenRouter)
- **Payments**: Razorpay
- **APIs**: GitHub GraphQL & REST APIs

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- A GitHub OAuth App (for Client ID/Secret)
- A Cloudflare account

### Local Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gitfolio.git
   cd gitfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_GITHUB_CLIENT_ID=your_github_client_id
   VITE_WORKER_URL=https://your-worker.your-subdomain.workers.dev
   VITE_RAZORPAY_KEY_ID=your_razorpay_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

---

## 🌐 Deployment

### Frontend
The frontend can be deployed to any static hosting provider (Vercel, Netlify, Cloudflare Pages):
```bash
npm run build
# Deploy the 'dist' folder
```

### Backend (Cloudflare Workers)
1. Install Wrangler CLI: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy: `wrangler deploy`

---

## 🔑 Environment Variables

| Variable | Description | Required |
| :--- | :--- | :---: |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth Application Client ID | Yes |
| `VITE_WORKER_URL` | URL of the deployed Cloudflare Worker | Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay API Key for payments | Yes |
| `GITHUB_TOKEN` | Secret token for worker-side API calls | Yes |
| `AI_API_KEY` | API Key for Claude/OpenRouter | Yes |
| `KV_NAMESPACE` | Cloudflare KV namespace ID | Yes |

---

## 🤝 Contributing

We welcome contributions to make Gitfolio better! 

1. **Fork** the repository.
2. **Create a feature branch**: `git checkout -b feature/AmazingFeature`.
3. **Commit your changes**: `git commit -m 'Add some AmazingFeature'`.
4. **Push to the branch**: `git push origin feature/AmazingFeature`.
5. **Open a Pull Request**.

Please ensure your code follows the existing style guide and includes tests for new functionality.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
