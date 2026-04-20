# QA-AIAT — AI Agentic Tool Architecture
## QA Automation Transformation: Cypress → Playwright via AI Agents
**Version:** 1.0 | **Date:** April 7, 2026  
**Framework:** LangChain + RAG + Deep Eval + Playwright + Azure DevOps

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Architectural Layers](#2-architectural-layers)
3. [End-to-End Flow Diagram](#3-end-to-end-flow-diagram)
4. [Agent Architecture Diagram](#4-agent-architecture-diagram)
5. [Component Interaction Diagram](#5-component-interaction-diagram)
6. [Phase-by-Phase Architecture Map](#6-phase-by-phase-architecture-map)
7. [Azure DevOps Integration Architecture](#7-azure-devops-integration-architecture)
8. [Technology Stack](#8-technology-stack)
9. [Data Flow & Storage](#9-data-flow--storage)
10. [Security & Governance Architecture](#10-security--governance-architecture)

---

## 1. Architecture Overview

**QA-AIAT** (QA AI Agentic Tool) is a LangChain-orchestrated, multi-agent system
that automates the complete QA lifecycle from business requirements to deployed
Playwright tests running in Azure DevOps CI/CD pipelines.

### Core Architectural Principles

| Principle | Description |
|---|---|
| **Agent Specialisation** | Each agent handles one domain; no agent has overlapping responsibilities |
| **RAG Grounding** | All AI outputs are grounded in project-specific knowledge, not generic LLM knowledge |
| **Quality Gate First** | No AI output commits to the repository without passing the Deep Eval quality gate |
| **Human-in-the-Loop** | Engineers retain control at every critical decision point |
| **Single Entry Point** | All agents unified under one LangChain orchestrator accessible via one interface |

---

## 2. Architectural Layers

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        PRESENTATION LAYER                                ║
║              Single Entry Point UI / CLI / REST API                      ║
║         (Workflow Mode Selection: NEW | MIGRATE | FULL PIPELINE)         ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
╔══════════════════════════════════════════════════════════════════════════╗
║                      ORCHESTRATION LAYER                                 ║
║                   LangChain Master Orchestrator                          ║
║          Agent Router │ Workflow State │ Memory │ Error Recovery         ║
╚══════════════════════════════════════════════════════════════════════════╝
         │              │              │              │              │
╔══════╗ ╔══════╗ ╔══════╗ ╔══════╗ ╔══════════════════════╗
║ Req  ║ ║ Test ║ ║Migrat║ ║ Eval ║ ║   Pipeline Agent     ║
║Agent ║ ║Design║ ║Agent ║ ║Agent ║ ║  (YAML + Azure CI)   ║
║Phase1║ ║Phase2║ ║Phase3║ ║Phase4║ ║       Phase 5        ║
╚══════╝ ╚══════╝ ╚══════╝ ╚══════╝ ╚══════════════════════╝
                                    │
╔══════════════════════════════════════════════════════════════════════════╗
║                       KNOWLEDGE LAYER                                    ║
║                    RAG — Vector Knowledge Base                           ║
║   Requirements │ Playwright Docs │ Cypress Maps │ YAML Templates         ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
╔══════════════════════════════════════════════════════════════════════════╗
║                      EVALUATION LAYER                                    ║
║                  Deep Eval — Quality Gate Engine                         ║
║    Hallucination │ Assertion │ Coverage │ Relevance │ Equivalence         ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
╔══════════════════════════════════════════════════════════════════════════╗
║                      INTEGRATION LAYER                                   ║
║                    Azure DevOps Platform                                 ║
║        Boards │ Repos (Git) │ Pipelines │ Test Plans │ Artefacts          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. End-to-End Flow Diagram

```mermaid
flowchart TD
    A([📄 Business Requirements\nJIRA / BDD / Word / Confluence]) --> B

    subgraph PHASE1["PHASE 1 — Requirement Agent (RAG)"]
        B[RAG vectorises & retrieves\nrequirement context]
        B --> C[Extract testable scenarios\nwith priority tags P0/P1/P2]
        C --> D{Human-in-the-Loop\nQA Lead Review}
    end

    D -->|Approved| E
    D -->|Rejected| B

    subgraph PHASE2["PHASE 2 — Test Design Agent (LangChain)"]
        E[LangChain prompt chain\ngenerates Playwright TypeScript tests]
        E --> F[.spec.ts test files\nwith assertions + traceability]
    end

    subgraph PHASE3["PHASE 3 — Migration Agent (LangChain)"]
        G([🔄 Existing Cypress .cy.ts files\nfrom Azure DevOps Repo])
        G --> H[LangChain maps Cypress\nsyntax → Playwright equivalents]
        H --> I[Migrated .spec.ts files\n+ playwright.config.ts]
    end

    F --> J
    I --> J

    subgraph PHASE4["PHASE 4 — Evaluation Agent (Deep Eval)"]
        J[Deep Eval scores ALL tests:\nHallucination │ Accuracy │ Coverage │ Relevance]
        J --> K{Quality Gate\nScore ≥ Threshold?}
        K -->|FAIL| L[Agent regenerates\nfailed tests]
        L --> J
        K -->|PASS| M{Human-in-the-Loop\nQA Lead Sign-off}
    end

    M -->|Approved| N
    M -->|Changes needed| L

    subgraph PHASE5["PHASE 5 — Pipeline Agent (LangChain)"]
        N[Auto-generate\nazure-pipelines.yml]
        N --> O{Human-in-the-Loop\nDevOps Engineer Approval}
        O -->|Approved| P[Register & trigger\nAzure DevOps Pipeline]
        O -->|Rejected| N
    end

    subgraph PHASE6["PHASE 6 — Orchestrator (LangChain Master)"]
        P --> Q[CI/CD Pipeline runs\nPlaywright tests on Azure]
        Q --> R[Publish results to\nAzure DevOps Test Plans]
        R --> S([📊 End-to-End Report\nTraceability Matrix\nQA Lead Notification])
    end

    style PHASE1 fill:#e3f2fd,stroke:#1565c0
    style PHASE2 fill:#e8f5e9,stroke:#2e7d32
    style PHASE3 fill:#fff3e0,stroke:#e65100
    style PHASE4 fill:#fce4ec,stroke:#c62828
    style PHASE5 fill:#f3e5f5,stroke:#6a1b9a
    style PHASE6 fill:#e0f2f1,stroke:#00695c
```

---

## 4. Agent Architecture Diagram

```mermaid
graph LR
    subgraph ENTRY["Single Entry Point"]
        UI[QA-AIAT UI / CLI\nWorkflow Mode: A / B / C]
    end

    subgraph ORCHESTRATOR["LangChain Master Orchestrator"]
        ROUTER[Agent Router]
        MEM[Workflow Memory\nand State]
        ERR[Error Recovery\nChain]
    end

    subgraph AGENTS["Specialised Agents"]
        A1[Agent 1\nRequirement Agent\nRAG-Powered]
        A2[Agent 2\nTest Design Agent\nLangChain + RAG]
        A3[Agent 3\nMigration Agent\nLangChain + RAG]
        A4[Agent 4\nEvaluation Agent\nDeep Eval]
        A5[Agent 5\nPipeline Agent\nLangChain + RAG]
    end

    subgraph KNOWLEDGE["Knowledge Layer"]
        KB[(RAG Vector Store\nRequirements\nPlaywright Docs\nCypress Maps\nYAML Templates)]
    end

    subgraph GATE["Quality Gate"]
        DG{Deep Eval\nQuality Gate\nPASS ≥ threshold}
    end

    subgraph DEVOPS["Azure DevOps"]
        BOARDS[Azure Boards]
        REPOS[Azure Repos\nGit]
        PIPES[Azure Pipelines\nCI/CD]
        TESTS[Azure Test Plans]
    end

    UI --> ROUTER
    ROUTER --> MEM
    ROUTER --> A1
    ROUTER --> A2
    ROUTER --> A3
    A2 --> DG
    A3 --> DG
    DG -->|PASS| A5
    DG -->|FAIL| ROUTER
    ROUTER --> A4
    A4 --> DG
    ROUTER --> A5

    A1 <--> KB
    A2 <--> KB
    A3 <--> KB
    A5 <--> KB

    A1 --- BOARDS
    A2 --- REPOS
    A3 --- REPOS
    A5 --- PIPES
    A5 --- TESTS

    ERR -.-> ROUTER
```

---

## 5. Component Interaction Diagram

```mermaid
sequenceDiagram
    actor QAEngineer as QA Engineer / Lead
    participant UI as QA-AIAT Entry Point
    participant ORCH as LangChain Orchestrator
    participant RAG as RAG Knowledge Base
    participant A1 as Requirement Agent
    participant A2 as Test Design Agent
    participant A3 as Migration Agent
    participant DEVAL as Deep Eval Gate
    participant A5 as Pipeline Agent
    participant ADO as Azure DevOps

    QAEngineer->>UI: Upload requirements + select workflow mode
    UI->>ORCH: Initiate workflow (Mode A/B/C)

    ORCH->>A1: Trigger Phase 1 - Ingest requirements
    A1->>RAG: Retrieve context from vector store
    RAG-->>A1: Relevant document context
    A1->>ADO: Fetch work items from Azure Boards (optional)
    A1-->>ORCH: Extracted scenarios (JSON)
    ORCH-->>QAEngineer: CHECKPOINT 1 - Review extracted scenarios
    QAEngineer-->>ORCH: Approved

    par Phase 2 and Phase 3 in parallel
        ORCH->>A2: Trigger Phase 2 - Generate Playwright tests
        A2->>RAG: Retrieve Playwright patterns
        RAG-->>A2: Code templates and standards
        A2-->>ORCH: Generated .spec.ts files

        ORCH->>A3: Trigger Phase 3 - Migrate Cypress tests
        A3->>ADO: Fetch Cypress files from repo
        A3->>RAG: Retrieve Cypress→Playwright mapping rules
        RAG-->>A3: Conversion patterns
        A3-->>ORCH: Migrated .spec.ts files
    end

    ORCH->>DEVAL: Trigger Phase 4 - Evaluate all tests
    DEVAL-->>ORCH: PASS list + FAIL list with scores

    alt FAIL tests exist
        ORCH->>A2: Regenerate FAIL tests
        A2-->>ORCH: Regenerated tests
        ORCH->>DEVAL: Re-evaluate regenerated tests
        DEVAL-->>ORCH: Updated PASS list
    end

    ORCH-->>QAEngineer: CHECKPOINT 2 - Final test review + sign-off
    QAEngineer-->>ORCH: Approved

    ORCH->>A5: Trigger Phase 5 - Generate YAML pipeline
    A5->>RAG: Retrieve YAML templates and standards
    RAG-->>A5: Azure DevOps YAML schema + templates
    A5-->>ORCH: Generated azure-pipelines.yml
    ORCH-->>QAEngineer: CHECKPOINT 3 - DevOps YAML review
    QAEngineer-->>ORCH: Approved

    ORCH->>ADO: Commit tests + azure-pipelines.yml to Repo
    ORCH->>ADO: Register and trigger CI/CD pipeline
    ADO-->>ORCH: Pipeline run results
    ORCH-->>QAEngineer: End-to-end completion report + dashboard
```

---

## 6. Phase-by-Phase Architecture Map

| Phase | Agent | AI Technology | Inputs | Outputs | Gate |
|---|---|---|---|---|---|
| **Phase 1** | Requirement Agent | RAG + LangChain | Requirements docs, Azure Boards | Testable scenarios JSON | Deep Eval hallucination check |
| **Phase 2** | Test Design Agent | LangChain + RAG | Scenarios JSON, Playwright patterns | `.spec.ts` test files | — |
| **Phase 3** | Migration Agent | LangChain + RAG | Cypress `.cy.ts` files | Migrated `.spec.ts` + `playwright.config.ts` | — |
| **Phase 4** | Evaluation Agent | Deep Eval | Phase 2 + Phase 3 tests, Phase 1 scenarios | PASS/FAIL scorecard + quality report | Deep Eval quality gate ≥ threshold |
| **Phase 5** | Pipeline Agent | LangChain + RAG | PASS tests metadata, Azure DevOps config | `azure-pipelines.yml` + pipeline run | Schema validation + DevOps approval |
| **Phase 6** | LangChain Orchestrator | LangChain (Master) | All phase outputs | Unified tool, end-to-end report, traceability matrix | QA Lead master sign-off |

---

## 7. Azure DevOps Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AZURE DEVOPS PLATFORM                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Azure Boards │  │ Azure Repos  │  │   Azure Pipelines      │ │
│  │              │  │   (Git)      │  │                        │ │
│  │ Work Items   │  │ feature/ai-  │  │ azure-pipelines.yml    │ │
│  │ User Stories │  │ gen-tests    │  │ Trigger: push / PR /   │ │
│  │ Acceptance   │  │ migration/   │  │         schedule       │ │
│  │ Criteria     │  │ playwright   │  │                        │ │
│  │              │  │ .spec.ts     │  │ Stages:                │ │
│  │ READ by      │  │ playwright   │  │  1. npm install        │ │
│  │ Phase 1 RAG  │  │ .config.ts   │  │  2. playwright install │ │
│  │ Agent via    │  │              │  │  3. run tests          │ │
│  │ REST API     │  │ WRITTEN by   │  │     (Chromium/FF/WK)   │ │
│  │              │  │ Phase 2,3,5  │  │  4. publish results   │ │
│  └──────────────┘  └──────────────┘  │  5. upload artefacts  │ │
│                                       └────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Azure Test   │  │            Azure Artefacts               │  │
│  │   Plans      │  │                                          │  │
│  │              │  │  • Deep Eval evaluation report           │  │
│  │ Test results │  │  • Playwright HTML test report           │  │
│  │ published    │  │  • Migration summary report              │  │
│  │ after every  │  │  • End-to-end completion report          │  │
│  │ pipeline run │  │  • Traceability matrix JSON              │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲ READ / WRITE        ▲ REGISTER        ▲ TRIGGER
         │                     │                  │
┌─────────────────────────────────────────────────────────────────┐
│                   QA-AIAT — LangChain Orchestrator               │
│               Phase 1 Agent │ Phase 5 Pipeline Agent            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Technology Stack

### AI & Orchestration

| Component | Technology | Role |
|---|---|---|
| **Orchestration** | LangChain | Agent chaining, routing, memory, workflow state |
| **LLM** | Azure OpenAI (GPT-4o) | Language generation for all agents |
| **RAG** | LangChain + FAISS / Azure AI Search | Vector store, document retrieval, context grounding |
| **Evaluation** | Deep Eval | Quality gate scoring, hallucination detection |
| **Embeddings** | Azure OpenAI text-embedding-ada-002 | Document vectorisation for RAG |

### Test Automation

| Component | Technology | Role |
|---|---|---|
| **Test Framework** | Playwright | Test execution, cross-browser support |
| **Language** | TypeScript | Strong typing for test scripts |
| **Config** | YAML (playwright.config.ts) | Test configuration and reporter setup |
| **Reporter** | Playwright HTML Reporter | Test result HTML reports |

### DevOps & Infrastructure

| Component | Technology | Role |
|---|---|---|
| **Source Control** | Azure DevOps Repos (Git) | Version control, branch strategy |
| **CI/CD** | Azure DevOps Pipelines (YAML) | Automated build, test, deploy |
| **Test Management** | Azure DevOps Test Plans | Test result tracking and history |
| **Artefacts** | Azure DevOps Artefacts | Report and evaluation output storage |
| **Work Tracking** | Azure DevOps Boards | Requirement source, traceability linking |

---

## 9. Data Flow & Storage

```mermaid
flowchart LR
    subgraph INPUTS["Data Inputs"]
        I1[Requirement Docs\nWord/PDF/BDD]
        I2[Azure Boards\nWork Items API]
        I3[Cypress Tests\n.cy.ts files]
    end

    subgraph RAG_STORE["RAG Vector Store"]
        V1[(Requirements\nEmbeddings)]
        V2[(Playwright\nAPI Docs)]
        V3[(Cypress→PW\nMapping Rules)]
        V4[(Azure DevOps\nYAML Templates)]
        V5[(Org Coding\nStandards)]
    end

    subgraph PROCESSING["Agent Processing"]
        A1_PROC[Phase 1\nScenarios JSON]
        A2_PROC[Phase 2\nGenerated Tests]
        A3_PROC[Phase 3\nMigrated Tests]
        A4_PROC[Phase 4\nEval Scorecard]
        A5_PROC[Phase 5\nYAML Pipeline]
    end

    subgraph ADO_STORE["Azure DevOps Storage"]
        R1[Repos\n.spec.ts files]
        R2[Repos\nazure-pipelines.yml]
        R3[Test Plans\nRun Results]
        R4[Artefacts\nDeep Eval Reports]
        R5[Artefacts\nPlaywright Reports]
    end

    I1 --> V1
    I2 --> V1
    I3 --> A3_PROC
    V1 --> A1_PROC
    V2 --> A2_PROC
    V3 --> A3_PROC
    V4 --> A5_PROC
    V5 --> A2_PROC

    A1_PROC --> A2_PROC
    A2_PROC --> A4_PROC
    A3_PROC --> A4_PROC
    A4_PROC --> A5_PROC

    A2_PROC --> R1
    A3_PROC --> R1
    A5_PROC --> R2
    A4_PROC --> R4
    R2 --> R3
    R2 --> R5
```

---

## 10. Security & Governance Architecture

### Security Controls

| Control | Implementation |
|---|---|
| **Secrets Management** | All API keys stored in Azure DevOps Pipeline Variables (encrypted); never hardcoded in YAML or code |
| **Service Principal** | Azure DevOps pipeline runs under a least-privilege service principal |
| **Branch Protection** | All AI-generated test commits require Pull Request + peer review before merge to main |
| **Audit Trail** | Every agent decision and output logged with timestamp and agent ID in Azure DevOps Artefacts |
| **Data Privacy** | Requirement documents processed in-tenant; no data sent to external LLM without approval |
| **Quality Gate** | Deep Eval hallucination check prevents LLM-fabricated test content from reaching production pipeline |

### Governance Model

```
Requirement Upload
      │
      ▼
[Phase 1] RAG extraction ──► Human Review ──► Approved? ──► Phase 2
                                                    │
                                                    No ──► Refine & Re-extract

[Phase 4] Deep Eval Gate ──► Quality Score ──► Pass? ──► Phase 5
                                                   │
                                                   No ──► Agent Retry (max 3x)
                                                          │
                                                          Still fail ──► QA Lead Escalation

[Phase 5] YAML Pipeline ──► DevOps Review ──► Approved? ──► Register & Trigger
                                                    │
                                                    No ──► Regenerate with feedback
```

---

## Architecture Decision Records (ADR)

### ADR-001: LangChain as Orchestration Framework
- **Decision:** Use LangChain for multi-agent orchestration
- **Rationale:** Native support for agent chaining, tool routing, memory management, and RAG integration; strong TypeScript/Python ecosystem alignment
- **Alternatives Considered:** AutoGen, CrewAI, custom orchestration
- **Status:** Accepted

### ADR-002: RAG for Requirement Grounding
- **Decision:** All requirement-related AI generation uses RAG
- **Rationale:** Prevents LLM hallucination on project-specific content; ensures all generated tests reflect YOUR requirements, not generic patterns
- **Status:** Accepted

### ADR-003: Deep Eval as Quality Gate
- **Decision:** Deep Eval is the mandatory quality gate before any test commit
- **Rationale:** Objective, measurable quality scoring; hallucination detection specific to test content evaluation; open-source with enterprise extensibility
- **Status:** Accepted

### ADR-004: Human-in-the-Loop at Every Critical Checkpoint
- **Decision:** Engineers retain approval control at Phase 1 exit, Phase 4 exit, and Phase 5 exit
- **Rationale:** Ensures AI outputs meet business standards; builds team confidence in AI-generated artefacts; satisfies enterprise governance requirements
- **Status:** Accepted

### ADR-005: Azure DevOps as Sole Repository and Pipeline Platform
- **Decision:** All source control, CI/CD, and test result storage on Azure DevOps
- **Rationale:** Existing organisational platform; eliminates multi-tool complexity; native integration with Azure OpenAI and test publishing
- **Status:** Accepted

---

*Architecture Document | QA-AIAT | Version 1.0 | April 7, 2026*
