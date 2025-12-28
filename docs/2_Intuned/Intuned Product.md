## **Introduction: How LLMs Decide Which Products to Recommend**

---

**Mockup :** [https://intuned-e9bee452.base44.app/](https://intuned-e9bee452.base44.app/)

Note : If the Action page is shown. Then cross one action and click on re run simulation to start from the start. 

---

Large Language Models like ChatGPT don’t browse the internet the way humans do, and they don’t rank websites the way Google Search does. Instead, they evaluate products based on how clearly those products are described, how structured and trustworthy the information is, how well the product matches a specific user need, and how it compares to alternatives. When a user asks a shopping-related question, the LLM builds an internal shortlist of products it feels confident recommending, and then explains those choices in natural language.

This process means that visibility in AI-driven shopping is not about design, branding, or ad spend. It is about **data quality, structure, clarity, context, and trust**. The algorithm that follows mirrors how LLMs actually think: first ensuring products are complete and understandable, then ensuring they are machine-readable, then ensuring they clearly match buyer intent, then ensuring they are credible, and finally validating everything through real prompts.

---

## **Step 1: Shopify Ingestion – Establishing a Complete Product Baseline**

The first step is connecting the Shopify store so the system can see the entire product catalog exactly as it exists today. This connection allows us to pull all product data directly from the source of truth instead of relying on assumptions, scraped data, or partial exports.

At this stage, we ingest every product and variant, including product page URLs, titles, descriptions, prices, currencies, availability, variants such as size and color, images, existing image alt text, product tags, collections, review counts, average ratings, and any shipping or returns information visible on product pages or linked policies.

This step exists because **LLMs cannot recommend what they cannot clearly see**. If product information is incomplete, inconsistent, or outdated, the model experiences uncertainty. When uncertainty is high, LLMs default to safer alternatives. By ingesting the full catalog, we ensure that every product has a fair chance of being evaluated by the algorithm later in the process.

No optimization happens here. This step simply establishes a clean, accurate baseline.

**What is pulled from Shopify**

For every product and variant, the system ingests:

* Product page URL (PDP)

* Product title

* Full product description

* Variant information (sizes, colors, materials, capacities, etc.)

* Price and currency

* Availability and stock status

* Images and existing alt text

* Product tags and collections

* Review count and average rating (if available)

* Shipping and returns information (if present on PDP or policy pages)

---

## **Step 1.5: Product Page Selection – Deciding Which Products Are Worth Testing**

LLMs do not recommend stores or categories. They recommend **specific product pages**.  
 Because of this, AI optimization must be **product-first**, not site-wide.

Immediately after ingesting the full Shopify catalog in Step 1, we introduce a filtering and prioritization layer that decides **which product pages are worth simulating prompts against**.

The purpose of this step is focus.

Instead of testing hundreds or thousands of products, we intentionally select a **small, high-impact subset of product pages** that have a realistic chance of being recommended by AI.

---

### **How Product Pages Are Selected**

Using data pulled directly from Shopify in Step 1, product pages are selected based on three signals:

1. **Revenue importance**  
    Products that already generate meaningful revenue, are hero SKUs, or represent key product lines.

2. **Prompt relevance**  
    Products that clearly map to common AI buying questions (e.g. “best leggings for gym,” “best hoodie for winter workouts”).

3. **Completeness baseline**  
    Products that already have enough information to be evaluated (basic descriptions, pricing, availability), even if they are not yet optimized.

This allows the system to answer a critical question early:

“Which product pages are even eligible to enter AI consideration?”

---

### **What This Looks Like in the App**

Inside the app, this creates a **dedicated Product Pages section** that appears immediately after store connection.

This section shows **only selected product pages**, not the full catalog.

For each selected product page, the app displays:

* Product name and PDP URL

* Associated product category

* Revenue or importance indicator (if available)

* Initial AI eligibility status (eligible / weak / unclear)

* Number of buying prompts this product will be tested against

This reframes the experience from:

“Analyze my whole store”  
 to  
 “These are the products that actually matter right now.”

---

### **Why This Step Exists in the Algorithm**

Prompt simulation without product selection creates noise.

LLMs internally shortlist products **before** matching them to questions.  
 If a product is irrelevant, unclear, or incomplete, it never enters the shortlist — no matter how many prompts you run.

By selecting product pages **before** running prompts:

* We mirror the AI’s internal filtering logic

* We reduce false negatives

* We keep the MVP focused and fast

* We ensure every prompt run has strategic intent

This step ensures that **Step 2 (LLM Query Runner)** operates on products that actually matter.

## **Step 2: LLM Query Runner – Simulating Real AI Shopping Behavior**

Once the products are ingested, we simulate how real customers use AI to shop. Instead of keywords, we use natural-language prompts that reflect real buying questions, such as “best running shoes for flat feet,” “best hoodie for winter workouts under €80,” or “alternative to \[competitor brand\].”

These prompts are mapped to product categories, product lines, and in many cases individual products. They represent moments when the AI must make a decision and recommend specific products, not just give general advice.

This step is critical because LLMs do not crawl a site and then decide to rank it. They respond to questions by selecting products that feel relevant, safe, and credible for the given use case. Running these prompts shows us **how the AI currently understands the market**, and whether the store’s products are even entering the AI’s consideration set.

**What prompts are used**

Prompts reflect how people actually ask buying questions:

* “Best \[product type\] for \[use case\]”

* “Best \[category\] under €X”

* “Alternative to \[competitor brand\]”

* “Best \[product\] for beginners / professionals / winter / sensitive skin”

* “Which \[product\] should I buy for \[problem or situation\]”

Prompts are mapped to:

* Product categories

* Product lines

* In some cases, individual SKUs

---

## **Step 3: Analysis with Metrics and Prompts – Making AI Visibility Measurable**

After running the prompts, we analyze the responses in a structured way so that visibility becomes measurable instead of subjective. For every prompt, we check whether the brand appears at all, which product or collection is mentioned, and where it appears in the response.

We also capture how the AI describes the product, including which attributes, benefits, or proof points it highlights. If competitors appear instead, we record that as well.

From this data, we calculate metrics such as AI mention rate, top-3 inclusion rate, product-level visibility score, prompt coverage, and share of voice compared to competitors. These metrics allow us to see which products are invisible, which ones occasionally appear, and which ones consistently win AI recommendations.

This step matters because optimization without measurement is guesswork. These metrics define the baseline and make it possible to validate whether changes later in the process actually improve AI visibility.

Once prompts are run, the system analyzes the responses in a structured, repeatable way so visibility becomes measurable instead of subjective.

Metrics captured for each prompt

For every prompt, the system records:

* Whether the brand appears at all

* Which product or collection is mentioned

* Position in the response (top recommendation, top 3, mentioned later, not mentioned)

* Frequency of mentions across all prompts

* Language used by the AI to describe the product (attributes, benefits, proof)

* Whether competitors appear instead

Derived metrics

From this, we calculate:

* **AI Mention Rate** (how often products appear)

* Top-3 Inclusion Rate

* Product-level Visibility Score

* **Prompt Coverage** (how many relevant prompts a product appears in)

* Share of Voice vs competitors

| Metric | Description |
| ----- | ----- |
| AI Mention Rate | How often products appear across prompts |
| Top-3 Inclusion Rate | Percentage of prompts where products rank in top 3 |
| Product-level Visibility Score | Aggregated score based on position and frequency |
| Prompt Coverage | Number of relevant prompts a product appears in |
| Share of Voice vs Competitors | Brand's mention share relative to competitors |

---

## **Step 4: Competitive Analysis – Understanding Why Others Are Chosen**

When a product does not appear in an AI answer, it is not random. The AI has chosen another product because it appears to be a better match for the user’s intent. In this step, we analyze those choices.

For each prompt where competitors are recommended, we capture which brands or products appear and how they are positioned. We analyze which attributes the AI emphasizes, such as price, durability, comfort, sustainability, popularity, or suitability for a specific use case. We also note whether trust signals like ratings, review volume, or perceived reliability are mentioned.

This step exists because LLMs justify recommendations internally. By observing their language, we can reverse-engineer what the AI values for each prompt. This transforms competition from a vague concept into a clear checklist of signals that the store must match or outperform.

**What is analyzed for competitors**

For each prompt where competitors appear, the system captures:

* Which competing brands or products are recommended

* How they are positioned (best value, most durable, beginner-friendly, etc.)

* Which attributes are emphasized (price, reviews, materials, use case)

* Which trust signals are mentioned (ratings, popularity, reliability)

---

## **Step 5: Structured Data, Technical Signals, and AI Readiness**

Even strong products with good content can be ignored if the AI cannot reliably parse the page. This step ensures that nothing technical blocks the product from being considered.

Here, we evaluate whether each product page includes proper structured data, including Product schema, Offer schema with price and availability, Review and AggregateRating schema, and FAQ schema where applicable. We also check Article or Blog schema for supporting educational content. All schema is validated to ensure it is complete and error-free.

Beyond schema, we confirm that key product information is visible in the raw HTML and not hidden behind scripts, and that pages are accessible to crawlers. The goal is to ensure that the AI can extract accurate information without guessing.

This step exists because structured data acts as the AI’s instruction manual. It reduces ambiguity and increases confidence. If pricing, availability, or reviews are unclear, the AI may avoid recommending the product to prevent giving incorrect advice.

**Technical elements tested for each product**

* Product schema (name, description, brand, SKU, identifiers, material, dimensions)

* Offer schema (price, currency, availability, condition)

* Review and AggregateRating schema

* FAQ schema (if FAQs exist)

* Article / Blog schema for supporting content

* Schema completeness and validation

* Errors or missing structured fields

* Whether content is visible in HTML (not hidden behind scripts)

* Crawl and index accessibility

---

## **Step 6: Product Content Optimization – Teaching the AI What the Product Is For**

Once the technical foundation is in place, we optimize how product pages communicate meaning. LLMs prefer content that is clear, factual, explicit, and aligned with real buyer questions.

In this step, we refine product descriptions so they clearly state what the product is, who it is for, and what problem it solves. We add explicit use-case sections, benefit explanations tied to real scenarios, and practical details such as materials, fit, durability, compatibility, and care instructions.

We also add or improve FAQ sections that answer common buyer questions. These FAQs are especially important because LLMs frequently quote them directly in responses. We remove vague or overly poetic language that does not map to real queries.

This step helps the AI confidently match products to specific needs and describe them accurately in its own words. The same clarity also improves human conversion.

**What is optimized or added to product pages**

* Clear, literal opening sentence (“what it is”)

* Explicit statement of who the product is for

* Use-case sections tied to buyer intent

* Benefit explanations connected to real situations

* Practical details (materials, fit, durability, compatibility, care)

* FAQ sections answering real buyer questions

* Clear shipping, returns, warranty, and trust information

* Removal of vague or overly poetic language

Measurability: "Post-optimization, rerun Step 2 prompts to quantify improvements in mention rates."

---

## **Step 7: Negative Eligibility – Removing Reasons the AI Avoids a Product**

After product content is clarified, we evaluate whether there are any signals that cause the AI to **avoid recommending the product**, even when it is relevant to the user’s question. LLMs are risk-averse by design and will exclude products if something feels unclear, incomplete, or potentially misleading.

In this step, we analyze products that should match a prompt but are consistently missing from AI answers. We look for gaps, ambiguities, or inconsistencies that increase uncertainty from the model’s perspective. The goal is not to add more marketing, but to remove hesitation.

This step ensures that products move from being “understandable” to being **safe to recommend**, which is a critical threshold in AI-driven shopping decisions.

### **What is tested and corrected at this stage**

* Clear and explicit shipping timelines and costs  
* Clear and visible return and refund policies  
* Removal or clarification of vague or exaggerated claims  
* Consistency across titles, descriptions, specs, and policies  
* Up-to-date pricing, availability, and product details  
* Explicit boundaries (who the product is *not* ideal for)  
* Reduction of contradictory or missing information  
* Comparison against competitors that feel safer or more complete

---

## **Step 8: Trust and Credibility Signals – Making the Product Safe to Recommend**

LLMs are cautious by design. They prefer recommending products that feel legitimate, well-reviewed, and low-risk. In this step, we evaluate trust signals at both the product and brand level.

We check the visibility of reviews and ratings, the presence of verified purchase indicators where available, mentions of reliability and durability, clear shipping and returns policies, brand credentials, and third-party mentions such as press or influencer coverage. We also consider content recency and update signals.

This step exists because even a well-described product may be ignored if the AI perceives risk. Strong trust signals reduce hesitation and increase the likelihood of recommendation.

* Trust signals checked or strengthened  
* Review count and average rating visibility

* Verified purchase indicators (where available)

* Mentions of reliability, durability, safety

* Clear brand credentials

* Third-party mentions (press, influencers, reputable sources)

* Recency of content and updates

---

## **Step 9: Actions and Validation – Turning Insights into Results**

The final step converts everything into clear, prioritized actions. Each action is product-specific, written in plain language, and tied directly to an algorithmic reason.

Examples include adding missing schema, clarifying use cases in the opening paragraph, adding FAQs for high-intent questions, strengthening trust language, or improving completeness of product information. Actions are prioritized based on revenue importance, prompt opportunity, and current AI invisibility.

Once changes are implemented, the same prompts are rerun to validate improvement. This closes the loop and proves whether the optimization worked.

What actions look like

* Product-specific

* Written in plain language

* Directly tied to algorithmic impact

Examples:

* “Add explicit use-case language for winter workouts”

* “Add FAQ answering ‘Is this suitable for beginners?’”

* “Add missing Offer and Review schema”

* “Clarify materials and durability in first paragraph”

Actions are prioritized based on:

* Revenue importance

* Prompt opportunity

* Current AI invisibility

