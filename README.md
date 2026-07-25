## What is Nuance?

Nuance is an **AI-powered understanding assistance system** that helps people learn by preserving their flow of understanding.
The current implementation focuses on educational YouTube videos as its primary learning environment.

Rather than simply summarizing videos or answering questions on demand, Nuance continuously supports the user's understanding throughout the learning process. By identifying moments where understanding is likely to break, it provides only the context needed to help the learner continue.

*Nuance is built for people who want to understand, not just watch.*

## Why Nuance?

### Philosophy

Nuance is not a project about delivering information. It is a project about understanding.

People rarely fail to understand because information is missing. More often, understanding breaks when the flow of reasoning is interrupted. Once that flow is lost, even simple explanations can feel disconnected.

Nuance exists to detect these moments and restore the user's understanding with the smallest possible intervention. Instead of overwhelming users with explanations or waiting for questions, it provides just enough context to reconnect the flow of thought.

The goal of Nuance is not to explain everything. The goal is to help people continue understanding.

### Four Fundamental Questions
Nuance is guided by four fundamental research questions:

- What does it mean to understand?
- Why do people lose understanding?
- How can a broken flow of understanding be restored?
- When, how much, and how should AI intervene?

## Core Principles

### 1. Preserve the Flow of Understanding

Understanding is a continuous process, not a collection of isolated facts. Nuance prioritizes maintaining the learner's flow of understanding over simply delivering more information.

### 2. Minimal Intervention

AI should intervene only when understanding is likely to break. Every intervention should be timely, necessary, and as small as possible, allowing the learner to remain focused on the original learning experience.

### 3. Context Before Information

More information does not always lead to better understanding. Nuance prioritizes providing the right context over providing more content, helping learners reconnect ideas rather than overwhelming them with explanations.

### 4. Preserve the Original Learning Experience

Nuance enhances learning without replacing or interrupting the original viewing experience.

## Non-goals

Nuance is **not** designed to be:

- An AI subtitle translator.
- A video summarization tool.
- A chatbot for educational videos.
- A separate learning interface that replaces the original viewing experience.

## System Overview

Nuance consists of three core layers that work together to preserve the learner's understanding.

```
Educational Video
↓
Video Knowledge Layer
(What exists in the video)
↓
User Understanding Layer
(What the learner understands)
↓
AI Intervention Layer
(What AI should intervene with)
↓
UI
```

### 1. Video Knowledge Layer

Represents what exists in the video itself.

This layer extracts and organizes concepts, relationships, timelines, and other knowledge structures from educational content, creating a structured representation of the video's understanding space.

---

### 2. User Understanding Layer

Estimates the learner's current understanding in real time.

User interactions are continuously collected and analyzed through an inference pipeline to estimate the learner's understanding state.

```
User Events
↓
Inference Engine
↓
Understanding State
↕
State Tracking
```

---

### 3. AI Intervention Layer

Determines when, how, and how much AI should intervene.

Based on the current understanding state and user preferences, this layer selects the most appropriate intervention while following the principle of minimal intervention.

## Current Status

Nuance is currently in active research and development.

The first version of the User Understanding Layer has been established, including the inference engine. Event collection for user observations is currently under development.

The next research milestones are:

- Video Knowledge Layer
- AI Intervention Layer

For the latest implementation progress, see [CURRENT.md](CURRENT.md).

## Research Index

- RS-001 · What Is Good Learning?
- RS-002 · Why Does Self-Explanation Deepen Understanding?
- RS-003 · Why Do Questions Change Understanding?
- RS-004 · What Triggers Human Understanding?
- RS-005 · How Can We Estimate a User's Understanding State?
- RS-006 · How Can We Infer Understanding from Observable User Behavior?

These research notes document the theoretical foundations behind Nuance and are intended to evolve alongside the project.