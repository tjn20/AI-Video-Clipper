<h1 align="center">AI Educational Video Clipper</h1>
<img width="1840" height="911" alt="Image" src="https://github.com/user-attachments/assets/5bbc1d70-8303-402c-b8f8-aea8f1bc73ca" />
<img width="1913" height="910" alt="image" src="https://github.com/user-attachments/assets/43b83d10-a14e-4242-8012-9bb78c4a0488" />
<img width="1913" height="910" alt="Image" src="https://github.com/user-attachments/assets/94e42c0b-40ab-4657-a3c5-6c24a93c679d" />
<img width="1915" height="908" alt="Image" src="https://github.com/user-attachments/assets/9ec0cef8-c4d2-456b-b435-097b796e4bba" />
## 🌎 Introduction

This is a SaaS platform that automatically generates short educational clips from uploaded videos—including both podcasts and traditional video formats. Leveraging advanced AI models, the system detects and extracts viral educational moments, supporting a wide range of spoken languages through automatic audio language detection.

The platform produces clips in both vertical (reels-style) and standard formats. For each clip, it generates a concise title and a catchy description optimized for social media sharing. Captions are auto-generated and can be translated into English, French, or Arabic. Clip generation is credit-based, ensuring users only consume resources based on their available balance.

## 🔧 Features

- Supports podcasts and traditional educational videos
- Automatic detection of spoken language in audio
- Extracts key educational moments (questions, answers, concepts)
- Generates vertical reels-style and standard clips
- Creates titles and catchy captions for social media sharing
- Translates captions into English, French, and Arabic
- Active speaker detection for podcasts
- Clip generation based on user credits
- Secure user authentication with GitHub OAuth and traditional credentials
- Stripe payment and subscription integration
- Serverless GPU processing with local deployment option
- Background processing for efficient handling of tasks

## 📚 Tech Stack

- Next.js 15
- TypeScript
- React
- Tailwind CSS
- FastAPI
- Python
- Modal
- AWS (S3)
- Auth.js
- Stripe
- Inngest

## ⚖️ Setup & Usage

### 🚒 AWS S3 Configuration

#### CORS Policy

```json
[
  {
    "AllowedHeaders": ["Content-Type", "Content-Length", "Authorization"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

#### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "[S3 ARN here]"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "[S3 ARN here]/*"
    }
  ]
}
```

---

### 🤖 Clone the Repository

```bash
git clone https://github.com/tjn20/AI-Video-Clipper.git
```

---

## 🔹 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Inngest Queue

```bash
cd frontend
npx inngest-cli@latest dev
```

### 3. Stripe Webhook Listener

1. Create a product with pricing options (credit packs).
2. Add Stripe price IDs to `plans.json`.
3. Sync them to your database in the `creditsPlan` table.
4. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).

```bash
cd frontend
stripe listen --forward-to localhost:[PORT]/api/webhooks/stripe
```

Update `.env`:

```env
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🤖 Backend Setup

### 1. Install Python

- Requires **Python 3.12**.
- Create a virtual environment.
- Install requirements from `requirements.txt`.

```bash
pip install -r requirements.txt
```

---

### ⚡ Option A: Serverless GPU (Modal)

1. Set up [Modal](https://modal.com).
2. Choose GPU and update your code as needed.
3. Deploy your backend:

```bash
modal deploy app.py
```

---

### 🚨 Option B: Local Deployment with Docker

1. Create a FastAPI version of your Modal app code (e.g. convert `app.py` to use FastAPI routing instead of `@fastapi_endpoint`).

2. Place the converted FastAPI file in the `backend` folder.

3. Build the Docker image:

```bash
cd backend
docker build -t [TAG NAME] .
```

4. Run the container:

```bash
docker run --gpus all -p 8000:8000 --env-file [ENV FILE PATH] [TAG NAME]
```

> Make sure `.env` exists and contains all necessary environment variables.

---
