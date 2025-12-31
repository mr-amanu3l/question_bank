# Scaling the Secure Exam System MVP

This MVP is built with a solid foundation, but for a production-grade university system handling thousands of students, the following scaling strategies should be implemented:

## 1. Database Scaling (MongoDB)
- **Sharding**: Distribute data across multiple machines. We can shard the `Question` collection by `department` or `classification` and `User` collection by `role` or `region`.
- **Indexing**: Ensure all frequently queried fields (like `classification`, `owner`, `department`) are indexed to speed up read operations.
- **Replica Sets**: Use MongoDB Replica Sets for high availability and redundancy.

## 2. Authentication & Security
- **OAuth2 / SSO**: Integrate with the University's existing Identity Provider (IdP) using SAML or OIDC instead of local auth.
- **Redis for Sessions/MFA**: Store MFA temporary tokens and session data in Redis for faster access and expiration management compared to in-memory or main DB.
- **Rate Limiting**: Move rate limiting to a dedicated service (e.g., Redis-based) or API Gateway (Nginx/Kong) to handle DDoS attacks better.

## 3. Backend Architecture
- **Microservices**: Split the Monolith into microservices:
  - `Auth Service`: Handles login, registration, MFA.
  - `Question Bank Service`: Handles CRUD and MAC/DAC.
  - `Exam Service`: Handles taking exams (future feature).
  - `Audit Service`: dedicated service for logging to high-throughput storage (ELK Stack).
- **Load Balancing**: Deploy multiple instances of the backend behind a load balancer (Nginx, AWS ALB).

## 4. Frontend Optimization
- **CDN**: Serve static assets (React build) via a CDN (Cloudflare, AWS CloudFront).
- **State Management**: Use Redux or React Query for better caching and state management as the application grows complex.

## 5. Logging & Monitoring
- **ELK Stack**: Move logs from MongoDB to Elasticsearch/Logstash/Kibana for real-time analysis and visualization.
- **Alerting**: Set up alerts (Prometheus/Grafana) for failed login spikes or unusual access patterns (Intrusion Detection).
