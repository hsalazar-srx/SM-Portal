# Decision Log 004: Comparison of Microsoft 365 Alternatives vs Custom Portal

**Date**: 2026-02-09  
**Decision Maker**: Lead Engineer  
**Status**: Approved  
**Impact Level**: MEDIUM

---

## Decision Statement

**We have documented a critical, realistic assessment of Microsoft 365-based alternatives (SharePoint/Power Platform/Logic Apps) versus a custom MOVEX-Portal build, and captured the prompt and response as a formal decision record for governance.**

---

## Context

### Prompt (verbatim)
> From within Microsoft infrastructure is there something similar to what we are trying to achieve with this portal? Like a sharepoint website or something similar that could connect to a deployed movex-rest-api and then uses Power Automate or Azure Logic Apps to leverage what Microsoft already offers via Microsoft 365? OR this project really worth developing and implement it. Please be as critical and realist as possible

### Response (verbatim)
> **Answer (critical, realistic):**
>
> Yes—Microsoft already offers several building blocks that can cover parts of this portal:
>
> - **SharePoint + Power Apps + Power Automate**: Fast for forms, simple workflows, approvals, and M365 identity. Good for *basic* data capture and routed approvals.
> - **Power Pages**: External-facing portal with M365 identity integration (licensed). Can call APIs.
> - **Azure Logic Apps**: Strong for integration orchestration and scheduled/triggered workflows.
> - **Azure API Management**: Front-door to your movex-rest-api, throttling, auth, logging.
> - **Dataverse / SQL + Power BI**: For data storage and reporting.
>
> **Reality check / limitations:**
> - **Complex UI/UX**, **custom business logic**, or **highly tailored workflows** can become costly or slow to evolve in low-code.
> - **Licensing** for Power Apps/Pages/Automate can be significant and unpredictable at scale.
> - **Performance/SLA** and **governance** can be harder to control versus a custom app.
> - **API-first integration** with strict control and audit/security requirements often fits better with a custom portal.
>
> **When Microsoft 365 is likely “good enough”:**
> - Primarily form-based workflows
> - Limited customization needs
> - Low/medium traffic
> - Rapid delivery more important than long-term flexibility
>
> **When a custom portal is worth it:**
> - Deep integration with **movex-rest-api**
> - Complex, evolving business rules
> - Performance and governance requirements
> - Long-term product ownership and scalability
>
> **Bottom line:**  
> If this is a **short-term, process-heavy, UI-light** solution, M365 stack can work.  
> If this is a **core system** with tight API integration and long-term roadmap, **custom portal is justified**—but only with clear ROI and committed ownership.

---

## Alternatives Considered

### Option 1: Microsoft 365 / Power Platform stack
- SharePoint + Power Apps + Power Automate
- Power Pages for portal use cases
- Azure Logic Apps for integration workflows

### Option 2: Custom MOVEX-Portal build
- React SPA frontend + ASP.NET Core API
- Full control over UX, performance, security, and governance

---

## Decision Outcome

Proceed with a formal, critical assessment record rather than prescriptive commitment at this stage. The record highlights that Microsoft 365 tooling can satisfy basic, short-term, UI-light workflows, while a custom portal is justified when API integration depth, governance, and long-term product ownership are key requirements.

---

## Implications

- If requirements remain UI-light and process-driven, a Microsoft 365 approach can reduce time-to-delivery.
- If requirements emphasize long-term scalability, API control, and complex workflows, custom development remains justified but must include a clear ROI and ownership model.

---

## Related Evidence

- `ai/evidence/decision-log.md`
- `context/custom-portal-vs-microsoft365.md`

---

**Last Updated**: 2026-02-09
