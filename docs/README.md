# Documentation Index

This folder contains the working documentation set for the SEO Command Center.

## Documents

- [SRS](B:\AI SEO Agent\seo-command-center\docs\SRS.md)
  Defines product scope, actors, functional requirements, non-functional requirements, assumptions, and acceptance criteria.

- [Architecture](B:\AI SEO Agent\seo-command-center\docs\ARCHITECTURE.md)
  Explains the system structure, runtime flows, AI orchestration, job processing, security, and scaling approach.

- [ERD](B:\AI SEO Agent\seo-command-center\docs\ERD.md)
  Describes the main Prisma data model and relationships with a Mermaid ER diagram.

- [Feature Catalog](B:\AI SEO Agent\seo-command-center\docs\FEATURES.md)
  Lists the major product capabilities, current implementation status, and notable operational details.

- [API Overview](B:\AI SEO Agent\seo-command-center\docs\API.md)
  Summarizes the App Router API surface grouped by domain.

- [Deployment Guide](B:\AI SEO Agent\seo-command-center\docs\DEPLOYMENT.md)
  Covers PM2, systemd, Nginx, environment setup, and the one-command production deploy flow.

## Intended Audience

- `Product / founders`: start with SRS and Feature Catalog
- `Engineers`: start with Architecture and ERD
- `Operators / QA`: start with Feature Catalog and API Overview

## Notes

- The documentation reflects the current implementation in this repository.
- Some features are automation-ready but still depend on external provider setup, especially email delivery through `Resend`.
