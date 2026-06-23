# ReelTruth - AI-Powered Video Claim & Influencer Evaluator

This is the complete, modern, fully-responsive **Next.js 14+ PWA** web application for **ReelTruth**. It has been designed specifically to evaluate Instagram Reels promotions, identify the products being shown (or fall back to Vision OCR via screenshot upload), cross-check promotional claims using Gemini, and compile real reviews in a unified aesthetic dashboard.

## 🚀 Quick Start (Local Development)

Follow these steps to run the web application locally:

1. **Extract the ZIP** file containing this Next.js project.
2. **Navigate** into the project folder:
   ```bash
   cd nextjs-app
   ```
3. **Install the dependencies**:
   ```bash
   npm install
   ```
4. **Set up your environment variables**:
   * Rename `.env.example` to `.env.local`
   * Add your Gemini API key:
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```
5. **Run the development server**:
   ```bash
   npm run dev
   ```
6. Open your browser and navigate to **`http://localhost:3000`**.

---

## ⚡ Deployment to Vercel

To deploy your companion website live to the web:

1. Push this `nextjs-app` repository folder to your **GitHub** account.
2. Log in to your [Vercel Dashboard](https://vercel.com).
3. Click **Add New > Project** and import your GitHub repository.
4. Expand **Environment Variables** and add:
   * **Key:** `GEMINI_API_KEY`
   * **Value:** *(Your Google Gemini API Key)*
5. Click **Deploy**. Vercel will build and provision your live website with a secure global URL instantly!

---

## 📱 Features Pre-Built
* **Mobile-First Responsive Layout:** Matches the precise look-and-feel of high-fidelity mobile PWA specifications with Material 3 spacing hierarchies.
* **Intelligent Product Identification & Sentiment Analyzer:** Auto-extracts product metadata or scans screenshot overlays using Gemini REST APIs when the scraper is bypassed.
* **Dynamic Claims Gating & Price Feeds:** Full interactive review logs, store discount deals, and recommended alternatives.
