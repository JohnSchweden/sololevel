#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('packages/ui/src/components/VideoAnalysis/FeedbackPanel/VideoAnalysisInsightsV2.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the quote text - match the exact Unicode curly quotes
old_text = '"Your energy really connects with the audience. Let\'s refine your pacing so your impact is even stronger."'
new_text = '"Look, you\'ve got energy, I\'ll give you that. But your pacing? It\'s like watching a sloth try to deliver a TED Talk. Let\'s fix that disaster before your next presentation."'

# Replace in the text field
content = content.replace(old_text, new_text)

with open('packages/ui/src/components/VideoAnalysis/FeedbackPanel/VideoAnalysisInsightsV2.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete")
