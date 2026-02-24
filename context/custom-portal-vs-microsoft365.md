Answer (critical, realistic):

Yes—Microsoft already offers several building blocks that can cover parts of this portal:

SharePoint + Power Apps + Power Automate: Fast for forms, simple workflows, approvals, and M365 identity. Good for basic data capture and routed approvals.
Power Pages: External-facing portal with M365 identity integration (licensed). Can call APIs.
Azure Logic Apps: Strong for integration orchestration and scheduled/triggered workflows.
Azure API Management: Front-door to your movex-rest-api, throttling, auth, logging.
Dataverse / SQL + Power BI: For data storage and reporting.
Reality check / limitations:

Complex UI/UX, custom business logic, or highly tailored workflows can become costly or slow to evolve in low-code.
Licensing for Power Apps/Pages/Automate can be significant and unpredictable at scale.
Performance/SLA and governance can be harder to control versus a custom app.
API-first integration with strict control and audit/security requirements often fits better with a custom portal.
When Microsoft 365 is likely “good enough”:

Primarily form-based workflows
Limited customization needs
Low/medium traffic
Rapid delivery more important than long-term flexibility
When a custom portal is worth it:

Deep integration with movex-rest-api
Complex, evolving business rules
Performance and governance requirements
Long-term product ownership and scalability
Bottom line:
If this is a short-term, process-heavy, UI-light solution, M365 stack can work.
If this is a core system with tight API integration and long-term roadmap, custom portal is justified—but only with clear ROI and committed ownership.