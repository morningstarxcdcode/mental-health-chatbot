# Mochi.ai 🧠✨

Mochi.ai is a compassionate, AI-powered mental health companion designed to provide a safe, personalized, and stigma-free space for your thoughts. Built with a modern, secure, and scalable stack, Mochi.ai goes beyond generic chatbots by allowing you to create and interact with unique AI personas.



## Core Features

* **Secure Authentication:** Full user sign-up, sign-in, and management powered by **Clerk**.
* **Persistent Conversations:** All chat history is securely saved to your account. No more lost conversations on a page refresh.
* **Custom AI Personas:** Why talk to a generic bot?
    * **Create Your Own:** Define a persona's name, description, tone, custom greetings, and even conversational boundaries.
    * **Use Pre-mades:** Chat with familiar, pre-built characters like Doraemon, Shizuka, or Shinchan, each with a unique personality.
* **Mood Logging:** Track your mood over time with a simple logging feature.
* **Rich AI Responses:** The AI provides responses formatted with Markdown (bold, italics) for a more dynamic and expressive chat experience, all powered by the **Google Gemini API**.

---

## 💻 Tech Stack

* **Frontend:** **React (Vite)**, **Tailwind CSS**
* **Backend:** **FastAPI (Python)**
* **Database:** **MongoDB (Atlas)** for all user data, personas, and chat history.
* **Authentication:** **Clerk**
* **AI:** **Google Gemini API**

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

You will need to create accounts and get API keys from the following services:

1.  **Node.js:** (v18 or higher)
2.  **Python:** (v3.9 or higher)
3.  **MongoDB Atlas:** A free-tier cluster is sufficient.
    * Get your **MongoDB Connection String** (URI).
4.  **Google AI Studio:**
    * Get your **Gemini API Key**.
5.  **Clerk:**
    * Get your **Publishable Key** (for the frontend).
    * Get your **JWKS Endpoint URL** (for the backend).

### ⚙️ Configuration (Environment Variables)

This project has two separate `.env` files.

#### 1. Backend (`backend/.env`)

```.env
MONGO_URI="your_mongodb_connection_string_here"
GOOGLE_API_KEY="your_gemini_api_key_here"
CLERK_JWKS_URL="https://your-clerk-jwks-endpoint/.well-known/jwks.json"
```

#### 2. Frontend (`frontend/.env`)

```.env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_...your_publishable_key_here"
```

### Installation & Running 

#### 1. Backend Server (FastAPI)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 5. Install all dependencies
pip install -r requirements.txt

# 6. Run the server!
# --reload will automatically restart the server on code changes
uvicorn main:app --reload
```

#### 2. Frontend (React)
```bash

# 1. Navigate to the frontend directory
cd frontend

# 2. Install all npm packages
npm install

# 3. Run the development server
npm run dev

```