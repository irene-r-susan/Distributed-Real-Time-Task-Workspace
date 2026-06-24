# Distributed Real-Time Workspace Cluster

A highly scalable, production-ready distributed system featuring multi-container application scaling behind an Nginx load balancer, automated cross-node real-time synchronization via a Redis Pub/Sub backplane, and secure stateless JWT authentication backed by a relational PostgreSQL engine.

---

## 🏗️ Core Architecture Spec

The system is engineered completely around horizontal scalability, eliminating application-tier single points of failure (SPOF) while keeping communication overhead lean:

* **Ingress & Traffic Distribution:** An Nginx reverse proxy acting as an edge load balancer. It handles round-robin routing of standard RESTful HTTP traffic alongside long-lived stateful WebSocket upgrades (`HTTP 101 Switching Protocols`).
* **Horizontally Scalable Application Tier:** Multiple concurrent, completely isolated Node.js application containers. These run statelessly, processing parallel computational workloads without shared runtime memory.
* **Stateless Security Gateway:** High-security middleware intercepting protected resource routes. It validates structural signature integrity using JSON Web Tokens (JWT) and utilizes `bcrypt` for secure asymmetric cryptographic password hashing.
* **Cross-Node Event Replicator:** A real-time WebSocket infrastructure running on Socket.io. Inter-container event synchronization is managed via an in-memory **Redis Pub/Sub message broker backend** so that isolated servers can broadcast updates cross-cluster instantly.
* **Relational Storage Core:** A persistent relational database layout running on PostgreSQL to capture user registries and coordinate relational multi-tenant entity ownership.

---

## 🛠️ Technological Footprint

* **Core Frontend:** React, Tailwind CSS (v4 featuring PostCSS compilation mapping), Socket.io-Client, Vite
* **Core Backend:** Node.js, Express.js, Socket.io, JSON Web Tokens (JWT), Bcrypt.js
* **Infrastructure Layer:** Docker, Docker Compose, Nginx, Redis (Alpine), PostgreSQL

---

## 🚀 Deployment Instructions

### Prerequisites
Ensure your local development space has **Docker Desktop** and **Node.js LTS** active.

### Phase 1: Spin Up the Cluster Infrastructure
Open your primary terminal workspace in the root directory (containing your configuration structures) and execute a hard-built clean initialization:

```bash
docker compose down
docker compose up --build