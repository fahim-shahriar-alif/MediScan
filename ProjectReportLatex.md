# MediScan — Project Report (LaTeX Source — IEEE Format)

Paste the content below into [Overleaf](https://overleaf.com) or any LaTeX editor and compile with `pdflatex`.

```latex
\documentclass[conference]{IEEEtran}

\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{listings}
\usepackage{booktabs}
\usepackage{array}
\usepackage{url}

\lstset{
  basicstyle=\ttfamily\footnotesize,
  breaklines=true,
  frame=single,
  backgroundcolor=\color{gray!10},
  keywordstyle=\color{blue},
  commentstyle=\color{green!60!black},
  stringstyle=\color{red!70!black}
}

\begin{document}

\title{MediScan: An AI-Powered Intelligent Healthcare Navigator Web Application}

\author{
  \IEEEauthorblockN{Fahim Shahriar Alif}
  \IEEEauthorblockA{
    \textit{Department of Computer Science and Engineering}\\
    \textit{Independent University, Bangladesh}\\
    Dhaka, Bangladesh\\
    ID: 2221079 \quad 2221079@iub.edu.bd
  }
}

\maketitle

%-----------------------------------------------------------------------
\begin{abstract}
MediScan is a web-based intelligent healthcare navigation platform designed
to bridge the gap between patients and medical services through the
application of artificial intelligence and modern cloud technologies.
The growing complexity of medical reports, the difficulty of identifying
appropriate specialists, and the high cost of brand-name medicines are
persistent challenges faced by patients, particularly in developing
countries such as Bangladesh.

The system enables users to upload medical reports in PDF or image format
for automated Optical Character Recognition (OCR) and structured health
analysis. An interactive symptom checker allows patients to describe their
symptoms using a body map interface and receive AI-generated assessments
with urgency ratings and condition probabilities. A real-time specialist
directory connects patients with relevant doctors and supports appointment
booking with a confirmation workflow. A generic medicine finder allows
users to search by name or scan medicine packaging using the device camera,
receiving information on active ingredients, dosage, side effects, and
affordable generic alternatives with estimated prices in Bangladeshi Taka
(BDT). A context-aware AI health chat widget is available on every page,
providing personalized responses based on the user's most recent health data.

The platform is built on a three-tier architecture: a vanilla
JavaScript/HTML/CSS frontend deployed on Netlify, a Node.js/Express REST
API backend deployed on Render that securely proxies all AI inference
calls, and Google Firebase providing authentication and a NoSQL Firestore
database. A separate role-restricted admin panel allows hospital
administrators to manage the doctor directory, confirm or cancel patient
appointments, and monitor platform-wide activity statistics.
\end{abstract}

\begin{IEEEkeywords}
healthcare web application, artificial intelligence, large language model,
OCR, symptom analysis, Firebase, Firestore, REST API, Express.js,
specialist recommendation, medicine finder, admin panel, Bangladesh
\end{IEEEkeywords}

%-----------------------------------------------------------------------
\section{Introduction}

\subsection{Background and Motivation}

Healthcare accessibility is a multifaceted problem that extends beyond
physical access to hospitals and clinics. Even when medical services are
available, patients frequently encounter barriers in understanding their
own health data. A patient who receives a blood test report showing
elevated SGPT levels, for example, may not understand what that means,
which specialist to consult, or how urgently they need to act. Similarly,
a patient prescribed a brand-name medicine may be unaware that a
significantly cheaper generic equivalent is available at their local
pharmacy.

In Bangladesh, these challenges are compounded by a shortage of general
practitioners who can guide patients through the healthcare system, high
out-of-pocket medical costs, and limited digital health infrastructure.
The COVID-19 pandemic further accelerated the need for remote health
information tools, as patients sought ways to assess their symptoms and
access medical guidance without visiting crowded facilities.

MediScan was conceived as a response to these challenges---a web-based
platform that uses artificial intelligence to democratize access to health
information, help patients navigate the healthcare system, and reduce the
friction between receiving a medical report and taking appropriate action.

\subsection{Problem Statement}

The specific problems MediScan addresses are:
\begin{enumerate}
  \item \textbf{Medical report interpretation:} Patients receive lab
    reports, blood work, and microbiology results containing technical
    terminology and reference ranges they cannot interpret without medical
    training.
  \item \textbf{Symptom assessment:} Patients are often uncertain whether
    their symptoms warrant an urgent visit to a doctor or can be managed
    at home.
  \item \textbf{Specialist identification:} Even when patients know they
    need a specialist, identifying the correct type for their condition is
    non-trivial.
  \item \textbf{Appointment friction:} Booking appointments typically
    requires phone calls, manual scheduling, and no digital confirmation
    trail.
  \item \textbf{Medicine costs:} Patients are often unaware of generic
    alternatives to expensive brand-name medicines.
  \item \textbf{Administrative overhead:} Hospital administrators lack a
    centralized digital tool to manage their doctor directory, patient
    appointments, and platform activity.
\end{enumerate}

\subsection{Objectives}

The primary objectives of MediScan are:
\begin{enumerate}
  \item To allow patients to upload medical reports and receive
    plain-language AI analysis with disease detection and actionable next
    steps.
  \item To provide an interactive symptom checker that assesses severity
    and recommends appropriate specialist types.
  \item To connect patients with verified medical specialists and
    facilitate appointment booking with a digital confirmation workflow.
  \item To offer a generic medicine finder with camera-based OCR for
    scanning medicine packaging.
  \item To provide an AI health chat assistant that answers patient
    questions in the context of their personal health data.
  \item To provide hospital administrators with a centralized management
    panel for overseeing platform activity.
\end{enumerate}

%-----------------------------------------------------------------------
\section{Related Work}

\subsection{AI in Healthcare Web Applications}

The application of machine learning and natural language processing to
healthcare has grown substantially over the past decade. Landmark systems
such as IBM Watson Health demonstrated early viability of AI for clinical
decision support, while Google's DeepMind achieved ophthalmologist-level
accuracy in retinal disease detection \cite{topol2019}. However, these
systems are typically enterprise-grade and inaccessible to general
consumers.

More recently, the emergence of large language models (LLMs) such as
GPT-4, Llama, and Gemini has opened new possibilities for consumer-facing
health applications. MediScan leverages this capability through the
Groq-hosted Llama 3.3 70B and Llama 4 Scout models, targeting the
consumer segment with a lightweight, browser-based approach.

\subsection{OCR for Medical Document Processing}

Early approaches used Tesseract-based pipelines to digitize printed lab
reports, requiring separate preprocessing steps for image enhancement,
text segmentation, and entity extraction \cite{shickel2018}. These
pipelines are brittle in the presence of varied document layouts or
low-quality scans.

More recent work leverages multimodal LLMs that can simultaneously read
and interpret document images without explicit OCR preprocessing. MediScan
adopts this approach, sending the base64-encoded report image to the Groq
API and receiving a fully structured JSON analysis response in a single
inference call.

\subsection{Symptom Checkers and AI Triage}

Consumer-facing symptom checkers such as WebMD, Ada Health, and Babylon
Health have demonstrated significant user demand for AI-assisted triage
tools \cite{semigran2015}. A 2015 BMJ study evaluated 23 symptom checkers
and found that they listed the correct diagnosis first in 34\% of cases.
MediScan uses generative LLMs to produce nuanced, context-aware
assessments that account for severity, duration, and pre-existing
conditions.

\subsection{Specialist Recommendation Systems}

Recommender systems for healthcare providers have been studied in the
context of insurance network navigation and specialty matching based on
diagnosis codes \cite{ye2021}. MediScan takes a hybrid approach: the AI
generates recommended specialty types, which are then matched against a
live Firestore database of doctors maintained by hospital administrators.

\subsection{BaaS Architectures for Healthcare}

Backend-as-a-Service (BaaS) platforms such as Firebase have been widely
adopted for rapid web application development \cite{moroney2017}. MediScan
uses Firebase for authentication and data persistence while delegating AI
inference to a custom Express.js server, ensuring that sensitive API keys
are never exposed to the browser.

%-----------------------------------------------------------------------
\section{Methodology}

\subsection{System Architecture}

MediScan follows a three-tier client-server architecture that cleanly
separates presentation, business logic, and data concerns, as illustrated
in Fig.~\ref{fig:architecture}.

\begin{figure}[htbp]
\centering
\begin{verbatim}
CLIENT TIER
  HTML/CSS/Vanilla JS (ES Modules)
  Netlify: mediscanbd.netlify.app
        |  HTTPS (JSON)
SERVER TIER
  Node.js 18 + Express.js 4 REST API
  Render: mediscan-gf5j.onrender.com
  Endpoints: /api/analyze, /api/symptoms,
             /api/chat, /api/medicine,
             /api/ocr, /api/specialists
        |  HTTPS / Firebase SDK
DATA TIER
  Google Firebase (mediscan-5534e)
  - Firebase Authentication
  - Cloud Firestore (NoSQL)
  - Groq API (Llama 3.3 70B, Llama 4 Scout)
\end{verbatim}
\caption{MediScan three-tier system architecture.}
\label{fig:architecture}
\end{figure}

The frontend communicates exclusively with the Express backend for all AI
operations. Firebase operations are performed directly from the frontend
using the Firebase JavaScript SDK, protected by Firestore Security Rules.

\subsection{Technology Stack}

Table~\ref{tab:techstack} summarizes the technology stack used in
MediScan.

\begin{table}[htbp]
\caption{MediScan Technology Stack}
\label{tab:techstack}
\begin{tabular}{p{1.5cm}p{2.8cm}p{3.2cm}}
\toprule
\textbf{Layer} & \textbf{Technology} & \textbf{Purpose} \\
\midrule
Frontend & HTML5, CSS3 & Markup and styling \\
Frontend & Vanilla JS (ES2022) & Client-side logic \\
Backend & Node.js 18 & Server runtime \\
Backend & Express.js 4.19 & HTTP framework \\
Backend & node-fetch 3.x & Groq API client \\
Backend & dotenv 16.x & Env. variables \\
Backend & cors 2.8 & CORS handling \\
Database & Cloud Firestore & NoSQL storage \\
Auth & Firebase Auth 10.12 & Identity mgmt. \\
AI/LLM & Groq Llama 3.3 70B & Text analysis \\
AI/LLM & Groq Llama 4 Scout & Vision/OCR \\
PDF & jsPDF 2.5.1 & Report generation \\
Hosting & Netlify & Frontend deploy \\
Hosting & Render & Backend deploy \\
VCS & Git / GitHub & Source control \\
\bottomrule
\end{tabular}
\end{table}

\subsection{Database Design}

Cloud Firestore uses a hierarchical document-collection model. MediScan's
data model is organized around the \texttt{users/\{userId\}} hierarchy,
ensuring each patient's data is isolated under their unique Firebase
Authentication UID.

\subsubsection{Top-Level Collections}

\textbf{\texttt{users/\{userId\}}} stores patient profile documents
created or updated on every sign-in:
\begin{lstlisting}[language=json]
{
  "displayName": "Fahim Ahmed",
  "email": "fahim@example.com",
  "phone": "+880 1700-000000",
  "provider": "google.com",
  "createdAt": "2026-04-23T...",
  "lastSeen": Timestamp
}
\end{lstlisting}

\textbf{\texttt{doctors/\{doctorId\}}} stores the specialist directory,
managed exclusively by admins:
\begin{lstlisting}[language=json]
{
  "name": "Dr. Mahmudul Hasan",
  "specialty": "Gastroenterologist",
  "address": "33 Farmgate, Dhaka",
  "phone": "+880 1724-100028",
  "rating": 3.2,
  "reviews": 43
}
\end{lstlisting}

\subsubsection{User Sub-Collections}

Each \texttt{users/\{userId\}} document contains sub-collections for
\texttt{appointments}, \texttt{analyses}, \texttt{symptoms}, and
\texttt{history}. The appointment document schema is:
\begin{lstlisting}[language=json]
{
  "patientName": "Fahim Ahmed",
  "doctorName": "Dr. Mahmudul Hasan",
  "date": "2026-04-25T00:00:00.000Z",
  "timeLabel": "10:00 AM",
  "confirmationNumber": "MS-AB12CD34",
  "status": "pending",
  "savedAt": Timestamp
}
\end{lstlisting}

\subsection{Security Model}

Security is enforced at two levels: Firestore Security Rules and CORS
configuration.

\subsubsection{Firestore Security Rules}

The rules implement the principle of least privilege:
\begin{lstlisting}[language=javascript]
match /users/{userId} {
  allow read, write:
    if request.auth != null
    && request.auth.uid == userId;
  allow read: if isAdmin();
}
function isAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/
           admins/$(request.auth.uid));
}
match /doctors/{doctorId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
\end{lstlisting}

\subsubsection{API Key Security}

The Groq API key is stored as an environment variable on the Render server
and is never included in any response sent to the browser. The Express
server validates key presence on startup.

\subsubsection{User Data Isolation}

Health data in localStorage is keyed by the user's Firebase UID (e.g.,
\texttt{analysisResult\_abc123}) to prevent cross-user data leakage when
multiple users share the same browser.

\subsection{REST API Design}

The Express backend exposes seven endpoints, as shown in
Table~\ref{tab:api}. All POST endpoints return a consistent response
envelope: \texttt{\{"ok": true, "result": \{...\}\}} or
\texttt{\{"ok": false, "error": "..."\}}.

\begin{table}[htbp]
\caption{REST API Endpoints}
\label{tab:api}
\begin{tabular}{p{1.2cm}p{2.2cm}p{4cm}}
\toprule
\textbf{Method} & \textbf{Endpoint} & \textbf{Description} \\
\midrule
GET  & /api/health      & Server health check \\
POST & /api/analyze     & Medical report OCR and analysis \\
POST & /api/symptoms    & Symptom assessment \\
POST & /api/chat        & AI health chat \\
POST & /api/medicine    & Generic medicine lookup \\
POST & /api/ocr         & Medicine packaging OCR \\
POST & /api/specialists & Specialist recommendation \\
\bottomrule
\end{tabular}
\end{table}

\subsection{Development Process}

The project was developed iteratively over approximately six weeks:
\begin{itemize}
  \item \textbf{Week 1:} Firebase setup, authentication (email/password,
    Google OAuth), basic navigation.
  \item \textbf{Week 2:} Report upload, AI analysis pipeline, results page
    with PDF download.
  \item \textbf{Week 3:} Symptom checker with body map, confirmation flow,
    results page.
  \item \textbf{Week 4:} Specialist finder, appointment scheduling
    calendar, booking confirmation.
  \item \textbf{Week 5:} Admin panel (dashboard, appointments, patients,
    doctors CRUD), health history, profile page.
  \item \textbf{Week 6:} Medicine finder with camera OCR, AI chat widget,
    Express.js backend migration, security hardening.
\end{itemize}

%-----------------------------------------------------------------------
\section{Results}

\subsection{User Authentication and Profile Management}

The authentication system supports email/password registration and Google
OAuth 2.0 via Firebase Authentication. On every sign-in, the system calls
\texttt{syncUserToFirestore()}, which performs a \texttt{setDoc} with
\texttt{merge: true} on the \texttt{users/\{uid\}} document. This ensures
the admin panel can enumerate all registered patients. The profile page
allows users to update their display name and add a phone number, which is
stored in Firestore and displayed in the admin panel's patient list.

\subsection{Medical Report Upload and AI Analysis}

The upload page supports drag-and-drop file upload and live camera
capture. Supported formats are PDF, JPEG, and PNG (maximum 10 MB). The
analysis pipeline proceeds as follows:
\begin{enumerate}
  \item The file is read as a Data URL using the \texttt{FileReader} API.
  \item The base64-encoded image is sent via POST to \texttt{/api/analyze}.
  \item The server forwards the image to the Groq Llama 4 Scout vision
    model with a structured prompt.
  \item The model returns a JSON response with health summary, metrics,
    disease detection, and specialist recommendation.
  \item The result is saved to Firestore and to user-scoped localStorage.
  \item The user is redirected to the analysis results page.
\end{enumerate}

The results page displays an AI Health Insight card, a key metrics grid
with color-coded progress bars, an Other Test Results table, a Disease
Detection section, and a sidebar with an animated confidence score ring.
Users can download a professionally formatted PDF summary using the jsPDF
library.

\subsection{Symptom Checker}

The symptom checker is a three-page flow: input, confirmation, and
results. Users interact with an anatomical SVG body map to select affected
regions, choose from 15 common symptom chips, rate pain on a 0--10 slider,
and specify duration and pre-existing conditions. The data is sent to
\texttt{/api/symptoms}, which queries the Llama 3.3 70B model. Results
include a color-coded urgency banner, 2--4 condition cards with match
percentages, and specific recommendations.

\subsection{Specialist Finder with AI Matching}

The specialists page fetches doctors from Firestore in real time. When
accessed from the analysis or symptom flow, the system calls
\texttt{/api/specialists} with the patient's health context. The matching
algorithm compares AI-recommended specialty types against each doctor's
specialty field using case-insensitive substring matching. Matching doctors
are sorted to the top with ``AI Recommended'' badges and explanations.

\subsection{Appointment Scheduling and Booking}

The scheduling page displays a week-strip calendar with morning, afternoon,
and evening time slot groups. On confirmation, a unique confirmation number
(format: \texttt{MS-XXXXXXXX}) is generated and the appointment is saved
to Firestore with \texttt{status: 'pending'}. The appointment is only
marked as \texttt{'confirmed'} after an administrator reviews it in the
admin panel.

\subsection{Generic Medicine Finder}

Users can search by medicine name or scan packaging using the device camera
or an uploaded image. The OCR endpoint uses Llama 4 Scout to extract the
medicine name from the packaging image. Results include generic name,
active ingredient, drug class, dosage form, uses, side effects, warnings,
and 3--5 generic alternatives with estimated BDT prices.

\subsection{AI Health Chat Widget}

A floating chat bubble is injected into every authenticated page. The
widget loads the user's latest analysis and symptom data as context and
sends conversation history to \texttt{/api/chat}. Health data is scoped to
the current user's UID to prevent cross-user data leakage. Suggested
questions are dynamically generated based on the patient's health data.

\subsection{Admin Panel}

The admin panel provides four authenticated pages:
\begin{itemize}
  \item \textbf{Dashboard:} Platform-wide statistics via Firestore
    CollectionGroup queries.
  \item \textbf{Appointments:} Searchable table with confirm/cancel
    actions and confirmation codes.
  \item \textbf{Patients:} Registered patient list with activity counts
    and phone numbers.
  \item \textbf{Doctors:} Full CRUD interface for the specialist directory.
\end{itemize}

\subsection{Performance Observations}

\begin{itemize}
  \item Report analysis latency: 3--8 seconds (Groq API dependent).
  \item Symptom analysis latency: 2--4 seconds.
  \item Medicine finder latency: 2--5 seconds.
  \item Firestore reads: sub-second for typical queries.
  \item Render cold start: up to 50 seconds on the free tier.
\end{itemize}

\subsection{Security Findings}

\begin{itemize}
  \item The Groq API key is absent from all browser-accessible files.
  \item Firestore rules correctly reject cross-user data access.
  \item The admin panel rejects non-admin sign-in attempts.
  \item localStorage health data is scoped to the user's UID.
  \item The Express server returns CORS errors for unauthorized origins.
\end{itemize}

%-----------------------------------------------------------------------
\section{Discussion}

\subsection{Design Decisions}

\subsubsection{Vanilla JavaScript over a Framework}
Plain ES Modules were chosen over React or Vue to minimize build
complexity, demonstrate core web platform proficiency, and reduce the
dependency surface area. The trade-off is reduced maintainability as the
application grows.

\subsubsection{Groq API over OpenAI}
Groq's free tier and fast inference speeds (leveraging custom Language
Processing Unit hardware) made it the practical choice for a student
project. The Llama 3.3 70B model provides high-quality medical text
analysis, while Llama 4 Scout handles multimodal image analysis.

\subsubsection{Firebase as the Primary Data Layer}
Firebase eliminates the need for a custom authentication server and
database infrastructure. The trade-off is vendor lock-in and the
complexity of Firestore security rules.

\subsubsection{Express.js Proxy Server}
Moving AI API calls to a server-side proxy was essential for security and
satisfies the academic requirement for a custom backend implementation.

\subsubsection{Appointment Status Workflow}
New appointments are saved with \texttt{status: 'pending'} to reflect a
realistic healthcare workflow where appointments must be verified by the
clinic before confirmation.

\subsection{Challenges Encountered}

\subsubsection{Cross-User Data Leakage}
An early version stored health data in localStorage under generic keys.
When a second user logged in, the AI chat widget would load the previous
user's data. This was resolved by scoping all localStorage keys to the
user's Firebase UID.

\subsubsection{GitHub Secret Scanning}
GitHub's secret scanning blocked pushes containing the Groq API key. This
was resolved by removing \texttt{config.js} from version control and
generating it at build time from Netlify environment variables.

\subsubsection{ES Module Top-Level Return}
The chat widget initially used a top-level \texttt{return} statement,
which is a syntax error in ES modules. The fix was to wrap the widget in
an IIFE (Immediately Invoked Function Expression).

\subsubsection{Specialist Matching Failures}
Two bugs caused matching failures: (1) dead code after a \texttt{return}
statement prevented the sort from executing, and (2) the specialist
endpoint was using \texttt{/api/chat} which returns plain text, causing
\texttt{JSON.parse} to fail silently. Both were fixed by removing the dead
code and adding a dedicated \texttt{/api/specialists} endpoint.

\subsection{Limitations}

\begin{enumerate}
  \item \textbf{AI accuracy:} The LLM may produce plausible but incorrect
    assessments. All outputs are labeled with disclaimers.
  \item \textbf{Render cold starts:} Up to 50-second delays after
    inactivity on the free tier.
  \item \textbf{No real-time notifications:} Appointment status changes
    are not pushed to patients in real time.
  \item \textbf{Limited offline support:} All AI features require an
    internet connection.
  \item \textbf{Bangladesh-specific data:} The specialist database and
    medicine pricing are focused on Bangladesh.
  \item \textbf{No file storage:} Report images are processed in memory
    and not persisted.
  \item \textbf{Single-file analysis:} Only the first selected file is
    analyzed by the AI.
\end{enumerate}

\subsection{Ethical Considerations}

Every AI-generated output is accompanied by a disclaimer stating that the
information is for educational purposes only and does not constitute
medical advice. Patient health data is stored with user-scoped access
controls. The system clearly identifies itself as an AI assistant and does
not impersonate a human healthcare provider.

%-----------------------------------------------------------------------
\section{Conclusion and Future Work}

\subsection{Conclusion}

MediScan demonstrates the feasibility of building a comprehensive,
AI-powered healthcare navigation platform using modern web technologies
within the constraints of a student project. The system successfully
integrates medical report OCR and analysis, symptom assessment, specialist
recommendation and booking, generic medicine lookup, and an AI health chat
assistant into a cohesive, responsive web application.

The three-tier architecture---with a vanilla JavaScript frontend on
Netlify, a custom Express.js REST API on Render, and Google Firebase for
authentication and data persistence---provides a clear separation of
concerns, enforces API key security, and satisfies the academic requirement
for a custom backend implementation.

\subsection{Future Work}

\begin{enumerate}
  \item \textbf{Health Vitals Tracker:} Log daily vitals and visualize
    trends using Chart.js.
  \item \textbf{Medicine Reminders:} Browser push notifications for
    medicine schedules.
  \item \textbf{Real-time Notifications:} Firestore \texttt{onSnapshot}
    listeners for appointment status updates.
  \item \textbf{Firebase Storage:} Persist uploaded report files for
    later retrieval.
  \item \textbf{Multi-language Support:} Bangla language interface.
  \item \textbf{Verified Medicine Database:} Integration with a
    pharmacological database API.
  \item \textbf{Telemedicine Integration:} WebRTC-based video
    consultation booking.
  \item \textbf{Mobile Application:} React Native or Flutter app using
    the same backend.
  \item \textbf{Rate Limiting:} Middleware to prevent API abuse.
  \item \textbf{Automated Testing:} Jest/Supertest for API endpoints;
    Playwright for end-to-end tests.
\end{enumerate}

%-----------------------------------------------------------------------
\begin{thebibliography}{00}

\bibitem{topol2019}
E.~J. Topol, ``High-performance medicine: the convergence of human and
artificial intelligence,'' \textit{Nature Medicine}, vol.~25, no.~1,
pp.~44--56, 2019.

\bibitem{shickel2018}
B.~Shickel, P.~J. Tighe, A.~Bihorac, and P.~Rashidi, ``Deep EHR: A
survey of recent advances in deep learning techniques for electronic health
record (EHR) analysis,'' \textit{IEEE Journal of Biomedical and Health
Informatics}, vol.~22, no.~5, pp.~1589--1604, 2018.

\bibitem{semigran2015}
H.~L. Semigran, J.~A. Linder, C.~Gidengil, and A.~Mehrotra, ``Evaluation
of symptom checkers for self diagnosis and triage: audit study,''
\textit{BMJ}, vol.~351, p.~h3480, 2015.

\bibitem{ye2021}
Y.~Ye, S.~Li, F.~Liu, W.~Tang, and W.~Hu, ``EdgeFed: Optimized federated
learning based on edge computing,'' \textit{IEEE Access}, vol.~8,
pp.~209191--209198, 2021.

\bibitem{moroney2017}
L.~Moroney, \textit{The Definitive Guide to Firebase}. Apress, 2017.

\bibitem{vaswani2017}
A.~Vaswani \textit{et al.}, ``Attention is all you need,'' in
\textit{Advances in Neural Information Processing Systems}, vol.~30, 2017.

\bibitem{google2024firestore}
Google LLC, ``Cloud Firestore Documentation,'' 2024. [Online]. Available:
\url{https://firebase.google.com/docs/firestore}

\bibitem{meta2024llama}
Meta AI, ``Llama 3: Open Foundation and Fine-Tuned Chat Models,'' 2024.
[Online]. Available: \url{https://ai.meta.com/llama/}

\bibitem{groq2024}
Groq Inc., ``Groq API Documentation,'' 2024. [Online]. Available:
\url{https://console.groq.com/docs}

\bibitem{mdn2024}
Mozilla Developer Network, ``Web APIs,'' 2024. [Online]. Available:
\url{https://developer.mozilla.org/en-US/docs/Web/API}

\end{thebibliography}

\end{document}
```