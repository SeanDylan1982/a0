<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 

You are an AI coding agent tasked with building and maintaining a modular enterprise web platform that includes Inventory, Sales, Invoicing, HR, Accounting, Messaging, Notice Board, Users, Settings, and Dashboard modules.

Core Global Rules:

Recent Activities Logging

Every confirmed action across all modules must be recorded in the Recent Activities feed, visible per-role and per-function.

Events must display timestamps, user, function, and affected objects.

Central Inventory Pool

All stock data (movements, availability, requisitions) must come from a single source of truth.

Adjustments must realistically reflect known losses (breakages, theft, spillage) as tracked by management.

Data Sharing Across Tabs/Modules

Each section must share and consume data as permitted by role/function hierarchy.

Updates in one module (e.g., Sales → Stock requisition) must cascade to relevant modules (Inventory, Accounting).

Global Stats Accuracy

Analytics, KPIs, and reporting must always reflect the latest confirmed records across the platform.

Notifications

Confirmed actions trigger management notifications.

Significant stock movements must be broadcast platform-wide.

Calendar, Messaging, Notice Board tabs must show red-dot counters for unread items.

Role & Function Boundaries

Left sidebar items and actions visible only to users with appropriate role/function clearance.

Roles: Director, Manager, User, Staff Member, Sales Rep, Internal Consultant, HOD.

Translations

Entire UI and all components must be translatable into Afrikaans and Zulu; translations stored in codebase.

Compliance

System must be browser-compatible with South African locale defaults, including flag-based branding.

All legal/tax/banking/company details must be pulled from Settings (Admin/Director only) into documents and system-wide compliance features.

You must enforce these rules in every module implementation, backend API, frontend UI, database schema, and event workflow.