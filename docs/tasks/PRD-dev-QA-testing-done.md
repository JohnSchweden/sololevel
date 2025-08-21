
https://youtu.be/Zufkern1fNU?feature=shared

start at 30….

# Setup Playwright MCP

## 30:01 – Live demo: Instantly generating a PRD using Cursor
- create a custom mode PRD Generator with a prompt
- Prompt this agent with something like that:

Prompt:
based on our current setup, we only support page level testing, meaning they have to create two pages, id like to support no-code element testing, meaning a single page, with element that swaps against a control and variant

Summery output
The PRD for "No-Code Element-Level A/B Testing* has been created at documentation/features/element-testing-prd.md with full executive summary, scope, user analysis, specifications, architecture, task breakdown,
roadmap, KPis, and QA strategy.




## 45:15 – Turning that PRD into a full QA test plan

Prompt: 
Create qa test plan for features
@element-testing-prd.md based on this emulate what a qa test plan would look and add it to @features/ folder

Prompt:
Mermaid diagram visua
show what the mermaid diagram would look like for this

Prompt:
@+page.svelte study the codebase, Id like to build out a simple test plan to ensure that when a user clicks on a website, it actually loads it.
first come up with a simple plan, then we'll execute on it.
add it to @features/


## 51:15 – Watch an AI agent run self-driving QA in your browser

Prompts:
- I already have a browser open at http://localhost:5173/, use playwright mcp to open the browser and run the test

update the test plan and let me know of your


## 57:14 – Automating QA in production with background agents and alerts


- check how vite is used
- check linear mcp
- vercel