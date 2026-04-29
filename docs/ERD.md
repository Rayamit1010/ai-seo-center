# Entity Relationship Diagram

## 1. Overview

The data model is organized into these main domains:
- user and configuration
- audits and reporting
- project memory
- AI chat
- outreach and backlink automation
- AI telemetry
- background jobs / queue state

## 2. ERD

```mermaid
erDiagram
  User ||--o{ Audit : owns
  User ||--o{ Report : owns
  User ||--o{ ReportSchedule : owns
  User ||--o{ ReportDeliveryLog : owns
  User ||--o{ ProjectProfile : owns
  User ||--o{ ChatSession : owns
  User ||--o{ OutreachCampaign : owns
  User ||--o{ BacklinkCampaign : owns
  User ||--o{ BacklinkProspect : owns
  User ||--o{ AIProviderEvent : owns
  User ||--o{ AgentRun : owns
  User ||--o{ BackgroundJob : owns
  User ||--o| AgentConfig : config

  Audit ||--o{ Report : source_for
  Audit ||--o{ ReportSchedule : source_for

  ChatSession ||--o{ ChatMessage : contains

  BacklinkCampaign ||--o{ BacklinkProspect : contains
  BacklinkCampaign ||--o{ AgentRun : tracked_by
  BacklinkProspect ||--o{ EmailQueue : queues

  Report ||--o{ ReportDeliveryLog : delivered_by

  User {
    string id PK
    string email UK
    string password
    string name
    string company
    string website
    string role
    datetime createdAt
  }

  AgentConfig {
    string id PK
    string userId UK,FK
    string fromEmail
    string fromName
    int dailyEmailLimit
    int emailsSentToday
    string blockedDomains
    string providerOrder
    boolean providerLoopEnabled
    int providerCooldownMins
    string chatgptApiKeyEnc
    string claudeApiKeyEnc
    string geminiApiKeyEnc
    string grokApiKeyEnc
    string groqApiKeyEnc
    string chatgptModel
    string claudeModel
    string geminiModel
    string grokModel
    string groqModel
    boolean autoDiscover
    boolean autoQualify
    boolean autoContact
    boolean autoDraft
    boolean autoSend
    boolean autoFollowUp
    int cycleIntervalMinutes
    datetime lastHeartbeatAt
    boolean isEnabled
  }

  ProjectProfile {
    string id PK
    string userId FK
    string name
    string websiteUrl
    string domain
    string industry
    string targetCountry
    string targetAudience
    string brandVoice
    string businessGoal
    string conversionGoals
    string primaryServices
    string backlinkRules
    string contentPlaybook
    string nichePlaybook
    string searchConsoleSiteUrl
    string ga4PropertyId
    string cmsProvider
    string cmsBaseUrl
    string cmsUsername
    string cmsWebhookUrl
    string cmsPublishStatus
    string notes
    boolean isDefault
    datetime createdAt
    datetime updatedAt
  }

  Audit {
    string id PK
    string userId FK
    string url
    string title
    string status
    string inputType
    string scrapedData
    string pagespeedData
    string scores
    string onPage
    string technical
    string offPage
    string keywords
    string checklist
    string summary
    datetime createdAt
    datetime updatedAt
  }

  Report {
    string id PK
    string userId FK
    string auditId FK
    string title
    string type
    string content
    datetime createdAt
  }

  ReportSchedule {
    string id PK
    string userId FK
    string auditId FK
    string targetUrl
    string clientName
    string projectName
    string recipientEmail
    string frequency
    int weekday
    int monthDay
    int hour
    int minute
    string timezone
    string deliveryMode
    boolean isActive
    datetime nextRunAt
    datetime lastRunAt
    datetime createdAt
    datetime updatedAt
  }

  ReportDeliveryLog {
    string id PK
    string userId FK
    string reportId FK
    string recipientEmail
    string subject
    string status
    string provider
    string errorMessage
    datetime createdAt
    datetime sentAt
  }

  ChatSession {
    string id PK
    string userId FK
    string title
    datetime createdAt
    datetime updatedAt
  }

  ChatMessage {
    string id PK
    string sessionId FK
    string role
    string content
    datetime createdAt
  }

  BacklinkCampaign {
    string id PK
    string userId FK
    string name
    string targetUrl
    string industry
    string targetCountry
    string competitorUrls
    string config
    string status
    int totalProspects
    int totalSent
    int totalReplied
    int totalLinks
    datetime createdAt
    datetime updatedAt
  }

  BacklinkProspect {
    string id PK
    string userId FK
    string campaignId FK
    string domain
    string url
    string discoveryMethod
    string discoveryData
    int qualityScore
    string qualityTier
    int relevanceScore
    string qualifyData
    string contactName
    string contactEmail
    string contactMethod
    string contactData
    string outreachAngle
    string emailSubject
    string emailBody
    string followUpData
    string stage
    string stageError
    boolean linkAcquired
    string linkUrl
    datetime createdAt
    datetime updatedAt
  }

  EmailQueue {
    string id PK
    string prospectId FK
    string emailType
    string toEmail
    string fromEmail
    string subject
    string body
    string status
    datetime scheduledFor
    datetime sentAt
    string resendId
    string errorMessage
    int attempts
    int maxAttempts
    datetime createdAt
    datetime updatedAt
  }

  AgentRun {
    string id PK
    string userId FK
    string campaignId FK
    string runType
    string status
    datetime startedAt
    datetime completedAt
    int durationMs
    int itemsProcessed
    int itemsSucceeded
    int itemsFailed
    string log
    string errorMessage
    datetime createdAt
  }

  AIProviderEvent {
    string id PK
    string userId FK
    string providerId
    string task
    string operation
    boolean success
    boolean failover
    int latencyMs
    string errorMessage
    datetime createdAt
  }

  BackgroundJob {
    string id PK
    string userId FK
    string jobName
    string payload
    string status
    int attempts
    int maxAttempts
    datetime availableAt
    datetime processingStartedAt
    datetime leaseUntil
    string lockedBy
    string lastError
    datetime createdAt
    datetime updatedAt
    datetime completedAt
  }
```

## 3. Modeling Notes

- `AgentConfig` is the per-user operational control center for AI routing and automation toggles.
- `ProjectProfile` is the persistent strategy-memory layer used by chat and automation.
- `Report.content`, `Audit.scores`, `Audit.onPage`, and several other fields intentionally store structured JSON strings to keep the schema flexible.
- `BacklinkProspect` is the central record in the backlink workflow and connects discovery, qualification, outreach, and delivery.
- `AIProviderEvent` is append-only telemetry for AI health and analytics.
- `BackgroundJob` is the durable queue ledger for async work and supports retries, leases, and dead-letter handling.

## 4. Important Indexed Paths

Examples of high-value indexes already present:
- `Audit(userId, createdAt desc)`
- `Audit(userId, status, createdAt desc)`
- `ChatSession(userId, updatedAt desc)`
- `ReportSchedule(isActive, nextRunAt)`
- `BacklinkProspect(userId, stage, createdAt desc)`
- `BacklinkProspect(campaignId, linkAcquired)`
- `AIProviderEvent(userId, providerId, createdAt)`

These support dashboards, queues, reporting cadence, and AI health views.
