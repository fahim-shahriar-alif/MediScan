# MediScan: An AI-Powered Intelligent Healthcare Navigator Web Application

---

**Course:** CSE 309 — Web Technologies  
**Submission Type:** Academic Project Report  
**Development Status:** In Development (Partial Implementation)  
**Submission Date:** April 2026

---

## Authors

| Name | Student ID | Email |
|---|---|---|
| Fahim Shahriar Alif | 2221079 | 2221079@iub.edu.bd |

**Institution:** Independent University, Bangladesh (IUB), Dhaka, Bangladesh

---

## Abstract

MediScan is a web-based intelligent healthcare navigation platform designed to bridge the gap between patients and medical services through the application of artificial intelligence and modern cloud technologies. The growing complexity of medical reports, the difficulty of identifying appropriate specialists, and the high cost of brand-name medicines are persistent challenges faced by patients, particularly in developing countries such as Bangladesh. MediScan addresses these challenges through a suite of AI-powered tools accessible through a responsive web interface.

The system enables users to upload medical reports in PDF or image format for automated Optical Character Recognition (OCR) and structured health analysis. An interactive symptom checker allows patients to describe their symptoms using a body map interface and receive AI-generated assessments with urgency ratings and condition probabilities. A real-time specialist directory, populated and managed by hospital administrators, connects patients with relevant doctors and supports appointment booking with a confirmation workflow. A generic medicine finder allows users to search by name or scan medicine packaging using the device camera, receiving information on active ingredients, dosage, side effects, and affordable generic alternatives with estimated prices in Bangladeshi Taka (BDT). A context-aware AI health chat widget is available on every page, providing personalized responses based on the user's most recent health data.

The platform is built on a three-tier architecture: a vanilla JavaScript/HTML/CSS frontend deployed on Netlify, a Node.js/Express REST API backend deployed on Render that securely proxies all AI inference calls, and Google Firebase providing authentication and a NoSQL Firestore database. A separate role-restricted admin panel, deployed independently, allows hospital administrators to manage the doctor directory, confirm or cancel patient appointments, and monitor platform-wide activity statistics.

This report describes the system requirements, design decisions, implementation methodology, key features, current development status, and planned future enhancements of MediScan.

**Keywords:** healthcare web application, artificial intelligence, large language model, OCR, symptom analysis, Firebase, Firestore, REST API, Express.js, specialist recommendation, medicine finder, admin panel, serverless architecture, Bangladesh

---

## 1. Introduction

### 1.1 Background and Motivation

Healthcare accessibility is a multifaceted problem that extends beyond physical access to hospitals and clinics. Even when medical services are available, patients frequently encounter barriers in understanding their own health data. A patient who receives a blood test report showing elevated SGPT levels, for example, may not understand what that means, which specialist to consult, or how urgently they need to act. Similarly, a patient prescribed a brand-name medicine may be unaware that a significantly cheaper generic equivalent is available at their local pharmacy.

In Bangladesh, these challenges are compounded by a shortage of general practitioners who can guide patients through the healthcare system, high out-of-pocket medical costs, and limited digital health infrastructure. The COVID-19 pandemic further accelerated the need for remote health information tools, as patients sought ways to assess their symptoms and access medical guidance without visiting crowded facilities.

MediScan was conceived as a response to these challenges — a web-based platform that uses artificial intelligence to democratize access to health information, help patients navigate the healthcare system, and reduce the friction between receiving a medical report and taking appropriate action.

### 1.2 Problem Statement

The specific problems MediScan addresses are:

1. **Medical report interpretation:** Patients receive lab reports, blood work, and microbiology results that contain technical terminology and reference ranges they cannot interpret without medical training.
2. **Symptom assessment:** Patients are often uncertain whether their symptoms warrant an urgent visit to a doctor or can be managed at home.
3. **Specialist identification:** Even when patients know they need a specialist, identifying the correct type of specialist for their condition is non-trivial.
4. **Appointment friction:** Booking appointments with specialists typically requires phone calls, manual scheduling, and no digital confirmation trail.
5. **Medicine costs:** Patients are often unaware of generic alternatives to expensive brand-name medicines, leading to unnecessary healthcare expenditure.
6. **Administrative overhead:** Hospital administrators lack a centralized digital tool to manage their doctor directory, patient appointments, and platform activity.

### 1.3 Objectives

The primary objectives of MediScan are:

1. To allow patients to upload medical reports (blood tests, imaging results, microbiology reports) and receive plain-language AI analysis with disease detection and actionable next steps.
2. To provide an interactive symptom checker that assesses severity and recommends appropriate specialist types.
3. To connect patients with verified medical specialists sourced from a live database and facilitate appointment booking with a digital confirmation workflow.
4. To offer a generic medicine finder that identifies affordable alternatives to brand-name medicines, including camera-based OCR for scanning medicine packaging.
5. To provide an AI health chat assistant that answers patient questions in the context of their personal health data.
6. To provide hospital administrators with a centralized management panel for overseeing platform activity, managing doctors, and confirming appointments.

### 1.4 Scope

MediScan is a web application targeting patients and hospital administrators in Bangladesh. The current implementation covers the patient-facing features and the admin panel as described above. The system does not provide real-time telemedicine, does not integrate with electronic health record (EHR) systems, and does not store medical images on the server. All AI-generated content is clearly labeled as informational and not a substitute for professional medical advice.

### 1.5 Report Structure

This report is structured as follows: Section 2 reviews related work in AI healthcare applications, OCR, symptom checkers, and web architectures. Section 3 describes the system architecture, technology stack, database design, security model, and development methodology. Section 4 presents the implemented features and performance observations. Section 5 discusses design decisions, limitations, and ethical considerations. Section 6 concludes with a summary and outlines planned future enhancements. The Appendix provides the project file structure, API reference, Firestore security rules, and deployment URLs.

---

## 2. Related Work / Literature Review

### 2.1 AI in Healthcare Web Applications

The application of machine learning and natural language processing to healthcare has grown substantially over the past decade. Landmark systems such as IBM Watson Health demonstrated early viability of AI for clinical decision support, while Google's DeepMind achieved ophthalmologist-level accuracy in retinal disease detection [1]. However, these systems are typically enterprise-grade, require significant infrastructure investment, and are inaccessible to general consumers or small healthcare providers.

More recently, the emergence of large language models (LLMs) such as GPT-4, Llama, and Gemini has opened new possibilities for consumer-facing health applications. These models can process natural language descriptions of symptoms, interpret structured medical data, and generate coherent, contextually appropriate health guidance. MediScan leverages this capability through the Groq-hosted Llama 3.3 70B and Llama 4 Scout models, targeting the consumer segment with a lightweight, browser-based approach that requires no specialized hardware or software installation.

### 2.2 OCR for Medical Document Processing

Optical Character Recognition applied to medical documents has been an active area of research. Early approaches used Tesseract-based pipelines to digitize printed lab reports, requiring separate preprocessing steps for image enhancement, text segmentation, and entity extraction [2]. These pipelines are brittle in the presence of varied document layouts, handwriting, or low-quality scans.

More recent work leverages multimodal large language models that can simultaneously read and interpret document images without explicit OCR preprocessing. Models such as GPT-4 Vision and Llama 4 Scout can extract structured information from medical report images in a single inference call, identifying test names, values, units, and reference ranges while also providing clinical interpretation. MediScan adopts this approach, sending the base64-encoded report image to the Groq API and receiving a fully structured JSON analysis response. This eliminates the need for a separate OCR service and reduces both latency and infrastructure complexity.

### 2.3 Symptom Checkers and AI Triage

Consumer-facing symptom checkers have been available since the early 2000s, with systems such as WebMD's Symptom Checker, Ada Health, and Babylon Health demonstrating significant user demand for AI-assisted triage tools [3]. A 2015 BMJ study evaluated 23 symptom checkers and found that they listed the correct diagnosis first in 34% of cases and within the top 20 in 58% of cases — comparable to telephone triage nurses in some scenarios.

Traditional symptom checkers use rule-based decision trees or Bayesian probabilistic models. More recent systems, including MediScan, use generative LLMs to produce nuanced, context-aware assessments. The advantage of the LLM approach is that it can handle free-text descriptions, account for combinations of symptoms that rule-based systems may not anticipate, and generate natural-language explanations that patients can understand. The limitation is that LLM outputs are probabilistic and may occasionally produce plausible-sounding but incorrect assessments, which is why MediScan includes prominent disclaimers and always recommends professional consultation.

### 2.4 Specialist Recommendation Systems

Recommender systems for healthcare providers have been studied in the context of insurance network navigation, geographic proximity optimization, and specialty matching based on diagnosis codes [4]. These systems typically rely on structured databases of provider information and patient diagnosis histories.

MediScan takes a hybrid approach: the AI generates a list of recommended specialty types based on the patient's health data, and these recommendations are then matched against a live Firestore database of doctors maintained by hospital administrators. This approach is more flexible than a purely rule-based system and more reliable than a purely AI-generated list, as the doctor database reflects actual available providers rather than hypothetical recommendations.

### 2.5 Generic Medicine Information Systems

Access to information about generic medicines is a significant public health issue. The World Health Organization estimates that generic medicines can cost 20–90% less than their brand-name equivalents, yet many patients are unaware of available alternatives [6]. Existing systems such as Drugs.com and the FDA's Orange Book provide generic medicine information, but these are primarily US-focused and lack APIs suitable for integration into consumer applications.

MediScan uses an LLM to generate generic medicine information, including active ingredients, dosage forms, side effects, and estimated prices in BDT. While this approach is less authoritative than a verified pharmaceutical database, it provides a practical solution for the Bangladesh market where no comprehensive public API exists. The system clearly labels all medicine information as AI-estimated and recommends verification with a pharmacist.

### 2.6 Serverless and BaaS Architectures for Healthcare Applications

Backend-as-a-Service (BaaS) platforms such as Firebase have been widely adopted for rapid web application development, particularly in resource-constrained environments [5]. Firebase Authentication provides OAuth 2.0-compliant identity management supporting multiple providers (Google, email/password, GitHub), while Cloud Firestore offers a scalable NoSQL document database with real-time synchronization and fine-grained security rules.

The combination of a BaaS data layer with a custom REST API server represents a pragmatic architecture for applications that require both the convenience of managed services and the control of custom business logic. MediScan uses Firebase for authentication and data persistence while delegating AI inference to a custom Express.js server, ensuring that sensitive API keys are never exposed to the browser and that the AI pipeline can be updated independently of the frontend.

---

## 3. Methodology

### 3.1 System Architecture

MediScan follows a three-tier client-server architecture that cleanly separates presentation, business logic, and data concerns. This separation provides several benefits: the frontend can be updated independently of the backend, the backend can be scaled independently of the database, and security boundaries are clearly defined.

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT TIER                          │
│  HTML / CSS / Vanilla JS (ES Modules)                   │
│  Deployed: Netlify (mediscanbd.netlify.app)             │
│  Pages: 14 HTML pages, 15 JS modules, 12 CSS files      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (JSON)
┌──────────────────────▼──────────────────────────────────┐
│                   SERVER TIER                           │
│  Node.js 18 + Express.js 4 REST API                     │
│  Deployed: Render (mediscan-gf5j.onrender.com)          │
│  Endpoints: /api/analyze, /api/symptoms, /api/chat,     │
│             /api/medicine, /api/ocr, /api/specialists   │
│  CORS: restricted to Netlify frontend domain            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (Groq API) / Firebase Admin SDK
┌──────────────────────▼──────────────────────────────────┐
│                    DATA TIER                            │
│  Google Firebase (Project: mediscan-5534e)              │
│  ├── Firebase Authentication                            │
│  │   └── Google OAuth 2.0, Email/Password               │
│  ├── Cloud Firestore (NoSQL document database)          │
│  │   └── Collections: users, doctors, admins            │
│  └── Groq API (External AI Service)                     │
│      └── Llama 3.3 70B (text), Llama 4 Scout (vision)  │
└─────────────────────────────────────────────────────────┘
```

The frontend communicates exclusively with the Express backend for all AI operations. The backend holds the Groq API key as a server-side environment variable and never exposes it to the browser. Firebase operations (authentication state, Firestore reads/writes) are performed directly from the frontend using the Firebase JavaScript SDK, as these are protected by Firebase Security Rules rather than API keys.

### 3.2 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | HTML5, CSS3 | — | Markup and styling |
| Frontend | Vanilla JavaScript (ES Modules) | ES2022 | Client-side logic |
| Backend | Node.js | 18.x | Server runtime |
| Backend | Express.js | 4.19 | HTTP framework and routing |
| Backend | node-fetch | 3.x | HTTP client for Groq API calls |
| Backend | dotenv | 16.x | Environment variable management |
| Backend | cors | 2.8 | Cross-origin request handling |
| Database | Google Cloud Firestore | — | NoSQL document storage |
| Authentication | Firebase Authentication | 10.12 | Identity management |
| AI/LLM | Groq API — Llama 3.3 70B | — | Text analysis, chat, symptoms |
| AI/LLM | Groq API — Llama 4 Scout | — | Multimodal image/OCR analysis |
| PDF Generation | jsPDF | 2.5.1 | Client-side PDF report generation |
| Frontend Hosting | Netlify | — | Static site deployment |
| Backend Hosting | Render | — | Node.js server deployment |
| Version Control | Git / GitHub | — | Source code management |

The decision to use vanilla JavaScript rather than a framework such as React or Vue was deliberate. It minimizes build complexity, eliminates dependency management overhead, and demonstrates proficiency with core web platform APIs. JavaScript ES Modules (`type="module"`) provide code organization and encapsulation without requiring a bundler.

### 3.3 Database Design

Cloud Firestore uses a hierarchical document-collection model. Documents are JSON-like objects stored within collections, and collections can be nested within documents as sub-collections. MediScan's data model is designed around the `users/{userId}` hierarchy, ensuring that each patient's data is isolated under their unique Firebase Authentication UID.

#### 3.3.1 Top-Level Collections

**`users/{userId}`** — Patient profile documents, created or updated on every sign-in:
```json
{
  "displayName": "Fahim Ahmed",
  "email": "fahim@example.com",
  "phone": "+880 1700-000000",
  "provider": "google.com",
  "photoURL": "https://...",
  "createdAt": "2026-04-23T...",
  "lastSeen": Timestamp
}
```

**`doctors/{doctorId}`** — Specialist directory, managed exclusively by admins:
```json
{
  "name": "Dr. Mahmudul Hasan",
  "specialty": "Gastroenterologist",
  "address": "33 Farmgate, Dhaka",
  "phone": "+880 1724-100028",
  "rating": 3.2,
  "reviews": 43
}
```

**`admins/{userId}`** — Role documents for admin panel access:
```json
{
  "role": "admin",
  "name": "Admin User",
  "email": "admin@mediscan.health",
  "createdAt": Timestamp
}
```

#### 3.3.2 User Sub-Collections

Each `users/{userId}` document contains the following sub-collections:

**`appointments/{appointmentId}`** — Appointment records:
```json
{
  "patientName": "Fahim Ahmed",
  "patientEmail": "fahim@example.com",
  "doctorName": "Dr. Mahmudul Hasan",
  "specialty": "Gastroenterologist",
  "address": "33 Farmgate, Dhaka",
  "date": "2026-04-25T00:00:00.000Z",
  "timeLabel": "10:00 AM",
  "confirmationNumber": "MS-AB12CD34",
  "status": "pending",
  "savedAt": Timestamp
}
```

**`analyses/{analysisId}`** — Medical report analysis results (full AI response JSON)

**`symptoms/{symptomId}`** — Symptom check results and input data

**`history/{historyId}`** — Activity timeline entries linking to analyses, appointments, and symptom checks

### 3.4 Security Model

Security is enforced at two levels: Firestore Security Rules (database level) and CORS configuration (API level).

#### 3.4.1 Firestore Security Rules

The security rules implement the principle of least privilege:

```javascript
// Patients can only access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  allow read: if isAdmin();
}

// Admin role verification function
function isAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

// Doctors: anyone authenticated can read; only admins can write
match /doctors/{doctorId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

// Cross-user admin access via CollectionGroup queries
match /{path=**}/appointments/{appointmentId} {
  allow read, write: if isAdmin();
}
```

This ensures that a patient cannot access another patient's health data, that the doctor directory can only be modified by verified admins, and that the admin panel can perform cross-user queries using Firestore's `collectionGroup()` API.

#### 3.4.2 API Key Security

The Groq API key is stored as an environment variable (`GROQ_API_KEY`) on the Render server and is injected at build time via the `dotenv` package. It is never included in any response sent to the browser. The Express server validates that the key is present on startup and logs a warning if it is missing.

#### 3.4.3 CORS Policy

The Express server's CORS configuration restricts cross-origin requests to the Netlify frontend domain (`mediscanbd.netlify.app`) and local development origins. This prevents unauthorized third-party websites from making requests to the API.

#### 3.4.4 User Data Isolation in localStorage

Health data stored in the browser's localStorage (analysis results, symptom data) is keyed by the user's Firebase UID (e.g., `analysisResult_abc123`). This prevents cross-user data leakage when multiple users share the same browser, a scenario that was identified and fixed during development.

### 3.5 REST API Design

The Express backend follows RESTful conventions with JSON request/response bodies. All endpoints use the POST method for data submission (except the health check) and return a consistent response envelope:

```json
{
  "ok": true,
  "result": { ... }
}
```

or on error:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

| Method | Endpoint | Request Body | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, service, timestamp }` |
| POST | `/api/analyze` | `{ image: base64, mimeType }` | `{ ok, result: AnalysisResult }` |
| POST | `/api/symptoms` | `{ symptoms[], bodyAreas[], severity, duration, otherSymptoms, existingConditions }` | `{ ok, result: SymptomResult }` |
| POST | `/api/chat` | `{ messages[], systemPrompt }` | `{ ok, reply: string }` |
| POST | `/api/medicine` | `{ medicineName }` | `{ ok, result: MedicineResult }` |
| POST | `/api/ocr` | `{ image: base64, mimeType }` | `{ ok, medicineName: string \| null }` |
| POST | `/api/specialists` | `{ context: string }` | `{ ok, result: SpecialistRecommendation }` |

Each endpoint constructs a carefully engineered prompt for the Groq API, specifying the exact JSON schema expected in the response. The `response_format: { type: 'json_object' }` parameter is used where supported to ensure structured output.

### 3.6 Frontend Architecture

The frontend is organized as a multi-page application (MPA) with 14 HTML pages, each loading the relevant JavaScript modules via `<script type="module">`. A shared `nav.js` module is included on every page and handles:

- Active navigation link highlighting based on the current URL
- Auth-aware navbar rendering (Sign In / Get Started for guests; avatar dropdown for logged-in users)
- Profile dropdown with sign-out functionality
- Injection of the floating AI chat widget for authenticated users

The authentication flow uses Firebase's `onAuthStateChanged` listener to detect session state. Protected pages call `requireAuth()` which redirects unauthenticated users to the login page, storing the intended destination in `sessionStorage` for post-login redirect.

### 3.7 Admin Panel Architecture

The admin panel is a separate web application deployed independently on Netlify (`mediscanadmin.netlify.app`). It shares the same Firebase project but uses its own JavaScript modules (`admin-auth.js`, `admin-db.js`) that verify the admin role before allowing access. The admin panel uses Firestore's `collectionGroup()` API to query appointments, analyses, and symptoms across all users — a capability that is restricted to admin-verified users by the security rules.

### 3.8 Development Process

The project was developed iteratively over approximately six weeks, with features implemented in the following order:

1. **Week 1:** Project setup, Firebase configuration, authentication system (email/password, Google OAuth), basic navigation
2. **Week 2:** Medical report upload interface, AI analysis pipeline (initially direct Groq calls), analysis results page with PDF download
3. **Week 3:** Symptom checker with body map, symptom confirmation flow, results page
4. **Week 4:** Specialist finder with Firestore integration, appointment scheduling calendar, booking confirmation
5. **Week 5:** Admin panel (dashboard, appointments, patients, doctors CRUD), health history timeline, profile page
6. **Week 6:** Generic medicine finder with camera OCR, AI health chat widget, Express.js backend migration, security hardening, bug fixes

---

## 4. Results / Findings

### 4.1 Implemented Features

#### 4.1.1 User Authentication and Profile Management

The authentication system supports two sign-in methods: email/password registration and Google OAuth 2.0. Both methods are handled by Firebase Authentication, which manages token issuance, session persistence, and secure credential storage.

On every successful sign-in — whether via email/password, Google OAuth, or session restoration — the system calls `syncUserToFirestore()`, which performs a `setDoc` with `merge: true` on the `users/{uid}` document. This ensures that the admin panel can enumerate all registered patients, including those who signed up before the Firestore sync was implemented. The `createdAt` field is only written on the first sign-in (when the document does not yet exist), preserving the original registration date.

The profile page allows users to update their display name and add a phone number. The phone number is stored in Firestore and displayed in the admin panel's patient list, enabling administrators to contact patients for appointment confirmations. The profile page also displays activity statistics (reports analyzed, symptom checks, appointments) loaded from Firestore sub-collection counts.

#### 4.1.2 Medical Report Upload and AI Analysis

The upload page provides two input methods: drag-and-drop file upload and live camera capture. Supported formats are PDF, JPEG, and PNG, with a maximum file size of 10 MB per file. Multiple files can be selected simultaneously, with the primary file (first selected) used for AI analysis.

The analysis pipeline works as follows:
1. The selected file is read as a Data URL using the `FileReader` API.
2. The base64-encoded image data is sent via POST to `/api/analyze` on the Express server.
3. The server constructs a multimodal prompt and sends the image to the Groq Llama 4 Scout vision model.
4. The model returns a structured JSON response containing the analysis.
5. The result is saved to Firestore under `users/{uid}/analyses/` and to localStorage under a user-scoped key.
6. The user is redirected to the analysis results page.

The analysis results page displays:
- An "AI Health Insight" card with the overall status badge, plain-language summary, and recommended next steps
- A key metrics grid showing each test result with its value, unit, status badge, normal range, and a color-coded progress bar
- An "Other Test Results" table for secondary metrics
- A "Disease Detection" section listing potential conditions with likelihood ratings and urgency levels
- A sidebar with the report filename, analysis date, and an animated confidence score ring
- A "Find Specialists" CTA button that sets a session flag to enable context-aware specialist recommendations

Users can download a professionally formatted PDF summary of their analysis using the jsPDF library, which generates a multi-page document with the MediScan branding, patient information, all metrics, and a medical disclaimer.

#### 4.1.3 Symptom Checker

The symptom checker is a multi-step flow consisting of three pages: symptom input, confirmation, and results.

On the symptom input page, users interact with an anatomical SVG body map to select affected body regions (head, chest, abdomen, left/right arms, left/right legs). They then select from 15 common symptoms presented as toggle chips (Headache, Fever, Fatigue, Nausea, etc.), rate their pain level on a 0–10 slider with descriptive labels, select a duration (< 24 hours, 2–3 days, 1 week, chronic), and optionally add free-text notes and pre-existing conditions.

The confirmation page displays a summary of the entered data and presents a medical disclaimer before proceeding. On confirmation, the data is sent to `/api/symptoms`, which constructs a detailed patient report prompt and queries the Llama 3.3 70B model.

The results page displays a color-coded urgency banner (green for low, yellow for medium, red for high), followed by condition cards showing each possible diagnosis with a match percentage bar, description, and specific recommendations. The sidebar shows the patient's symptom tags, pain level bar, and a "Find a Specialist" button that passes the symptom context to the specialist page.

#### 4.1.4 Specialist Finder with AI Matching

The specialists page fetches all doctors from the Firestore `doctors` collection in real time. When accessed from the analysis or symptom flow (indicated by a `sessionStorage` flag set by the referring page), the system also calls `/api/specialists` with the patient's health context to generate specialty recommendations.

The matching algorithm compares the AI-recommended specialty types against each doctor's specialty field using case-insensitive substring matching. Matching doctors are assigned a `_relevance` score of 1 and sorted to the top of the list with "⭐ AI Recommended" badges and "Why recommended" explanations. Non-matching doctors are shown below with a "Show all X doctors" button.

A search bar allows real-time filtering by doctor name, specialty, or address. The search is performed client-side on the loaded doctor list, avoiding additional Firestore reads.

When a patient clicks "Book Appointment," the selected doctor object is saved to localStorage and the user is redirected to the scheduling page. If the user is not authenticated, a login prompt modal is shown instead.

#### 4.1.5 Appointment Scheduling and Booking

The scheduling page displays a week-strip calendar showing 7 days at a time, with past dates disabled and today highlighted. Users can navigate between weeks using previous/next buttons. Time slots are organized into morning (8:00 AM – 11:30 AM), afternoon (12:00 PM – 4:00 PM), and evening (4:30 PM – 8:30 PM) groups, with some slots pre-marked as unavailable.

When both a date and time slot are selected, a "Ready to Book" card appears in the sidebar showing the selected date and time. Clicking "Review & Confirm Appointment" opens a modal dialog with the full appointment details, a Google Maps directions link, and a "Confirm & Book Appointment" button.

On confirmation, a unique confirmation number is generated (format: `MS-XXXXXXXX` using alphanumeric characters), and the appointment is saved to Firestore with `status: 'pending'`. The patient is redirected to the appointment confirmed page showing the confirmation code and appointment details. The appointment is only marked as `'confirmed'` after an administrator reviews and confirms it in the admin panel.

#### 4.1.6 Health History Timeline

The health history page displays a chronological timeline of all the user's health activities, loaded from the `users/{uid}/history/` sub-collection in Firestore. Each timeline entry shows a type-specific icon (document for scans, calendar for appointments, waveform for symptom checks), a color-coded badge, the date, title, description, and a "View Details" link.

The page also shows summary statistics: total scans, total appointments, and total health checks. If no history exists, an empty state is shown with a prompt to upload the first report.

#### 4.1.7 Generic Medicine Finder

The medicine finder page provides two input methods: text search and image scan.

For text search, users type a medicine name (brand or generic) and click "Find Generic." Quick-search chips for common medicines (Napa, Amoxil, Losartan, Metformin, Omeprazole) are provided for convenience. The query is sent to `/api/medicine`, which returns a structured response.

For image scan, users can either open the device camera (using `navigator.mediaDevices.getUserMedia`) or upload an image file. The captured or uploaded image is sent to `/api/ocr`, which uses the Llama 4 Scout vision model to extract the medicine name from the packaging. The extracted name is automatically populated in the search field and the search is triggered.

Results are displayed in a card layout showing:
- An overview card (dark background) with the brand name, generic name, active ingredient, drug class, dosage form badge, and Rx/OTC indicator
- Uses, standard dosage, common side effects, and warnings in a 2×2 grid
- A generic alternatives section with 3–5 alternatives showing manufacturer, estimated BDT price, and a "Best Value" badge on the first result
- A disclaimer noting that prices are AI-estimated

#### 4.1.8 AI Health Chat Widget

A floating chat bubble (blue circle with a chat icon) is injected into every authenticated page by `chat-widget.js`, which is loaded via `nav.js`. The widget is implemented as an IIFE (Immediately Invoked Function Expression) to avoid top-level `return` issues with ES modules.

On first open, the widget loads the user's latest analysis result and symptom data from localStorage (using user-scoped keys to prevent cross-user leakage) and constructs a system prompt that includes the patient's health context. This allows the AI to provide personalized responses — for example, explaining what an elevated SGPT level means in the context of the patient's specific test results.

The chat maintains a conversation history of the last 8 messages, which is sent with each request to `/api/chat` to maintain conversational context. Suggested questions are dynamically generated based on the patient's health data (e.g., "What does elevated SGPT mean?" if the patient has an elevated SGPT result).

#### 4.1.9 Admin Panel

The admin panel is a separate web application with four authenticated pages:

**Dashboard:** Displays four stat cards showing total registered patients, total appointments, total medical scans, and total symptom checks. Statistics are computed from Firestore CollectionGroup queries that span all users.

**Appointments:** A searchable table of all appointments across all patients, ordered by date descending. Each row shows the patient name, doctor name, date, time, confirmation code, and a color-coded status badge (yellow for pending, green for confirmed, red for cancelled). Administrators can confirm or cancel appointments with a single click, updating the Firestore document status in real time.

**Patients:** A searchable table of all registered patients showing display name, email, phone number, join date, appointment count, scan count, and symptom check count. Sub-collection counts are loaded per patient from Firestore.

**Doctors:** A card grid of all doctors in the `doctors` collection with full CRUD operations. Administrators can add new doctors via a form, edit existing doctors via a modal, and remove doctors with a confirmation prompt. Changes are reflected immediately in the grid without a page reload and are synchronized to the patient-facing specialist page in real time.

### 4.2 Performance Observations

During testing, the following performance characteristics were observed:

- **Report analysis latency:** 3–8 seconds from file selection to results display, dependent on Groq API response time and image size. The loading overlay with a spinner is shown during this period.
- **Symptom analysis latency:** 2–4 seconds for the Llama 3.3 70B text model.
- **Medicine finder latency:** 2–5 seconds per query.
- **Firestore reads:** Sub-second for typical document and collection queries.
- **Render cold start:** Up to 50 seconds on the free tier after a period of inactivity, as Render spins down idle services. This is a known limitation of the free hosting tier.
- **Netlify deployment:** Approximately 30–60 seconds for a full rebuild triggered by a GitHub push.

### 4.3 Security Findings

The following security properties were verified during development:

- The Groq API key is not present in any response from the server or in any client-side JavaScript file.
- Firestore Security Rules correctly reject read/write attempts by unauthenticated users and by authenticated users attempting to access other users' data.
- The admin panel correctly rejects sign-in attempts by non-admin users, displaying "Access denied. Admin privileges required."
- User health data in localStorage is scoped to the user's UID, preventing data leakage when multiple users share a browser session.
- The Express server returns CORS errors for requests from unauthorized origins.

---

## 5. Discussion

### 5.1 Design Decisions and Rationale

#### 5.1.1 Vanilla JavaScript over a Framework

The decision to use plain HTML, CSS, and JavaScript ES Modules rather than a framework such as React, Vue, or Angular was made for several reasons. First, it minimizes build complexity — there is no webpack, Vite, or Babel configuration to maintain, and the application can be deployed by simply uploading the files to a static host. Second, it demonstrates proficiency with core web platform APIs, which is more instructive in an academic context than framework-specific abstractions. Third, it reduces the dependency surface area, making the codebase easier to audit and understand.

The trade-off is that as the application grows, the lack of a component model and reactive state management makes the code increasingly difficult to maintain. A production version of MediScan would benefit from migrating to a framework such as React or SvelteKit.

#### 5.1.2 Groq API over OpenAI

Groq's free tier and exceptionally fast inference speeds (leveraging custom Language Processing Unit hardware) made it the practical choice for a student project with no budget. The Llama 3.3 70B model provides high-quality medical text analysis comparable to GPT-3.5, while Llama 4 Scout handles multimodal image analysis. The trade-off is that Groq's free tier has rate limits and the API key must be rotated periodically.

#### 5.1.3 Firebase as the Primary Data Layer

Firebase eliminates the need for a custom authentication server, database server, and connection pooling infrastructure. The Firebase JavaScript SDK handles token refresh, offline caching, and real-time synchronization automatically. The trade-off is vendor lock-in — migrating away from Firebase would require rewriting the authentication and database layers. Additionally, Firestore's security rules language has a learning curve and can be difficult to debug.

#### 5.1.4 Express.js Proxy Server

The decision to add a custom Express.js backend was driven by two requirements: security (preventing API key exposure in the browser) and the academic requirement for a custom backend implementation. The proxy pattern is a well-established approach for protecting third-party API keys in client-side applications. The server also provides a natural extension point for future features such as rate limiting, request logging, and caching.

#### 5.1.5 Appointment Status Workflow

The decision to save new appointments with `status: 'pending'` rather than `status: 'confirmed'` reflects a realistic healthcare workflow where appointments must be verified by the clinic before they are confirmed. This design gives the admin panel a meaningful role in the appointment lifecycle and prevents patients from assuming their appointment is confirmed before the clinic has acknowledged it.

### 5.2 Challenges Encountered

#### 5.2.1 Cross-User Data Leakage

An early version of the system stored health data in localStorage under generic keys (`analysisResult`, `symptomResult`). When a second user logged in on the same browser, the AI chat widget would load the previous user's health data and present it as the current user's context. This was resolved by scoping all localStorage keys to the user's Firebase UID (e.g., `analysisResult_abc123`) and clearing unscoped keys on sign-out.

#### 5.2.2 GitHub Secret Scanning

When the Groq API key was committed to the repository in `config.js`, GitHub's secret scanning feature blocked the push. This was resolved by removing `config.js` from version control (adding it to `.gitignore`), storing the API key as a Netlify environment variable, and generating `config.js` at build time using a `build-config.js` script that reads from `process.env`.

#### 5.2.3 ES Module Top-Level Return

The chat widget (`chat-widget.js`) initially used a top-level `return` statement to exit early when the user was not logged in. This is a syntax error in ES modules, which caused the entire script to fail silently. The fix was to wrap the entire widget in an IIFE (Immediately Invoked Function Expression), which allows `return` for early exit.

#### 5.2.4 Specialist Matching Failures

The specialist matching algorithm initially failed to find matching doctors even when the correct specialty existed in the database. Investigation revealed two bugs: (1) dead code after a `return` statement in `buildSpecialistList` meant the sort was never executed, and (2) the AI specialist recommendation endpoint was using `/api/chat` which returns plain text, causing `JSON.parse` to fail silently and return `null`. Both were fixed by removing the dead code and adding a dedicated `/api/specialists` endpoint that returns structured JSON.

### 5.3 Limitations

1. **AI accuracy and hallucination:** The LLM generates medically plausible responses but is not a certified medical device. It may occasionally produce incorrect diagnoses, inaccurate medicine information, or fabricated doctor recommendations. All AI-generated content is labeled with disclaimers.
2. **Render cold starts:** The free tier of Render spins down inactive services after 15 minutes of inactivity, causing delays of up to 50 seconds on the first request. This significantly degrades the user experience for infrequent users.
3. **No real-time notifications:** Appointment status changes by the admin are not pushed to patients in real time. Patients must manually refresh the health history page to see updated appointment statuses.
4. **Limited offline support:** All AI features require an active internet connection. The application does not implement service workers or offline caching.
5. **Bangladesh-specific data:** The specialist database and medicine pricing are focused on Bangladesh, limiting the system's applicability in other markets.
6. **No file storage:** Medical report images are not stored on the server or in Firebase Storage. They are processed in memory and discarded after analysis, meaning users cannot retrieve their original uploaded documents.
7. **Single-file analysis:** Only the first selected file is analyzed by the AI, even when multiple files are uploaded. Multi-file analysis would require merging the results from multiple inference calls.

### 5.4 Ethical Considerations

Healthcare applications carry significant ethical responsibilities. MediScan addresses these through several design choices:

**Medical disclaimers:** Every AI-generated output — analysis results, symptom assessments, medicine information, and chat responses — is accompanied by a prominent disclaimer stating that the information is for educational purposes only and does not constitute medical advice, diagnosis, or treatment.

**Data privacy:** Patient health data is stored in Firebase with user-scoped access controls. No health data is shared with third parties beyond the Groq API (which processes the data for inference but does not retain it for training). The Groq API key is stored server-side and never exposed to the browser.

**Transparency:** The system clearly identifies itself as an AI assistant and does not attempt to impersonate a human healthcare provider. The AI confidence score on the analysis page communicates the uncertainty inherent in AI-generated assessments.

**Emergency guidance:** The symptom checker includes guidance to seek emergency medical attention for high-severity symptoms and provides a clear disclaimer that the system is not a substitute for emergency services.

---

## 6. Conclusion and Future Work

### 6.1 Conclusion

MediScan demonstrates the feasibility of building a comprehensive, AI-powered healthcare navigation platform using modern web technologies and cloud services within the constraints of a student project. The system successfully integrates medical report OCR and analysis, symptom assessment, specialist recommendation and booking, generic medicine lookup, and an AI health chat assistant into a cohesive, responsive web application.

The three-tier architecture — with a vanilla JavaScript frontend on Netlify, a custom Express.js REST API on Render, and Google Firebase for authentication and data persistence — provides a clear separation of concerns, enforces API key security, and satisfies the academic requirement for a custom backend implementation. The admin panel, deployed as a separate application, provides hospital administrators with the tools needed to manage the platform's doctor directory and appointment workflow.

From a technical standpoint, the project demonstrates proficiency in several areas: REST API design with Express.js, NoSQL database modeling with Firestore, Firebase Security Rules, OAuth 2.0 authentication, multimodal AI API integration, client-side PDF generation, camera-based OCR, and responsive CSS design. The iterative development process, with features built and refined over six weeks, reflects a realistic software development workflow.

The current implementation is a functional prototype with known limitations, particularly around AI accuracy, server cold starts, and the absence of real-time notifications. These limitations are well-understood and have clear paths to resolution in future development.

### 6.2 Future Work

The following enhancements are planned for future development iterations:

1. **Health Vitals Tracker:** Allow users to log daily vitals (blood pressure, blood sugar, weight, temperature) and visualize trends over time using a charting library such as Chart.js. Vitals would be stored in a `users/{uid}/vitals/` sub-collection and displayed as line charts on the health history page.

2. **Medicine Reminders:** Browser notification-based medicine schedule reminders using the Web Notifications API. Users would set up a medicine schedule after using the medicine finder, and the browser would send push notifications at the specified times.

3. **Real-time Appointment Notifications:** Implement Firestore real-time listeners (`onSnapshot`) on the patient's appointments sub-collection to push status updates (confirmed/cancelled) to the patient's browser without requiring a page refresh.

4. **Firebase Storage for Reports:** Store uploaded medical report files in Firebase Storage, allowing users to retrieve their original documents from the health history page. The analysis results would be linked to the stored file.

5. **Multi-language Support:** Add a Bangla (Bengali) language interface to improve accessibility for users who are more comfortable in their native language. This would involve translating all UI text and potentially the AI prompts.

6. **Verified Medicine Database:** Replace AI-estimated medicine information with data from a verified pharmacological database. For Bangladesh, this could involve scraping the DGDA (Directorate General of Drug Administration) database or integrating with a pharmacy API.

7. **Telemedicine Integration:** Add video consultation booking through a WebRTC-based solution or a third-party telemedicine API, allowing patients to have virtual consultations with specialists directly through the platform.

8. **Mobile Application:** Develop a React Native or Flutter mobile application that uses the same Firebase backend and Express API, providing a native mobile experience with push notifications and offline support.

9. **Rate Limiting and Abuse Prevention:** Add rate limiting middleware to the Express server to prevent API abuse and protect the Groq API quota. Implement request logging for monitoring and debugging.

10. **Automated Testing:** Implement unit tests for the Express API endpoints using Jest and Supertest, and end-to-end tests for the frontend using Playwright or Cypress.

---

## Appendix

### A. Project File Structure

```
MediScan/
├── index.html                    ← Home page
├── config.js                     ← Firebase & API configuration
├── netlify.toml                  ← Netlify build configuration
├── build-config.js               ← Build-time config generator
├── firestore.rules               ← Firestore security rules
│
├── pages/                        ← HTML pages
│   ├── login.html
│   ├── signup.html
│   ├── upload.html
│   ├── analysis.html
│   ├── symptoms.html
│   ├── symptom-confirm.html
│   ├── symptom-results.html
│   ├── specialists.html
│   ├── schedule.html
│   ├── appointment-confirmed.html
│   ├── health-history.html
│   ├── medicine-finder.html
│   ├── health-chat.html
│   └── profile.html
│
├── js/                           ← Frontend JavaScript modules
│   ├── firebase.js               ← Firebase initialization
│   ├── auth.js                   ← Authentication & user sync
│   ├── ai.js                     ← AI API client (calls Express server)
│   ├── nav.js                    ← Navbar & chat widget injection
│   ├── upload.js                 ← File upload handler
│   ├── analysis.js               ← Analysis results renderer
│   ├── symptoms.js               ← Symptom checker
│   ├── specialists.js            ← Specialist finder & matching
│   ├── schedule.js               ← Appointment scheduler
│   ├── db.js                     ← Firestore CRUD operations
│   ├── medicine-finder.js        ← Medicine finder & OCR
│   ├── health-chat.js            ← Health chat page
│   ├── chat-widget.js            ← Floating chat widget
│   ├── pdf.js                    ← PDF report generator
│   └── utils.js                  ← Shared utilities
│
├── css/                          ← Stylesheets
│   ├── main.css
│   ├── components.css
│   └── pages/                    ← Page-specific styles
│
└── server/                       ← Express.js backend
    ├── index.js                  ← Server entry point & API routes
    ├── package.json
    └── .env                      ← Environment variables (gitignored)
```

### B. API Endpoint Reference

**Base URL:** `https://mediscan-gf5j.onrender.com`

| Endpoint | Method | Request Body | Response |
|---|---|---|---|
| `/api/health` | GET | — | `{ status, service, timestamp }` |
| `/api/analyze` | POST | `{ image: base64, mimeType }` | `{ ok, result: AnalysisResult }` |
| `/api/symptoms` | POST | `{ symptoms[], bodyAreas[], severity, duration, otherSymptoms, existingConditions }` | `{ ok, result: SymptomResult }` |
| `/api/chat` | POST | `{ messages[], systemPrompt }` | `{ ok, reply: string }` |
| `/api/medicine` | POST | `{ medicineName }` | `{ ok, result: MedicineResult }` |
| `/api/ocr` | POST | `{ image: base64, mimeType }` | `{ ok, medicineName: string \| null }` |
| `/api/specialists` | POST | `{ context: string }` | `{ ok, result: SpecialistRecommendation }` |

### C. Firestore Security Rules Summary

```
users/{userId}           → read/write: owner only; read: admin
users/{userId}/**        → read/write: owner only; read: admin
admins/{userId}          → read/write: admin only
doctors/{doctorId}       → read: authenticated; write: admin only
**/appointments/**       → read/write: admin only (collectionGroup)
**/analyses/**           → read: admin only (collectionGroup)
**/symptoms/**           → read: admin only (collectionGroup)
**/history/**            → read: admin only (collectionGroup)
```

### D. Deployment URLs

| Service | URL |
|---|---|
| Patient App | https://mediscanbd.netlify.app |
| Admin Panel | https://mediscanadmin.netlify.app |
| Backend API | https://mediscan-gf5j.onrender.com |
| Firebase Project | mediscan-5534e |

---

## References

[1] Topol, E. J. (2019). High-performance medicine: the convergence of human and artificial intelligence. *Nature Medicine*, 25(1), 44–56.

[2] Shickel, B., Tighe, P. J., Bihorac, A., & Rashidi, P. (2018). Deep EHR: A survey of recent advances in deep learning techniques for electronic health record (EHR) analysis. *IEEE Journal of Biomedical and Health Informatics*, 22(5), 1589–1604.

[3] Semigran, H. L., Linder, J. A., Gidengil, C., & Mehrotra, A. (2015). Evaluation of symptom checkers for self diagnosis and triage: audit study. *BMJ*, 351, h3480.

[4] Ye, Y., Li, S., Liu, F., Tang, W., & Hu, W. (2021). EdgeFed: Optimized federated learning based on edge computing. *IEEE Access*, 8, 209191–209198.

[5] Moroney, L. (2017). *The Definitive Guide to Firebase*. Apress.

[6] Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). Attention is all you need. *Advances in Neural Information Processing Systems*, 30.

[7] Google LLC. (2024). *Cloud Firestore Documentation*. Retrieved from https://firebase.google.com/docs/firestore

[8] Meta AI. (2024). *Llama 3: Open Foundation and Fine-Tuned Chat Models*. Retrieved from https://ai.meta.com/llama/

[9] Groq Inc. (2024). *Groq API Documentation*. Retrieved from https://console.groq.com/docs

[10] Mozilla Developer Network. (2024). *Web APIs — MDN Web Docs*. Retrieved from https://developer.mozilla.org/en-US/docs/Web/API
