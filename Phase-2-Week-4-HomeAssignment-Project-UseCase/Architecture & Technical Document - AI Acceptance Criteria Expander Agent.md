Architecture & Technical Document - AI Acceptance Criteria Expander
Agent

High-Level Architecture: Single application server using Node.js +
TypeScript. PostgreSQL as structured DB. Vector store (optional) for
semantic similarity. Redis for caching. Simple REST API layer.
React-based Web UI.

API-First Approach: 1. POST /api/expand-ac 2. POST /api/generate-tests
3. GET /api/history/:storyId

DB Layer: Tables: - stories - expanded_ac - generated_tests - cache

Web Layer: Simple React UI: - Story input form - Generated AC panel -
Generated test scenarios view - Export to markdown / JSON

Design Principles: - No microservices - No overengineering - Modular
services - Small testable units
