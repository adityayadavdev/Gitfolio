# <img src="https://gitfolio.harmnix.com/og-default.png" width="100%" alt="Gitfolio Banner">

# 🚀 Gitfolio: The Professional Bridge from Code to Career

**Transform your raw GitHub activity into a quantified, recruiter-ready professional presence.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Explore_Gitfolio-blue?style=for-the-badge&logo=googlechrome)](https://gitfolio.harmnix.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/Frontend-React_19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Cloudflare](https://img.shields.io/badge/Backend-Cloudflare_Workers-f38020?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)

## 🎯 The Problem & The Solution

**The Problem**
Recruiters and hiring managers often spend less than 30 seconds scanning a GitHub profile. Raw commit history, \"green squares,\" and fragmented repositories fail to communicate the actual engineering depth, architectural decision-making, or the real-world impact of a developer's work.

**The Solution**
Gitfolio acts as a high-performance interpretation layer. It analyzes raw GitHub data to quantify skill depth, uses state-of-the-art AI to narrate technical contributions, and presents a curated, professional identity that speaks the language of recruiters.

---

## ✨ Core Capabilities

### 📊 Quantified Engineering Readiness
Moves beyond vanity metrics. Gitfolio provides an **Interview Readiness Score** by analyzing contribution quality, consistency, and language proficiency, giving developers a concrete benchmark of their marketability.

### 🤖 AI-Powered Technical Narrative
Leverages a multi-model AI orchestration (Claude & Llama) to transform cryptic commit messages into compelling project storytelling. It highlights the *how* and *why* behind the code, not just the *what*.

### 🌐 Edge-First Architecture
Built for global scale. By utilizing **Cloudflare Workers** and **KV Storage**, the platform ensures near-zero latency for portfolio visitors worldwide, removing traditional database bottlenecks.

### 🪪 Recruiter-Centric Artifacts
- **Public Profiles**: SEO-optimized, high-conversion portfolio pages.
- **Placement Cards**: Digital business cards highlighting top stats and technical wins.
- **PDF Exports**: Professional, high-fidelity documents for offline application submissions.

---

## 🏗️ Technical Deep Dive

Gitfolio is engineered for maximum performance and scalability, utilizing a modern serverless stack.

### The Architecture
`React 19 Frontend` $\rightarrow$ `Cloudflare Workers (Edge Runtime)` $\rightarrow$ `KV Storage (Global Cache)` $\rightarrow$ `GitHub GraphQL API`

### Engineering Highlights
- **Zero-Cold-Start Backend**: By deploying logic to the Edge via Cloudflare Workers, the API response time is minimized regardless of the user's location.
- **Efficient Data Fetching**: Implements GitHub's GraphQL API to fetch deeply nested contribution data in a single request, drastically reducing network overhead.
- **Modern UI/UX**: Built with **React 19** and **Framer Motion**, providing a fluid, app-like experience with professional animations.
- **AI Orchestration**: Implements a tiered fallback mechanism for LLMs to ensure 100% availability of AI-generated descriptions.

---

## 💻 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Lucide React |
| **Backend** | Cloudflare Workers (Serverless), KV Storage |
| **Intelligence** | Anthropic Claude, Llama (via OpenRouter/Cloudflare AI) |
| **APIs & Payments** | GitHub GraphQL/REST API, Razorpay |

---

## 🚀 Getting Started

### Local Installation
```bash
git clone https://github.com/adityayadavdev/Gitfolio.git
cd Gitfolio/gitfolio
npm install
npm run dev
```

### Environment Configuration
Create a `.env` file in the `gitfolio` directory:
```env
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_WORKER_URL=https://your-worker.workers.dev
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

---

## 🤝 Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any feature enhancements or bug fixes.

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
