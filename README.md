# Literary Club Portal

A web application designed for literary club members to share, read, and discuss their creative works.

## Overview
This project was born from the need for a dedicated space where club members can easily exchange manuscript files, read each other's work, and provide feedback through comments.

## Development Intent
Previously, managing works and feedback across various platforms was fragmented. I decided to build a custom solution to:
- **Centralize file sharing and reading** within the club.
- **Maintain full control** over access range and copyright management.
- **Ensure flexibility** to modify features based on the club's specific needs, which is difficult with off-the-shelf services.

## Key Features
- **Manuscript Upload:** Supports `.txt` file uploads with automatic metadata extraction.
- **Reading Experience:** A clean, minimal UI focused on readability.
- **Feedback System:** A robust comment section for each post to encourage club discussion.
- **Like System:** A "Pattern C" implementation (LocalStorage + DynamoDB) allowing even guest users to interact while preventing duplicate entries.

## Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, TypeScript
- **Backend:** Next.js Route Handlers
- **Database:** Amazon DynamoDB (NoSQL)
- **Authentication:** NextAuth.js (Google Provider)
- **Infrastructure:** AWS (IAM, DynamoDB)

## Database Design (NoSQL)
This app utilizes a dual-table strategy for scalability and data integrity:
- `lit-club-page`: Stores post content and metadata.
- `lit-club-likes`: A separate table for managing interactions, using a composite key (`postId` + `userId`) to ensure idempotency.
